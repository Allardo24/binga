pub mod domain;
pub mod store;

use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier, password_hash::SaltString};
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Path, State},
    http::{HeaderMap, StatusCode, header},
    response::{
        IntoResponse, Response,
        sse::{Event, KeepAlive, Sse},
    },
    routing::{delete, get, post, put},
};
use domain::Game;
use futures_util::StreamExt;
use rand_core::OsRng;
use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    convert::Infallible,
    sync::{Arc, Mutex},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use store::{Account, Store};
use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;
use tower_http::services::{ServeDir, ServeFile};

const SESSION_SECONDS: i64 = 30 * 24 * 60 * 60;

#[derive(Clone)]
pub struct AppState {
    pub store: Arc<Mutex<Store>>,
    attempts: Arc<Mutex<HashMap<String, Vec<Instant>>>>,
    updates: broadcast::Sender<String>,
}

impl AppState {
    pub fn new(store: Store) -> Self {
        let (updates, _) = broadcast::channel(128);
        Self {
            store: Arc::new(Mutex::new(store)),
            attempts: Default::default(),
            updates,
        }
    }
}

struct Error(StatusCode, String);
impl IntoResponse for Error {
    fn into_response(self) -> Response {
        (self.0, Json(json!({"error":self.1}))).into_response()
    }
}
fn invalid(e: String) -> Error {
    Error(StatusCode::BAD_REQUEST, e)
}
fn internal(e: String) -> Error {
    eprintln!("Storage error: {e}");
    Error(
        StatusCode::INTERNAL_SERVER_ERROR,
        "Opslaan is mislukt. Probeer opnieuw.".into(),
    )
}
fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
fn token(headers: &HeaderMap) -> Option<&str> {
    headers
        .get(header::AUTHORIZATION)?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")
        .filter(|v| !v.is_empty())
}
fn hash_token(raw: &str) -> String {
    format!("{:x}", Sha256::digest(raw))
}
fn player_secret(headers: &HeaderMap) -> String {
    headers
        .get("x-player-token")
        .and_then(|v| v.to_str().ok())
        .filter(|v| v.len() >= 32 && v.len() <= 100)
        .map(hash_token)
        .unwrap_or_default()
}
fn optional_account(state: &AppState, headers: &HeaderMap) -> Result<Option<Account>, Error> {
    let Some(raw) = token(headers) else {
        return Ok(None);
    };
    state
        .store
        .lock()
        .unwrap()
        .account_for_session(&hash_token(raw), now())
        .map_err(internal)
}
fn required_account(state: &AppState, headers: &HeaderMap) -> Result<Account, Error> {
    optional_account(state, headers)?
        .ok_or_else(|| Error(StatusCode::UNAUTHORIZED, "Log in om dit te doen.".into()))
}
fn require_owner(game: &Game, account: &Account) -> Result<(), Error> {
    if game.owner_id == account.id {
        Ok(())
    } else {
        Err(Error(
            StatusCode::FORBIDDEN,
            "Alleen de host van dit spel kan dit doen.".into(),
        ))
    }
}
fn view(game: &Game, secret: &str, account: Option<&Account>) -> Value {
    let me = game
        .players
        .iter()
        .find(|p| {
            account.is_some_and(|a| p.account_id.as_deref() == Some(a.id.as_str()))
                || (p.account_id.is_none() && !secret.is_empty() && p.secret == secret)
        })
        .map(|p| json!({"id":p.id,"name":p.name,"card":p.card}));
    json!({
        "id":game.id,"title":game.title,"description":game.description,"status":game.status,
        "items":game.items,"calls":game.calls,"rules":game.rules,"revision":game.revision,
        "players":game.players.len(),"me":me,"standings":game.standings(),
        "account":account.map(|a| json!({"id":a.id,"username":a.username})),
        "is_host":account.is_some_and(|a| game.owner_id == a.id)
    })
}

