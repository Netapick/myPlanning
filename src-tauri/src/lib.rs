mod commands;
mod store;

/// Point d'entrée de la lib Tauri — appelé par `main.rs`. Séparé de `main.rs`
/// selon la convention Tauri 2 : ça permet à `tauri dev` de recharger la
/// logique applicative sans reconstruire l'exécutable en entier.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::load_document,
            commands::save_document,
            commands::reset_document,
            commands::export_document,
        ])
        .run(tauri::generate_context!())
        .expect("erreur au lancement de myPlanning");
}
