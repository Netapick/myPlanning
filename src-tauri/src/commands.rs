//! Les deux commandes exposées au frontend — équivalent desktop des routes
//! `GET`/`PUT /api/data` du serveur HTTP (`server/api.mjs`). Mêmes formes de
//! réponse (`{ document, file, savedAt }` / `{ file, savedAt }`) pour que
//! `src/lib/api.tauri.ts` n'ait rien à adapter côté types React.

use serde::Serialize;
use serde_json::Value;
use std::path::Path;
use tauri::AppHandle;

use crate::store;

#[derive(Serialize)]
pub struct LoadResult {
    document: Value,
    file: String,
    #[serde(rename = "savedAt")]
    saved_at: Option<String>,
}

#[derive(Serialize)]
pub struct SaveResult {
    file: String,
    #[serde(rename = "savedAt")]
    saved_at: Option<String>,
}

#[tauri::command]
pub fn load_document(app: AppHandle) -> Result<LoadResult, String> {
    let document = store::read_document(&app)?;
    let saved_at = store::last_saved_at(&app);
    Ok(LoadResult {
        document,
        file: store::data_file_label(),
        saved_at,
    })
}

#[tauri::command]
pub fn save_document(app: AppHandle, document: Value) -> Result<SaveResult, String> {
    store::write_document(&app, &document)?;
    let saved_at = store::last_saved_at(&app);
    Ok(SaveResult {
        file: store::data_file_label(),
        saved_at,
    })
}

/// Équivalent de `POST /api/reset` : remplace le document par le jeu
/// d'exemple (dates résolues) — Paramètres > Données > Réinitialiser.
#[tauri::command]
pub fn reset_document(app: AppHandle) -> Result<LoadResult, String> {
    let document = store::load_example_document()?;
    store::write_document(&app, &document)?;
    let saved_at = store::last_saved_at(&app);
    Ok(LoadResult {
        document,
        file: store::data_file_label(),
        saved_at,
    })
}

/// Sauvegarde manuelle (Paramètres > Données > Exporter en JSON) : `path`
/// vient de la boîte de dialogue « Enregistrer sous » ouverte côté JS, donc
/// déjà connu de l'appelant — pas besoin de le renvoyer.
#[tauri::command]
pub fn export_document(document: Value, path: String) -> Result<(), String> {
    store::export_document(&document, Path::new(&path))
}

/// Enregistre un texte brut (export CSV du planning) à l'emplacement choisi
/// dans la boîte de dialogue « Enregistrer sous » — un téléchargement par lien
/// ne fait rien dans la fenêtre Tauri.
#[tauri::command]
pub fn export_text(content: String, path: String) -> Result<(), String> {
    store::export_text(&content, Path::new(&path))
}
