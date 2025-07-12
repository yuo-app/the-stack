use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            log::info!(
                "[single-instance] Second instance launched with args: {:?}, cwd: {}. Forwarding to main instance.",
                argv,
                cwd
            );

            if argv.len() > 1 {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("deep-link", argv[1].clone());
                }
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            log::info!("[setup] Running setup hook.");

            // This is for development only, to register the deep link handler on Windows
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                log::info!("[setup] Registering deep link handler on dev environment.");
                app.deep_link().register_all()?;
            }

            // Handle initial launch with deep link
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("deep-link", args[1].clone());
                }
            }

            // Handle deep links in the main instance
            app.deep_link().on_open_url(move |event| {
                log::info!("[deep-link] on_open_url event received in main instance: {:?}", event.urls());
                // The frontend will handle the URL, we just log it here.
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