pub fn app(state: AppState, web: &str) -> Router {
    Router::new()
        .route("/api/health", get(|| async { Json(json!({"ok":true,"version":env!("CARGO_PKG_VERSION")})) }))
        .route("/api/auth/register", post(register))
        .route("/api/auth/login", post(login))
        .route("/api/auth/logout", post(logout))
        .route("/api/auth/me", get(me))
        .route("/api/account", get(account_dashboard))
        .route("/api/account/history/{id}", delete(hide_account_history))
        .route("/api/host/games", get(list_games).post(create_game))
        .route("/api/host/games/{id}/status", put(set_status))
        .route("/api/host/games/{id}/calls/{item}", put(set_call))
        .route("/api/games/{id}", get(get_game))
        .route("/api/games/{id}/card", put(save_card))
        .route("/api/games/{id}/events", get(events))
        .route("/api/{*rest}", get(|| async { (StatusCode::NOT_FOUND, Json(json!({"error":"Onbekende API-route."}))) }))
        .fallback_service(ServeDir::new(web).not_found_service(ServeFile::new(format!("{web}/index.html"))))
        .layer(DefaultBodyLimit::max(32 * 1024))
        .layer(axum::middleware::from_fn(|req: axum::extract::Request, next: axum::middleware::Next| async move {
            let api = req.uri().path().starts_with("/api/");
            let mut response = next.run(req).await;
            let headers = response.headers_mut();
            headers.insert("x-content-type-options", "nosniff".parse().unwrap());
            headers.insert("referrer-policy", "same-origin".parse().unwrap());
            headers.insert("x-frame-options", "DENY".parse().unwrap());
            headers.insert("content-security-policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; script-src 'self'; frame-ancestors 'none'".parse().unwrap());
            if api { headers.insert(header::CACHE_CONTROL, "no-store".parse().unwrap()); }
            response
        }))
        .with_state(state)
}

#[derive(Deserialize)]
struct Credentials {
    username: String,
    password: String,
}

fn validate_credentials(input: &Credentials) -> Result<(String, String), Error> {
    let username = input.username.trim();
    if !(3..=24).contains(&username.chars().count())
        || !username
            .chars()
            .all(|c| c.is_alphanumeric() || "_- .".contains(c))
    {
        return Err(invalid("Gebruik 3 tot 24 letters, cijfers, spaties, punten, streepjes of underscores voor je gebruikersnaam.".into()));
    }
    if !(10..=128).contains(&input.password.chars().count()) {
        return Err(invalid(
            "Gebruik een wachtwoord van 10 tot 128 tekens.".into(),
        ));
    }
    Ok((username.into(), username.to_lowercase()))
}
fn rate_limit(state: &AppState, username_key: &str) -> Result<(), Error> {
    let mut attempts = state.attempts.lock().unwrap();
    attempts.retain(|_, times| {
        times.retain(|t| t.elapsed() < Duration::from_secs(60));
        !times.is_empty()
    });
    let times = attempts.entry(username_key.into()).or_default();
    if times.len() >= 10 {
        return Err(Error(
            StatusCode::TOO_MANY_REQUESTS,
            "Te veel pogingen. Wacht een minuut.".into(),
        ));
    }
    times.push(Instant::now());
    Ok(())
}
fn new_session(state: &AppState, account: &Account) -> Result<Json<Value>, Error> {
    let raw = format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    );
    state
        .store
        .lock()
        .unwrap()
        .create_session(&hash_token(&raw), &account.id, now() + SESSION_SECONDS)
        .map_err(internal)?;
    Ok(Json(json!({"token":raw,"account":account})))
}
async fn register(
    State(state): State<AppState>,
    Json(input): Json<Credentials>,
) -> Result<Json<Value>, Error> {
    let (username, key) = validate_credentials(&input)?;
    rate_limit(&state, &key)?;
    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(input.password.as_bytes(), &salt)
        .map_err(|_| internal("Wachtwoord kon niet worden verwerkt.".into()))?
        .to_string();
    let account = state
        .store
        .lock()
        .unwrap()
        .create_account(&username, &key, &password_hash, now())
        .map_err(invalid)?;
    new_session(&state, &account)
}
async fn login(
    State(state): State<AppState>,
    Json(input): Json<Credentials>,
) -> Result<Json<Value>, Error> {
    let key = input.username.trim().to_lowercase();
    rate_limit(&state, &key)?;
    let account = state
        .store
        .lock()
        .unwrap()
        .account_by_username(&key)
        .map_err(internal)?;
    let valid = account.as_ref().is_some_and(|account| {
        PasswordHash::new(&account.password_hash)
            .ok()
            .is_some_and(|hash| {
                Argon2::default()
                    .verify_password(input.password.as_bytes(), &hash)
                    .is_ok()
            })
    });
    if !valid {
        return Err(Error(
            StatusCode::UNAUTHORIZED,
            "Gebruikersnaam of wachtwoord klopt niet.".into(),
        ));
    }
    new_session(&state, &account.unwrap())
}
async fn logout(State(state): State<AppState>, headers: HeaderMap) -> Result<Json<Value>, Error> {
    if let Some(raw) = token(&headers) {
        state
            .store
            .lock()
            .unwrap()
            .delete_session(&hash_token(raw))
            .map_err(internal)?;
    }
    Ok(Json(json!({"ok":true})))
}
async fn me(State(state): State<AppState>, headers: HeaderMap) -> Result<Json<Value>, Error> {
    let account = required_account(&state, &headers)?;
    Ok(Json(json!({"account":account})))
}

