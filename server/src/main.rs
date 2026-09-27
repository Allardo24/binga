use binga_server::{AppState, app, store::Store};
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let data = std::env::var("BINGA_DATA_DIR").unwrap_or_else(|_| "server-data".into());
    let state = AppState::new(Store::open(
        &std::path::Path::new(&data).join("binga.sqlite"),
    )?);
    let bind = std::env::var("BINGA_BIND").unwrap_or_else(|_| "127.0.0.1:8080".into());
    let web = std::env::var("BINGA_WEB_DIR").unwrap_or_else(|_| "dist".into());
    let listener = tokio::net::TcpListener::bind(&bind).await?;
    println!("Binga luistert op http://{bind}");
    axum::serve(listener, app(state, &web))
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await?;
    Ok(())
}
