//! Accès au fichier de données. C'est le seul endroit de l'application qui
//! touche au disque en mode desktop — équivalent Rust de `server/store.mjs`,
//! avec le même contrat : jamais de fichier tronqué ou à moitié écrit (écriture
//! atomique via fichier temporaire + `rename`), et une copie de sauvegarde
//! faite avant chaque écrasement.
//!
//! Contrairement au mode web, `planning.json` ne vit pas dans le dossier du
//! projet mais dans le dossier de données de l'application
//! (`%APPDATA%\com.myplanning.app\` sur Windows) — voir `data_dir()` — pour
//! rester accessible en écriture même si l'app est installée dans
//! `Program Files`.

use chrono::{Datelike, Duration, Local, NaiveDate};
use serde_json::Value;
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

/// Jeu de démarrage, embarqué dans le binaire — la même source que
/// `data/planning.example.json`, copiée dans `resources/` au moment du build
/// (voir `src-tauri/resources/planning.example.json`).
const EXAMPLE_JSON: &str = include_str!("../resources/planning.example.json");

/// Sérialise les écritures : le client envoie un document complet à chaque
/// sauvegarde, deux appels concurrents pourraient sinon s'entrelacer entre la
/// copie de sauvegarde et le renommage. Un `Mutex` suffit ici (pas de vraie
/// section critique longue), contrairement à la chaîne de promesses côté JS.
static WRITE_LOCK: Mutex<()> = Mutex::new(());

fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|error| format!("Dossier de données introuvable : {error}"))
}

fn data_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join("planning.json"))
}

fn backup_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join("planning.backup.json"))
}

fn temp_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join("planning.json.tmp"))
}

/// Chemin affiché dans Paramètres > Données. Le dossier `%APPDATA%\...`
/// complet est verbeux et sans intérêt pour l'utilisateur ; `planning.json`
/// suffit à identifier le fichier, le reste (emplacement, date) est déjà
/// donné par ailleurs dans cet onglet.
pub fn data_file_label() -> String {
    "planning.json".to_string()
}

/// Validation de forme, pas de contenu — même règles que `validateDocument`
/// côté JS : on refuse ce qui casserait l'app au chargement suivant.
pub fn validate_document(doc: &Value) -> Result<(), String> {
    let obj = doc
        .as_object()
        .ok_or_else(|| "Le document doit être un objet JSON.".to_string())?;

    match obj.get("version") {
        Some(Value::Number(n)) if n.as_i64() == Some(1) => {}
        other => {
            return Err(format!(
                "Version de document inattendue : {}.",
                other.map(|v| v.to_string()).unwrap_or_else(|| "null".into())
            ))
        }
    }

    for key in ["employees", "teams", "shiftTemplates", "shifts", "events"] {
        match obj.get(key) {
            Some(Value::Array(_)) => {}
            _ => return Err(format!("Le champ « {key} » doit être un tableau.")),
        }
    }

    match obj.get("settings") {
        Some(Value::Object(_)) => Ok(()),
        _ => Err("Le champ « settings » doit être un objet.".to_string()),
    }
}

/// Résout les jetons de date relative du jeu de démarrage — même règles que
/// `resolveSeedDates` côté JS :
///   "D0".."D6"  → lundi de la semaine courante + N jours
///   "+15d"      → aujourd'hui + 15 jours (accepte le négatif : "+-180d")
/// Une fois `planning.json` écrit, ces jetons ont disparu : le fichier de
/// travail ne contient que des dates ISO ordinaires.
fn resolve_seed_dates(value: Value) -> Value {
    match value {
        Value::Array(items) => Value::Array(items.into_iter().map(resolve_seed_dates).collect()),
        Value::Object(map) => Value::Object(
            map.into_iter()
                .map(|(key, item)| (key, resolve_seed_dates(item)))
                .collect(),
        ),
        Value::String(text) => Value::String(resolve_date_token(&text)),
        other => other,
    }
}

