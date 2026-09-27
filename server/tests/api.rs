use axum::{
    Router,
    body::Body,
    http::{Request, StatusCode},
};
use binga_server::{AppState, app, store::Store};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use tower::ServiceExt;

async fn request(
    app: &Router,
    method: &str,
    path: &str,
    body: Value,
    auth: Option<(&str, &str)>,
) -> (StatusCode, Value) {
    let mut builder = Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json");
    if let Some((name, value)) = auth {
        builder = builder.header(name, value);
    }
    let response = app
        .clone()
        .oneshot(builder.body(Body::from(body.to_string())).unwrap())
        .await
        .unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (status, serde_json::from_slice(&bytes).unwrap())
}

async fn register(app: &Router, username: &str) -> String {
    let (status, result) = request(
        app,
        "POST",
        "/api/auth/register",
        json!({"username":username,"password":"veilig-wachtwoord"}),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    format!("Bearer {}", result["token"].as_str().unwrap())
}

#[tokio::test]
async fn accounts_ownership_guests_history_and_logout() {
    let dir = tempfile::tempdir().unwrap();
    let app = app(
        AppState::new(Store::open(&dir.path().join("db.sqlite")).unwrap()),
        "missing",
    );
    assert_eq!(
        request(&app, "GET", "/api/host/games", json!(null), None)
            .await
            .0,
        StatusCode::UNAUTHORIZED
    );

    let alice_bearer = register(&app, "Alice").await;
    let alice = Some(("authorization", alice_bearer.as_str()));
    assert_eq!(
        request(
            &app,
            "POST",
            "/api/auth/register",
            json!({"username":"alice","password":"ander-wachtwoord"}),
            None
        )
        .await
        .0,
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        request(
            &app,
            "POST",
            "/api/auth/login",
            json!({"username":"Alice","password":"verkeerd-wachtwoord"}),
            None
        )
        .await
        .0,
        StatusCode::UNAUTHORIZED
    );
    let bob_bearer = register(&app, "Bob").await;
    let bob = Some(("authorization", bob_bearer.as_str()));

    let words: Vec<_> = (0..24).map(|i| format!("Woord {i}")).collect();
    let (status, game) = request(
        &app,
        "POST",
        "/api/host/games",
        json!({"title":"Test","words":words}),
        alice,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(game["is_host"], true);
    let id = game["id"].as_str().unwrap();
    let card: Vec<_> = game["items"].as_array().unwrap()[..16]
        .iter()
        .map(|i| i["id"].clone())
        .collect();

    assert_eq!(
        request(
            &app,
            "PUT",
            &format!("/api/host/games/{id}/status"),
            json!({"status":"live"}),
            bob
        )
        .await
        .0,
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        request(
            &app,
            "PUT",
            &format!("/api/games/{id}/card"),
            json!({"name":"Bad","card":vec![card[0].clone();16]}),
            None
        )
        .await
        .0,
        StatusCode::BAD_REQUEST
    );

    let mut first_guest_token = String::new();
    for index in 0..20 {
        let (status, player) = request(
            &app,
            "PUT",
            &format!("/api/games/{id}/card"),
            json!({"name":format!("Gast {index}"),"card":card}),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        if index == 0 {
            first_guest_token = player["token"].as_str().unwrap().into();
        }
    }
    let (status, bob_card) = request(
        &app,
        "PUT",
        &format!("/api/games/{id}/card"),
        json!({"name":"Bobby","card":card}),
        bob,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(bob_card["game"]["players"], 21);
    assert_eq!(bob_card["token"], "");

    let (_, public) = request(&app, "GET", &format!("/api/games/{id}"), json!(null), None).await;
    assert!(public["me"].is_null());
    assert!(!public.to_string().contains(&first_guest_token));
    let (_, guest) = request(
        &app,
        "GET",
        &format!("/api/games/{id}"),
        json!(null),
        Some(("x-player-token", first_guest_token.as_str())),
    )
    .await;
    assert_eq!(guest["me"]["card"], json!(card));
    let (_, restored) = request(&app, "GET", &format!("/api/games/{id}"), json!(null), bob).await;
    assert_eq!(restored["me"]["name"], "Bobby");

    assert_eq!(
        request(
            &app,
            "PUT",
            &format!("/api/host/games/{id}/status"),
            json!({"status":"live"}),
            alice
        )
        .await
        .0,
        StatusCode::OK
    );
    for item in &card {
        assert_eq!(
            request(
                &app,
                "PUT",
                &format!("/api/host/games/{id}/calls/{}", item.as_str().unwrap()),
                json!({"active":true}),
                alice
            )
            .await
            .0,
            StatusCode::OK
        );
    }
    assert_eq!(
        request(
            &app,
            "PUT",
            &format!("/api/host/games/{id}/status"),
            json!({"status":"finished"}),
            alice
        )
        .await
        .0,
        StatusCode::OK
    );

    let (status, dashboard) = request(&app, "GET", "/api/account", json!(null), bob).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(dashboard["games_played"], 1);
    assert!(dashboard["total_score"].as_u64().unwrap() > 0);
    assert_eq!(dashboard["history"][0]["played_as"], "Bobby");
    let (_, host_dashboard) = request(&app, "GET", "/api/account", json!(null), alice).await;
    assert_eq!(host_dashboard["games_hosted"], 1);

    request(&app, "POST", "/api/auth/logout", json!(null), bob).await;
    assert_eq!(
        request(&app, "GET", "/api/account", json!(null), bob)
            .await
            .0,
        StatusCode::UNAUTHORIZED
    );
    let (status, login) = request(
        &app,
        "POST",
        "/api/auth/login",
        json!({"username":"Bob","password":"veilig-wachtwoord"}),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(login["account"]["username"], "Bob");
}
