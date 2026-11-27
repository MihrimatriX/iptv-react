/// Desktop shell around the same Vite app the TVs run. The HTTP plugin gives
/// the page a fetch() that runs in Rust, so Xtream panels and CDNs without
/// CORS headers work; the frontend swaps window.fetch for it at startup.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .run(tauri::generate_context!())
        .expect("error while running AFU IPTV");
}