fn resolve_date_token(token: &str) -> String {
    let today = Local::now().date_naive();

    if let Some(rest) = token.strip_prefix('D') {
        if rest.len() == 1 {
            if let Ok(offset) = rest.parse::<i64>() {
                if (0..=6).contains(&offset) {
                    // ISO weekday() : Mon = 1 .. Sun = 7. On ramène au lundi
                    // de la semaine en cours, comme `(getDay() + 6) % 7` en JS.
                    let monday = today - Duration::days(today.weekday().num_days_from_monday() as i64);
                    return format_iso(monday + Duration::days(offset));
                }
            }
        }
    }

    if let Some(rest) = token.strip_prefix('+') {
        if let Some(digits) = rest.strip_suffix('d') {
            if let Ok(offset) = digits.parse::<i64>() {
                return format_iso(today + Duration::days(offset));
            }
        }
    }

    token.to_string()
}

fn format_iso(date: NaiveDate) -> String {
    date.format("%Y-%m-%d").to_string()
}

/// Recharge le jeu d'exemple (dates résolues) — utilisé par
/// Paramètres > Données > Réinitialiser.
pub fn load_example_document() -> Result<Value, String> {
    let parsed: Value = serde_json::from_str(EXAMPLE_JSON)
        .map_err(|error| format!("Jeu d'exemple invalide : {error}"))?;
    Ok(resolve_seed_dates(parsed))
}

/// Lit le document. Au tout premier lancement `planning.json` n'existe pas :
/// on le crée à partir de l'exemple embarqué, pour que l'app s'ouvre sur des
/// données vivantes plutôt que sur quatre écrans vides.
pub fn read_document(app: &AppHandle) -> Result<Value, String> {
    let path = data_file(app)?;
    match fs::read_to_string(&path) {
        Ok(raw) => serde_json::from_str(&raw)
            .map_err(|error| format!("Lecture de {} impossible : {error}", data_file_label())),
        Err(error) if error.kind() == ErrorKind::NotFound => {
            let seed = load_example_document()?;
            write_document(app, &seed)?;
            Ok(seed)
        }
        Err(error) => Err(format!(
            "Lecture de {} impossible : {error}",
            data_file_label()
        )),
    }
}

/// Écrit le document (atomiquement) après avoir mis l'ancien de côté.
pub fn write_document(app: &AppHandle, doc: &Value) -> Result<(), String> {
    validate_document(doc)?;

    let _guard = WRITE_LOCK.lock().map_err(|_| "Verrou d'écriture corrompu.".to_string())?;

    let dir = data_dir(app)?;
    fs::create_dir_all(&dir).map_err(|error| format!("Création du dossier de données impossible : {error}"))?;

    let target = data_file(app)?;
    let backup = backup_file(app)?;
    match fs::copy(&target, &backup) {
        Ok(_) => {}
        // Pas de fichier à sauvegarder au premier lancement : rien d'anormal.
        Err(error) if error.kind() == ErrorKind::NotFound => {}
        Err(error) => return Err(format!("Sauvegarde impossible : {error}")),
    }

    let temp = temp_file(app)?;
    // Indenté à 2 espaces : le fichier doit rester lisible et éditable à la
    // main, c'est une partie de l'intérêt de tout garder dans un JSON.
    let pretty = serde_json::to_string_pretty(doc)
        .map_err(|error| format!("Sérialisation impossible : {error}"))?;
    fs::write(&temp, format!("{pretty}\n")).map_err(|error| format!("Écriture impossible : {error}"))?;
    fs::rename(&temp, &target).map_err(|error| format!("Finalisation impossible : {error}"))?;

    Ok(())
}

/// Date de dernière écriture du fichier, pour l'indicateur de sauvegarde —
/// même rôle que `lastSavedAt` côté JS.
pub fn last_saved_at(app: &AppHandle) -> Option<String> {
    let path: &Path = &data_file(app).ok()?;
    let modified = fs::metadata(path).ok()?.modified().ok()?;
    let datetime: chrono::DateTime<chrono::Utc> = modified.into();
    Some(datetime.to_rfc3339())
}
