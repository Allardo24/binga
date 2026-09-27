use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub text: String,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Player {
    pub id: String,
    pub secret: String,
    #[serde(default)]
    pub account_id: Option<String>,
    pub name: String,
    pub card: Vec<String>,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Rules {
    pub line_base: u32,
    pub line_bonus: u32,
    pub full_base: u32,
    pub full_bonus: u32,
}
impl Default for Rules {
    fn default() -> Self {
        Self {
            line_base: 100,
            line_bonus: 100,
            full_base: 300,
            full_bonus: 200,
        }
    }
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Game {
    pub id: String,
    #[serde(default)]
    pub owner_id: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub items: Vec<Item>,
    pub players: Vec<Player>,
    pub calls: Vec<String>,
    pub rules: Rules,
    pub revision: u64,
}
#[derive(Clone, Serialize)]
pub struct Award {
    pub kind: String,
    pub points: u32,
    pub step: usize,
}
#[derive(Clone, Serialize)]
pub struct Standing {
    pub id: String,
    pub name: String,
    pub score: u32,
    pub rank: usize,
    pub awards: Vec<Award>,
}

impl Game {
    pub fn new(
        owner_id: &str,
        title: &str,
        description: &str,
        words: Vec<String>,
    ) -> Result<Self, String> {
        let title = title.trim();
        if title.is_empty() || title.chars().count() > 100 {
            return Err("Geef je evenement een titel van maximaal 100 tekens.".into());
        }
        if description.chars().count() > 500 {
            return Err("De uitleg mag maximaal 500 tekens bevatten.".into());
        }
        let mut seen = HashSet::new();
        let mut items = Vec::new();
        for word in words {
            let word = word.trim();
            if word.is_empty() {
                continue;
            }
            if word.chars().count() > 70 {
                return Err("Een item mag maximaal 70 tekens bevatten.".into());
            }
            if !seen.insert(word.to_lowercase()) {
                return Err(format!("Het item ‘{word}’ staat dubbel in de lijst."));
            }
            items.push(Item {
                id: Uuid::new_v4().to_string(),
                text: word.into(),
            });
        }
        if !(17..=150).contains(&items.len()) {
            return Err("Gebruik 17 tot 150 verschillende woorden of gebeurtenissen.".into());
        }
        Ok(Self {
            id: Uuid::new_v4().simple().to_string()[..8].to_string(),
            owner_id: owner_id.into(),
            title: title.into(),
            description: description.trim().into(),
            status: "lobby".into(),
            items,
            players: vec![],
            calls: vec![],
            rules: Rules::default(),
            revision: 0,
        })
    }
    pub fn validate_card(&self, card: &[String]) -> Result<(), String> {
        let unique: HashSet<_> = card.iter().collect();
        if card.len() != 16
            || unique.len() != 16
            || card
                .iter()
                .any(|id| !self.items.iter().any(|i| &i.id == id))
        {
            return Err("Kies zestien verschillende items uit de woordenpool.".into());
        }
        Ok(())
    }
    pub fn save_player(
        &mut self,
        name: &str,
        card: Vec<String>,
        secret: &str,
        account_id: Option<&str>,
    ) -> Result<String, String> {
        if self.status != "lobby" {
            return Err("De kaarten staan vast: dit spel is al gestart.".into());
        }
        self.validate_card(&card)?;
        let name = name.trim();
        if name.is_empty() || name.chars().count() > 24 {
            return Err("Kies een naam van 1 tot 24 tekens.".into());
        }
        let existing = account_id
            .and_then(|account| {
                self.players
                    .iter()
                    .position(|p| p.account_id.as_deref() == Some(account))
            })
            .or_else(|| {
                self.players
                    .iter()
                    .position(|p| !secret.is_empty() && p.secret == secret)
            });
        if let Some(p) = existing.map(|index| &mut self.players[index]) {
            if let Some(existing) = &p.account_id
                && Some(existing.as_str()) != account_id
            {
                return Err("Deze kaart hoort bij een ander account.".into());
            }
            p.name = name.into();
            p.card = card;
            p.secret = if account_id.is_some() {
                String::new()
            } else {
                secret.into()
            };
            if let Some(account) = account_id {
                p.account_id = Some(account.into());
            }
            return Ok(p.id.clone());
        }
        let id = Uuid::new_v4().to_string();
        self.players.push(Player {
            id: id.clone(),
            secret: if account_id.is_some() {
                String::new()
            } else {
                secret.into()
            },
            account_id: account_id.map(String::from),
            name: name.into(),
            card,
        });
        Ok(id)
    }
    pub fn transition(&mut self, next: &str) -> Result<(), String> {
        match (self.status.as_str(), next) {
            ("lobby", "live") if !self.players.is_empty() => self.status = next.into(),
            ("live", "finished") => self.status = next.into(),
            _ => {
                return Err(
                    "Deze overgang kan nu niet. Voor starten is minstens één kaart nodig.".into(),
                );
            }
        }
        Ok(())
    }
    pub fn set_call(&mut self, item: &str, active: bool) -> Result<(), String> {
        if self.status != "live" {
            return Err("Afvinken en corrigeren kan alleen tijdens een live spel.".into());
        }
        if !self.items.iter().any(|i| i.id == item) {
            return Err("Onbekend item.".into());
        }
        if active && !self.calls.iter().any(|i| i == item) {
            self.calls.push(item.into());
        }
        if !active {
            self.calls.retain(|i| i != item);
        }
        Ok(())
    }
    pub fn standings(&self) -> Vec<Standing> {
        let mut rows: Vec<Standing> = self
            .players
            .iter()
            .map(|p| Standing {
                id: p.id.clone(),
                name: p.name.clone(),
                score: 0,
                rank: 1,
                awards: vec![],
            })
            .collect();
        let mut hits = HashSet::new();
        let mut prior: HashMap<&str, usize> = HashMap::new();
        for (step, item) in self.calls.iter().enumerate() {
            hits.insert(item.as_str());
            for (kind, base, bonus) in [
                ("line", self.rules.line_base, self.rules.line_bonus),
                ("full", self.rules.full_base, self.rules.full_bonus),
            ] {
                let eligible: Vec<usize> = self
                    .players
                    .iter()
                    .enumerate()
                    .filter(|(idx, p)| {
                        !rows[*idx].awards.iter().any(|a| a.kind == kind)
                            && achieved(kind, &p.card, &hits)
                    })
                    .map(|(idx, _)| idx)
                    .collect();
                // Competition ranking: simultaneous achievements share their bonus.
                let earlier = *prior.get(kind).unwrap_or(&0);
                let divisor = self.players.len().saturating_sub(1).max(1) as u32;
                let points = base + bonus.saturating_sub(bonus * earlier as u32 / divisor);
                for idx in &eligible {
                    rows[*idx].score += points;
                    rows[*idx].awards.push(Award {
                        kind: kind.into(),
                        points,
                        step: step + 1,
                    });
                }
                *prior.entry(kind).or_default() += eligible.len();
            }
        }
        rows.sort_by(|a, b| {
            b.score
                .cmp(&a.score)
                .then(a.name.cmp(&b.name))
                .then(a.id.cmp(&b.id))
        });
        for i in 0..rows.len() {
            rows[i].rank = if i > 0 && rows[i].score == rows[i - 1].score {
                rows[i - 1].rank
            } else {
                i + 1
            };
        }
        rows
    }
}
fn achieved(kind: &str, card: &[String], hits: &HashSet<&str>) -> bool {
    let marked = |i: usize| hits.contains(card[i].as_str());
    match kind {
        "full" => (0..16).all(marked),
        "line" => {
            (0..4).any(|r| (0..4).all(|c| marked(r * 4 + c)))
                || (0..4).any(|c| (0..4).all(|r| marked(r * 4 + c)))
                || (0..4).all(|i| marked(i * 5))
                || (0..4).all(|i| marked(3 + i * 3))
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn game() -> Game {
        Game::new(
            "owner",
            "College",
            "",
            (0..24).map(|i| format!("Woord {i}")).collect(),
        )
        .unwrap()
    }
    #[test]
    fn validation_and_locking() {
        let mut g = game();
        let card: Vec<_> = g.items[..16].iter().map(|i| i.id.clone()).collect();
        assert!(
            g.save_player("A", vec![card[0].clone(); 16], "a", None)
                .is_err()
        );
        g.save_player("A", card.clone(), "a", None).unwrap();
        g.transition("live").unwrap();
        assert!(g.save_player("B", card, "b", None).is_err());
        assert!(g.set_call("missing", true).is_err());
    }
    #[test]
    fn account_card_keeps_its_owner_and_drops_guest_secret() {
        let mut g = game();
        let card: Vec<_> = g.items[..16].iter().map(|i| i.id.clone()).collect();
        g.save_player("Gast", card.clone(), "guest", None).unwrap();
        g.save_player("Alice", card.clone(), "guest", Some("alice"))
            .unwrap();
        assert_eq!(g.players.len(), 1);
        assert!(g.players[0].secret.is_empty());
        assert_eq!(g.players[0].account_id.as_deref(), Some("alice"));
        g.save_player("Alice", card.clone(), "other-device", Some("alice"))
            .unwrap();
        assert_eq!(g.players.len(), 1);
        g.save_player("Bob", card.clone(), "bob", Some("bob"))
            .unwrap();
        assert_eq!(g.players.len(), 2);
        assert!(g.save_player("Gast", card, "bob", None).is_ok());
        assert_eq!(g.players.len(), 3);
    }
    #[test]
    fn ties_earlier_bonus_correction_and_full_card() {
        let mut g = game();
        let ids: Vec<_> = g.items.iter().map(|i| i.id.clone()).collect();
        for secret in ["a", "b"] {
            g.save_player(secret, ids[..16].to_vec(), secret, None)
                .unwrap();
        }
        let mut later = ids[..16].to_vec();
        later.swap(0, 4);
        g.save_player("C", later, "c", None).unwrap();
        g.transition("live").unwrap();
        for id in &ids[..4] {
            g.set_call(id, true).unwrap();
        }
        let rows = g.standings();
        assert_eq!(rows[0].score, 200);
        assert_eq!(rows[1].score, 200);
        assert_eq!(rows[1].rank, 1);
        assert_eq!(rows[2].score, 0);
        g.set_call(&ids[4], true).unwrap();
        assert_eq!(g.standings()[2].score, 100);
        g.set_call(&ids[4], true).unwrap();
        assert_eq!(g.calls.len(), 5);
        g.set_call(&ids[1], false).unwrap();
        assert!(g.standings().iter().all(|r| r.score == 0));
        for id in &ids[..16] {
            g.set_call(id, true).unwrap();
        }
        assert!(g.standings().iter().all(|r| r.awards.len() == 2));
        assert_eq!(g.standings()[0].score, 700);
    }
}