async fn list_games(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Value>, Error> {
    let account = required_account(&state, &headers)?;
    let games = state.store.lock().unwrap().list().map_err(internal)?;
    Ok(Json(json!(
        games
            .iter()
            .filter(|g| g.owner_id == account.id)
            .map(|g| json!({
                "id":g.id,"title":g.title,"status":g.status,"players":g.players.len()
            }))
            .collect::<Vec<_>>()
    )))
}

#[derive(Deserialize)]
struct NewGame {
    title: String,
    #[serde(default)]
    description: String,
    words: Vec<String>,
}
async fn create_game(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<NewGame>,
) -> Result<Json<Value>, Error> {
    let account = required_account(&state, &headers)?;
    let mut game =
        Game::new(&account.id, &input.title, &input.description, input.words).map_err(invalid)?;
    state
        .store
        .lock()
        .unwrap()
        .save(&mut game)
        .map_err(internal)?;
    Ok(Json(view(&game, "", Some(&account))))
}
async fn get_game(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Value>, Error> {
    let account = optional_account(&state, &headers)?;
    let game = state
        .store
        .lock()
        .unwrap()
        .get(&id)
        .map_err(|e| Error(StatusCode::NOT_FOUND, e))?;
    Ok(Json(view(
        &game,
        &player_secret(&headers),
        account.as_ref(),
    )))
}

#[derive(Deserialize)]
struct Card {
    name: String,
    card: Vec<String>,
}
async fn save_card(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(input): Json<Card>,
) -> Result<Json<Value>, Error> {
    let account = optional_account(&state, &headers)?;
    let provided = headers
        .get("x-player-token")
        .and_then(|v| v.to_str().ok())
        .filter(|v| v.len() >= 32 && v.len() <= 100);
    let raw = provided
        .map(String::from)
        .unwrap_or_else(|| uuid::Uuid::new_v4().simple().to_string());
    let secret = hash_token(&raw);
    let mut db = state.store.lock().unwrap();
    let mut game = db.get(&id).map_err(invalid)?;
    game.save_player(
        &input.name,
        input.card,
        &secret,
        account.as_ref().map(|a| a.id.as_str()),
    )
    .map_err(invalid)?;
    db.save(&mut game).map_err(internal)?;
    let _ = state.updates.send(id);
    Ok(Json(json!({
        "token": if account.is_some() { "" } else { &raw },
        "game": view(&game, &secret, account.as_ref())
    })))
}

#[derive(Deserialize)]
struct Status {
    status: String,
}
async fn set_status(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(input): Json<Status>,
) -> Result<Json<Value>, Error> {
    let account = required_account(&state, &headers)?;
    let mut db = state.store.lock().unwrap();
    let mut game = db.get(&id).map_err(invalid)?;
    require_owner(&game, &account)?;
    game.transition(&input.status).map_err(invalid)?;
    db.save(&mut game).map_err(internal)?;
    let _ = state.updates.send(id);
    Ok(Json(view(&game, "", Some(&account))))
}

#[derive(Deserialize)]
struct Call {
    active: bool,
}
async fn set_call(
    State(state): State<AppState>,
    Path((id, item)): Path<(String, String)>,
    headers: HeaderMap,
    Json(input): Json<Call>,
) -> Result<Json<Value>, Error> {
    let account = required_account(&state, &headers)?;
    let mut db = state.store.lock().unwrap();
    let mut game = db.get(&id).map_err(invalid)?;
    require_owner(&game, &account)?;
    game.set_call(&item, input.active).map_err(invalid)?;
    db.save(&mut game).map_err(internal)?;
    let _ = state.updates.send(id);
    Ok(Json(view(&game, "", Some(&account))))
}

async fn account_dashboard(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Value>, Error> {
    let account = required_account(&state, &headers)?;
    let db = state.store.lock().unwrap();
    let games = db.list().map_err(internal)?;
    let accounts = db.list_accounts().map_err(internal)?;
    let hidden: HashSet<String> = db
        .hidden_history(&account.id)
        .map_err(internal)?
        .into_iter()
        .collect();
    drop(db);
    let mut totals: HashMap<String, (u32, usize)> =
        accounts.iter().map(|a| (a.id.clone(), (0, 0))).collect();
    for game in games.iter().filter(|g| g.status == "finished") {
        let standings = game.standings();
        for player in &game.players {
            if let Some(account_id) = &player.account_id
                && let Some((score, played)) = totals.get_mut(account_id)
            {
                *score += standings
                    .iter()
                    .find(|s| s.id == player.id)
                    .map(|s| s.score)
                    .unwrap_or(0);
                *played += 1;
            }
        }
    }
    let mut board: Vec<_> = accounts
        .iter()
        .map(|a| {
            let (score, played) = totals.get(&a.id).copied().unwrap_or_default();
            (a, score, played)
        })
        .collect();
    board.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.username.cmp(&b.0.username)));
    let mut leaderboard: Vec<Value> = Vec::new();
    let mut own_rank = 1usize;
    for index in 0..board.len() {
        let rank = if index > 0 && board[index].1 == board[index - 1].1 {
            leaderboard[index - 1]["rank"].as_u64().unwrap() as usize
        } else {
            index + 1
        };
        if board[index].0.id == account.id {
            own_rank = rank;
        }
        leaderboard.push(json!({"username":board[index].0.username,"total_score":board[index].1,"games_played":board[index].2,"rank":rank}));
    }
    let mut history = Vec::new();
    for game in &games {
        if hidden.contains(&game.id) {
            continue;
        }
        if let Some(player) = game
            .players
            .iter()
            .find(|p| p.account_id.as_deref() == Some(account.id.as_str()))
        {
            let standing = game.standings().into_iter().find(|s| s.id == player.id);
            history.push(json!({"id":game.id,"title":game.title,"status":game.status,"score":standing.as_ref().map(|s|s.score).unwrap_or(0),"rank":standing.as_ref().map(|s|s.rank),"played_as":player.name}));
        }
    }
    let (total_score, games_played) = totals.get(&account.id).copied().unwrap_or_default();
    Ok(Json(json!({
        "account":account,"total_score":total_score,"rank":own_rank,"games_played":games_played,
        "games_hosted":games.iter().filter(|g|g.owner_id == account.id).count(),"total_accounts":accounts.len(),"history":history,
        "leaderboard":leaderboard.into_iter().take(50).collect::<Vec<_>>()
    })))
}

async fn hide_account_history(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Value>, Error> {
    let account = required_account(&state, &headers)?;
    let mut db = state.store.lock().unwrap();
    let game = db.get(&id).map_err(|e| Error(StatusCode::NOT_FOUND, e))?;
    if game.status != "finished" {
        return Err(invalid(
            "Alleen afgeronde potjes kun je uit je dashboard halen.".into(),
        ));
    }
    if !game
        .players
        .iter()
        .any(|player| player.account_id.as_deref() == Some(account.id.as_str()))
    {
        return Err(Error(
            StatusCode::NOT_FOUND,
            "Dit potje staat niet in jouw geschiedenis.".into(),
        ));
    }
    db.hide_history(&account.id, &id).map_err(internal)?;
    Ok(Json(json!({"ok":true})))
}

async fn events(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, Error> {
    let receiver = state.updates.subscribe();
    state
        .store
        .lock()
        .unwrap()
        .get(&id)
        .map_err(|e| Error(StatusCode::NOT_FOUND, e))?;
    let initial = futures_util::stream::once(async {
        Ok::<_, Infallible>(Event::default().event("update").data("refresh"))
    });
    let stream = BroadcastStream::new(receiver).filter_map(move |msg| {
        let relevant = match msg {
            Ok(changed) => changed == id,
            Err(_) => true,
        };
        async move {
            relevant.then(|| Ok::<_, Infallible>(Event::default().event("update").data("refresh")))
        }
    });
    Ok((
        [("x-accel-buffering", "no")],
        Sse::new(initial.chain(stream))
            .keep_alive(KeepAlive::new().interval(Duration::from_secs(15))),
    ))
}
