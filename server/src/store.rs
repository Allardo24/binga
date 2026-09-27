use crate::domain::Game;
use rusqlite::{Connection, OptionalExtension, params};
use serde::Serialize;
use std::path::Path;

#[derive(Clone, Serialize)]
pub struct Account {
    pub id: String,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub created_at: i64,
}

pub struct Store {
    db: Connection,
}

impl Store {
    pub fn open(path: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let db = Connection::open(path)?;
        db.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA synchronous=FULL;
             PRAGMA foreign_keys=ON;
             CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, data TEXT NOT NULL);
             CREATE TABLE IF NOT EXISTS accounts (
                 id TEXT PRIMARY KEY,
                 username_key TEXT UNIQUE NOT NULL,
                 username TEXT NOT NULL,
                 password_hash TEXT NOT NULL,
                 created_at INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS sessions (
                 token_hash TEXT PRIMARY KEY,
                 account_id TEXT NOT NULL,
                 expires_at INTEGER NOT NULL,
                 FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
             );
             CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);",
        )?;
        Ok(Self { db })
    }

    pub fn list(&self) -> Result<Vec<Game>, String> {
        let mut stmt = self
            .db
            .prepare("SELECT data FROM games ORDER BY rowid DESC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |r| r.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        rows.map(|r| {
            serde_json::from_str(&r.map_err(|e| e.to_string())?).map_err(|e| e.to_string())
        })
        .collect()
    }

    pub fn get(&self, id: &str) -> Result<Game, String> {
        let data: String = self
            .db
            .query_row("SELECT data FROM games WHERE id=?1", [id], |r| r.get(0))
            .map_err(|_| "Spel niet gevonden.".to_string())?;
        serde_json::from_str(&data).map_err(|e| e.to_string())
    }

    pub fn save(&mut self, game: &mut Game) -> Result<(), String> {
        game.revision += 1;
        let data = serde_json::to_string(game).map_err(|e| e.to_string())?;
        self.db.execute("INSERT INTO games(id,data) VALUES(?1,?2) ON CONFLICT(id) DO UPDATE SET data=excluded.data", params![game.id,data]).map_err(|e|e.to_string())?;
        Ok(())
    }

    pub fn create_account(
        &mut self,
        username: &str,
        username_key: &str,
        password_hash: &str,
        created_at: i64,
    ) -> Result<Account, String> {
        let account = Account {
            id: uuid::Uuid::new_v4().to_string(),
            username: username.into(),
            password_hash: password_hash.into(),
            created_at,
        };
        self.db.execute(
            "INSERT INTO accounts(id,username_key,username,password_hash,created_at) VALUES(?1,?2,?3,?4,?5)",
            params![account.id, username_key, account.username, account.password_hash, account.created_at],
        ).map_err(|e| if e.to_string().contains("UNIQUE") { "Deze gebruikersnaam is al in gebruik.".into() } else { e.to_string() })?;
        Ok(account)
    }

    pub fn account_by_username(&self, username_key: &str) -> Result<Option<Account>, String> {
        self.db
            .query_row(
                "SELECT id,username,password_hash,created_at FROM accounts WHERE username_key=?1",
                [username_key],
                |r| {
                    Ok(Account {
                        id: r.get(0)?,
                        username: r.get(1)?,
                        password_hash: r.get(2)?,
                        created_at: r.get(3)?,
                    })
                },
            )
            .optional()
            .map_err(|e| e.to_string())
    }

    pub fn list_accounts(&self) -> Result<Vec<Account>, String> {
        let mut stmt = self
            .db
            .prepare("SELECT id,username,password_hash,created_at FROM accounts")
            .map_err(|e| e.to_string())?;
        stmt.query_map([], |r| {
            Ok(Account {
                id: r.get(0)?,
                username: r.get(1)?,
                password_hash: r.get(2)?,
                created_at: r.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .map(|row| row.map_err(|e| e.to_string()))
        .collect()
    }

    pub fn create_session(
        &mut self,
        token_hash: &str,
        account_id: &str,
        expires_at: i64,
    ) -> Result<(), String> {
        self.db
            .execute(
                "INSERT INTO sessions(token_hash,account_id,expires_at) VALUES(?1,?2,?3)",
                params![token_hash, account_id, expires_at],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn account_for_session(
        &mut self,
        token_hash: &str,
        now: i64,
    ) -> Result<Option<Account>, String> {
        self.db
            .execute("DELETE FROM sessions WHERE expires_at<=?1", [now])
            .map_err(|e| e.to_string())?;
        self.db.query_row(
            "SELECT a.id,a.username,a.password_hash,a.created_at FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=?1 AND s.expires_at>?2",
            params![token_hash,now], |r| Ok(Account { id:r.get(0)?, username:r.get(1)?, password_hash:r.get(2)?, created_at:r.get(3)? }),
        ).optional().map_err(|e|e.to_string())
    }

    pub fn delete_session(&mut self, token_hash: &str) -> Result<(), String> {
        self.db
            .execute("DELETE FROM sessions WHERE token_hash=?1", [token_hash])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn restart_preserves_games_accounts_and_sessions() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("binga.db");
        let mut g = Game::new(
            "owner",
            "Test",
            "",
            (0..20).map(|n| n.to_string()).collect(),
        )
        .unwrap();
        g.save_player(
            "Speler",
            g.items[..16].iter().map(|i| i.id.clone()).collect(),
            "secret",
            Some("account"),
        )
        .unwrap();
        g.transition("live").unwrap();
        g.set_call(&g.items[0].id.clone(), true).unwrap();
        {
            let mut db = Store::open(&path).unwrap();
            let account = db.create_account("Allard", "allard", "hash", 1).unwrap();
            db.create_session("token", &account.id, 999).unwrap();
            db.save(&mut g).unwrap();
        }
        let mut db = Store::open(&path).unwrap();
        let saved = db.get(&g.id).unwrap();
        assert_eq!(saved.calls, g.calls);
        assert_eq!(saved.players[0].account_id.as_deref(), Some("account"));
        assert_eq!(
            db.account_by_username("allard").unwrap().unwrap().username,
            "Allard"
        );
        assert!(db.account_for_session("token", 2).unwrap().is_some());
        assert!(db.account_for_session("token", 1000).unwrap().is_none());
    }
}
