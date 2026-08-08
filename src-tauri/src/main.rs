// Masque la console Windows en release : l'app doit se lancer par double-clic
// sans qu'un terminal noir n'apparaisse derrière la fenêtre. En dev, on garde
// la console pour voir les logs/erreurs Rust.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    myplanning_lib::run()
}
