import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  Copy,
  Crown,
  Grid2X2,
  LockKeyhole,
  Plus,
  Radio,
  Search,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  api,
  sessionKey,
  type Account,
  type AccountDashboard,
  type Game,
  type Standing,
} from "./api";
import { placeItem, lineProgress } from "./card";
import "./style.css";

const labels = { lobby: "In de lobby", live: "Nu live", finished: "Afgelopen" };
const exampleWords = [
  "Even een stap terug",
  "Goede vraag",
  "Volgende slide",
  "Dat is interessant",
  "In principe",
  "Daar kom ik op terug",
  "Even kijken",
  "De praktijk",
  "Kortom",
  "Heel belangrijk",
  "Om eerlijk te zijn",
  "Nog één ding",
  "Duidelijk?",
  "Bijvoorbeeld",
  "Dat hangt ervan af",
  "Zijn er nog vragen?",
];
function Brand() {
  return (
    <a className="brand" href="/" aria-label="Binga startpagina">
      binga<span>✳</span>
    </a>
  );
}
function Header() {
  const loggedIn = Boolean(localStorage.getItem(sessionKey));
  return (
    <header className="header">
      <Brand />
      <div className="header-right">
        <span className="tiny desktop-only">JIJ ZAG HET AL AANKOMEN.</span>
        <a className="text-link" href={loggedIn ? "/account" : "/login"}>
          {loggedIn ? "Mijn Binga" : "Inloggen"}
          <ArrowUpRight size={16} />
        </a>
        <a className="text-link desktop-only" href="/host">
          Voor hosts
          <ArrowUpRight size={16} />
        </a>
      </div>
    </header>
  );
}
function ErrorBox({ text }: { text: string }) {
  return text ? (
    <div className="error" role="alert">
      {text}
    </div>
  ) : null;
}
function Rules({ game }: { game: Game }) {
  return (
    <details className="rules">
      <summary>
        Zo scoor je punten <Plus size={16} />
      </summary>
      <p>
        Iedereen speelt door. Je eerste lijn (rij, kolom of diagonaal) levert{" "}
        {game.rules.line_base}–{game.rules.line_base + game.rules.line_bonus}{" "}
        punten op. Een volle kaart geeft daarbovenop {game.rules.full_base}–
        {game.rules.full_base + game.rules.full_bonus} punten.
      </p>
      <p>
        Hoe minder spelers je vóór zijn, hoe hoger de bonus. Tegelijk behaald =
        gelijke punten. De host bepaalt wat telt. Deze eerste puntenregeling
        gaan we nog verfijnen.
      </p>
    </details>
  );
}
function Home() {
  const [code, setCode] = useState("");
  return (
    <>
      <Header />
      <main className="home">
        <section className="hero-copy">
          <div className="eyebrow">
            <span className="dot" /> LIVE BINGO. ECHTE MOMENTEN.
          </div>
          <h1>
            Jij hoort het.
            <br />
            Jij <span className="lime-text">scoort.</span>
            <Sparkles className="hero-spark" />
          </h1>
          <p className="intro">
            Die ene uitspraak. Die voorspelbare grap.
            <br />
            Maak je kaart, volg het moment en pak je punten.
          </p>
          <form
            className="join-box"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim())
                window.location.href = `/g/${encodeURIComponent(code.trim().toLowerCase())}`;
            }}
          >
            <label htmlFor="code">Klaar om mee te spelen?</label>
            <div className="join-row">
              <input
                id="code"
                placeholder="Vul je spelcode in"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={32}
                required
                autoComplete="off"
              />
              <button className="button lime" aria-label="Meespelen">
                Let's bingo <ArrowRight size={19} />
              </button>
            </div>
            <span className="muted small">
              Geen account. Gewoon je naam en je beste voorspellingen.
            </span>
          </form>
          <div className="hero-foot">
            <span>
              <Grid2X2 size={16} /> Jouw kaart, jouw keuzes
            </span>
            <span>
              <Zap size={16} /> Live afgevinkt
            </span>
          </div>
        </section>
        <section className="hero-art" aria-label="Voorbeeld van een bingokaart">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="floating-sticker">
            IK WIST HET! <Sparkles size={19} />
          </div>
          <div className="sample-ticket">
            <div className="ticket-top">
              <span>DE GROTE COLLEGEBINGO</span>
              <span className="sample-tag">VOORBEELD</span>
            </div>
            <div className="sample-heading">
              Een goed voorgevoel.<span>Een nóg betere kaart.</span>
            </div>
            <div className="sample-grid">
              {exampleWords.map((w, i) => (
                <div
                  key={w}
                  className={[0, 5, 10, 15].includes(i) ? "sample-hit" : ""}
                >
                  {[0, 5, 10, 15].includes(i) && <Check size={15} />}
                  <span>{w}</span>
                </div>
              ))}
            </div>
            <div className="ticket-bottom">
              <span>01 — EERSTE LIJN</span>
              <strong>
                +200 <small>PT</small>
              </strong>
            </div>
          </div>
          <div className="art-caption">
            VERWACHT HET ONVERWACHTE. OF JUIST NIET.
          </div>
        </section>
      </main>
      <section className="how">
        <div>
          <span className="step-number">01</span>
          <h3>Kies je voorspellingen</h3>
          <p>Pak 16 items uit de pool van de host en geef ze een plek.</p>
        </div>
        <div>
          <span className="step-number">02</span>
          <h3>Volg het moment</h3>
          <p>De host vinkt af. Je kaart kleurt automatisch mee.</p>
        </div>
        <div>
          <span className="step-number">03</span>
          <h3>Wees er vroeg bij</h3>
          <p>Een lijn? Een volle kaart? Hoe eerder, hoe meer punten.</p>
        </div>
      </section>
      <footer>
        <Brand />
        <span>Een beetje voorkennis. Een beetje geluk.</span>
        <span className="tiny">GEBOUWD VOOR HET MOMENT</span>
      </footer>
    </>
  );
}
function useGame(id: string) {
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const latestRequest = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const data = await api<Game>(`/games/${id}`, { gameId: id });
      if (request !== latestRequest.current) return;
      setGame((old) => (old && old.revision > data.revision ? old : data));
      setError("");
    } catch (e) {
      if (request !== latestRequest.current) return;
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    void refresh();
    const source = new EventSource(`/api/games/${id}/events`);
    source.onopen = () => {
      setConnected(true);
      void refresh();
    };
    source.onerror = () => setConnected(false);
    source.addEventListener("update", () => void refresh());
    const interval = setInterval(() => void refresh(), 15000);
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      source.close();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [id, refresh]);
  return { game, error, connected, refresh };
}
function Ranking({
  rows,
  me,
  finished = false,
}: {
  rows: Standing[];
  me?: string;
  finished?: boolean;
}) {
  return (
    <section className="panel ranking">
      <div className="section-heading">
        <h2>
          <Trophy size={19} /> {finished ? "De eindstand" : "De tussenstand"}
        </h2>
        <span className="tiny">PUNTEN</span>
      </div>
      {rows.length ? (
        rows.map((p) => (
          <div className={`rank-row ${p.id === me ? "is-me" : ""}`} key={p.id}>
            <span className="rank-number">
              {p.rank === 1 && p.score > 0 ? (
                <Crown size={19} />
              ) : (
                String(p.rank).padStart(2, "0")
              )}
            </span>
            <span className="avatar">{p.name.slice(0, 1).toUpperCase()}</span>
            <span className="rank-name">
              {p.name}
              {p.id === me && <small>jij</small>}
            </span>
            <strong>{p.score}</strong>
          </div>
        ))
      ) : (
        <p className="muted">
          De eerste voorspeller laat nog even op zich wachten.
        </p>
      )}
    </section>
  );
}
function CardBuilder({
  game,
  saved,
}: {
  game: Game;
  saved: () => Promise<void>;
}) {
  const [name, setName] = useState(
    game.me?.name || game.account?.username || "",
  );
  const [card, setCard] = useState<string[]>(
    game.me?.card || Array(16).fill(""),
  );
  const [slot, setSlot] = useState(0);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const count = card.filter(Boolean).length;
  const put = (item: string) => {
    const next = placeItem(card, slot, item);
    setCard(next);
    const empty = next.findIndex((v, i) => !v && i > slot);
    setSlot(
      empty >= 0
        ? empty
        : Math.max(
            0,
            next.findIndex((v) => !v),
          ),
    );
  };
  return (
    <div className="builder-layout">
      <section>
        <div className="section-heading">
          <h2>Maak 'm van jou.</h2>
          <span className="pill">{count}/16 gekozen</span>
        </div>
        <p className="muted">
          Tik op een vakje, kies een woord. Jij bepaalt de indeling.
        </p>
        <label className="field">
          Je spelersnaam
          <input
            maxLength={24}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hoe mogen we je noemen?"
            autoComplete="nickname"
          />
        </label>
        <div className="bingo-grid builder-grid">
          {card.map((id, i) => (
            <button
              key={i}
              className={`bingo-cell ${slot === i ? "selected" : ""}`}
              onClick={() => setSlot(i)}
              aria-label={`Vakje ${i + 1}: ${game.items.find((w) => w.id === id)?.text || "leeg"}`}
            >
              <small>{String(i + 1).padStart(2, "0")}</small>
              {id ? (
                <span>{game.items.find((w) => w.id === id)?.text}</span>
              ) : (
                <Plus size={23} />
              )}
            </button>
          ))}
        </div>
        <ErrorBox text={error} />
        <button
          className="button lime full-width"
          disabled={busy || count !== 16 || !name.trim()}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const result = await api<{ token: string }>(
                `/games/${game.id}/card`,
                { method: "PUT", body: { name, card }, gameId: game.id },
              );
              if (result.token)
                localStorage.setItem(`binga-player-${game.id}`, result.token);
              else localStorage.removeItem(`binga-player-${game.id}`);
              await saved();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Even opslaan…" : "Dit wordt mijn kaart"}
          <ArrowRight size={18} />
        </button>
        <p className="small muted centered">
          Je kunt je kaart aanpassen tot de host het spel start.
        </p>
      </section>
      <section className="panel pool">
        <div className="section-heading">
          <h2>De woordenpool</h2>
          <span className="tiny">{game.items.length} ITEMS</span>
        </div>
        <div className="search">
          <Search size={18} />
          <input
            aria-label="Zoek in de woordenpool"
            placeholder="Zoek je voorspelling…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="small muted">
          Kies een woord voor vakje {slot + 1}. Een gekozen woord verplaatst
          mee.
        </p>
        <div className="pool-items">
          {game.items
            .filter((w) => w.text.toLowerCase().includes(query.toLowerCase()))
            .map((w) => (
              <button
                key={w.id}
                className={`word-chip ${card.includes(w.id) ? "chosen" : ""}`}
                onClick={() => put(w.id)}
              >
                {w.text}
                {card.includes(w.id) ? <Check size={15} /> : <Plus size={15} />}
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}
function PlayerGame({ id }: { id: string }) {
  const { game, error, connected, refresh } = useGame(id);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState("");
  const previous = useRef<number | null>(null);
  const mine = game?.standings.find((p) => p.id === game.me?.id);
  useEffect(() => {
    if (!mine) return;
    if (previous.current !== null && mine.score !== previous.current) {
      setToast(
        mine.score > previous.current
          ? `Binga! +${mine.score - previous.current} punten`
          : "De host heeft de stand gecorrigeerd.",
      );
      const timer = setTimeout(() => setToast(""), 5000);
      previous.current = mine.score;
      return () => clearTimeout(timer);
    }
    previous.current = mine.score;
  }, [mine?.score]);
  if (!game)
    return (
      <>
        <Header />
        <main className="page">
          <ErrorBox text={error} />
          {!error && <p>Je spel wordt geladen…</p>}
          <a className="text-link" href="/">
            Terug naar start
          </a>
        </main>
      </>
    );
  const card = game.me?.card || [];
  const hits = card.filter((id) => game.calls.includes(id)).length;
  return (
    <>
      <Header />
      <main className="page">
        <div className="event-top">
          <div>
            <div className="eyebrow">
              <span className={`dot ${connected ? "" : "offline"}`} />
              {connected ? labels[game.status] : "Verbinding herstellen…"}
              <span className="muted">/ {game.id}</span>
            </div>
            <h1 className="event-title">{game.title}</h1>
            <p className="muted">
              {game.description || "Je beste voorspellingen beginnen hier."}
            </p>
          </div>
          <span className="pill">
            <Users size={16} />
            {game.players} spelers
          </span>
        </div>
        <ErrorBox text={error} />
        {toast && (
          <div className="celebration" role="status">
            <Sparkles />
            {toast}
          </div>
        )}
        {game.status === "lobby" && (!game.me || editing) ? (
          <CardBuilder
            game={game}
            saved={async () => {
              await refresh();
              setEditing(false);
            }}
          />
        ) : !game.me ? (
          <section className="panel empty">
            <LockKeyhole />
            <h2>De kaarten liggen al op tafel.</h2>
            <p>
              Dit spel is al gestart. Je kunt de tussenstand volgen, maar geen
              kaart meer insturen.
            </p>
            <Ranking
              rows={game.standings}
              finished={game.status === "finished"}
            />
          </section>
        ) : (
          <div className="play-layout">
            <section className="card-section">
              <div className="section-heading">
                <h2>
                  {game.status === "finished"
                    ? "Dit was jouw ronde."
                    : game.status === "lobby"
                      ? "Jij bent er klaar voor."
                      : "Jouw voorspellingen"}
                </h2>
                <span className="tiny">{hits}/16 GERAAKT</span>
              </div>
              {game.status === "lobby" && (
                <div className="lobby-notice">
                  <Radio size={18} />
                  <span>Wachten op de host. Je kaart staat klaar.</span>
                  <button onClick={() => setEditing(true)}>Aanpassen</button>
                </div>
              )}
              <div className="bingo-grid live-grid">
                {card.map((id, i) => {
                  const hit = game.calls.includes(id);
                  return (
                    <div key={id} className={`bingo-cell ${hit ? "hit" : ""}`}>
                      <small>
                        {hit ? (
                          <Check size={17} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </small>
                      <span>{game.items.find((w) => w.id === id)?.text}</span>
                      {hit && <span className="hit-label">GEVALLEN</span>}
                    </div>
                  );
                })}
              </div>
              <div className="card-bottom">
                <span>
                  <Zap size={16} />{" "}
                  {game.status === "finished"
                    ? "De ronde is afgerond"
                    : "De host vinkt af. Jij volgt mee."}
                </span>
                {lineProgress(card, game.calls) === 3 &&
                  game.status === "live" && (
                    <strong>Nog één voor een lijn!</strong>
                  )}
              </div>
              <Rules game={game} />
            </section>
            <aside>
              <section className="score-panel">
                <span className="tiny">
                  {game.status === "finished" ? "JOUW EINDSCORE" : "JOUW SCORE"}
                </span>
                <div className="big-score">
                  {mine?.score || 0}
                  <span>PT</span>
                  <Sparkles />
                </div>
                <div className="score-position">
                  Positie <strong>#{mine?.rank || 1}</strong>
                  <span>van {game.players}</span>
                </div>
                <div className="achievements">
                  {[
                    ["line", "Eerste lijn"],
                    ["full", "Volle kaart"],
                  ].map(([kind, label]) => {
                    const award = mine?.awards.find((a) => a.kind === kind);
                    return (
                      <div key={kind} className={award ? "earned" : ""}>
                        <span>
                          {kind === "line" ? (
                            <Zap size={18} />
                          ) : (
                            <Trophy size={18} />
                          )}{" "}
                          {label}
                        </span>
                        <strong>
                          {award ? `+${award.points}` : "Nog te pakken"}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </section>
              <Ranking
                rows={game.standings}
                me={game.me.id}
                finished={game.status === "finished"}
              />
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requested =
    new URLSearchParams(location.search).get("next") || "/account";
  const next =
    requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/account";
  return (
    <>
      <Header />
      <main className="page auth-page">
        <form
          className="panel login auth-card"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              const result = await api<{ token: string; account: Account }>(
                `/auth/${mode}`,
                { method: "POST", body: { username, password } },
              );
              localStorage.setItem(sessionKey, result.token);
              window.location.href = next;
            } catch (caught) {
              setError((caught as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="eyebrow">
            <Sparkles size={14} /> JOUW BINGA
          </div>
          <h1>{mode === "login" ? "Welkom terug." : "Maak je account."}</h1>
          <p className="muted">
            {mode === "login"
              ? "Ga verder met je gespeelde en gehoste Binga's."
              : "Host spellen en bewaar je punten en geschiedenis."}
          </p>
          <div className="auth-switch" role="group" aria-label="Accountactie">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Inloggen
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Account maken
            </button>
          </div>
          <label className="field">
            Gebruikersnaam
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              minLength={3}
              maxLength={24}
              required
            />
          </label>
          <label className="field">
            Wachtwoord
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={10}
              maxLength={128}
              required
            />
          </label>
          <ErrorBox text={error} />
          <button className="button lime full-width" disabled={busy}>
            {busy
              ? "Even geduld…"
              : mode === "login"
                ? "Inloggen"
                : "Account maken"}
            <ArrowRight size={18} />
          </button>
          <p className="small muted centered">
            Meespelen kan altijd zonder account.
          </p>
        </form>
      </main>
    </>
  );
}

function AccountPage() {
  const [dashboard, setDashboard] = useState<AccountDashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<AccountDashboard>("/account")
      .then(setDashboard)
      .catch((caught) => setError((caught as Error).message));
  }, []);
  if (!dashboard)
    return (
      <>
        <Header />
        <main className="page auth-page">
          {error ? (
            <section className="panel login">
              <ErrorBox text={error} />
              <a className="button lime" href="/login?next=/account">
                Inloggen
              </a>
            </section>
          ) : (
            <p>Je profiel wordt geladen…</p>
          )}
        </main>
      </>
    );
  return (
    <>
      <Header />
      <main className="page account-page">
        <div className="event-top">
          <div>
            <div className="eyebrow">
              <Trophy size={14} /> SPELERSPROFIEL
            </div>
            <h1 className="event-title">Hoi, {dashboard.account.username}.</h1>
            <p className="muted">
              Hier groeit je Binga-reputatie mee met elk afgerond spel.
            </p>
          </div>
          <div className="account-actions">
            <a className="button lime" href="/host">
              Host een Binga
            </a>
            <button
              className="button ghost"
              onClick={async () => {
                await api("/auth/logout", { method: "POST" });
                localStorage.removeItem(sessionKey);
                window.location.href = "/";
              }}
            >
              Uitloggen
            </button>
          </div>
        </div>
        <section className="stats-grid">
          <div className="panel stat">
            <span className="tiny">TOTAALSCORE</span>
            <strong>{dashboard.total_score}</strong>
            <span>punten</span>
          </div>
          <div className="panel stat">
            <span className="tiny">OVERALL RANK</span>
            <strong>#{dashboard.rank}</strong>
            <span>van {dashboard.total_accounts}</span>
          </div>
          <div className="panel stat">
            <span className="tiny">GESPEELD</span>
            <strong>{dashboard.games_played}</strong>
            <span>afgeronde rondes</span>
          </div>
          <div className="panel stat">
            <span className="tiny">GEHOST</span>
            <strong>{dashboard.games_hosted}</strong>
            <span>evenementen</span>
          </div>
        </section>
        <div className="account-columns">
          <section className="panel">
            <div className="section-heading">
              <h2>Jouw geschiedenis</h2>
              <span className="pill">{dashboard.history.length}</span>
            </div>
            <div className="history-list">
              {dashboard.history.length ? (
                dashboard.history.map((game) => (
                  <a
                    className="history-row"
                    href={`/g/${game.id}`}
                    key={game.id}
                  >
                    <div>
                      <strong>{game.title}</strong>
                      <small>
                        {game.played_as} · {labels[game.status]}
                      </small>
                    </div>
                    <span>
                      <b>{game.score}</b> pt
                      {game.rank ? ` · #${game.rank}` : ""}
                    </span>
                  </a>
                ))
              ) : (
                <p className="muted">Je eerste spel staat straks hier.</p>
              )}
            </div>
          </section>
          <section className="panel">
            <div className="section-heading">
              <h2>Overall ranking</h2>
              <Trophy size={20} />
            </div>
            <div className="leaderboard-list">
              {dashboard.leaderboard.map((row) => (
                <div
                  className={`leaderboard-row ${row.username === dashboard.account.username ? "mine" : ""}`}
                  key={row.username}
                >
                  <span>#{row.rank}</span>
                  <strong>{row.username}</strong>
                  <span>{row.total_score} pt</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

const seedWords = [
  ...exampleWords,
  "Technisch gezien",
  "In de toekomst",
  "Samenwerking",
  "De volgende stap",
  "Een uitdaging",
  "Laten we beginnen",
  "Heel concreet",
  "Ik rond af",
];
function Host() {
  const [account, setAccount] = useState<Account | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [games, setGames] = useState<
    {
      id: string;
      title: string;
      status: keyof typeof labels;
      players: number;
    }[]
  >([]);
  const [selected, setSelected] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [words, setWords] = useState("");
  const load = useCallback(async () => {
    try {
      const me = await api<{ account: Account }>("/auth/me");
      setAccount(me.account);
      setGames(await api("/host/games"));
    } catch (e) {
      setAccount(null);
      if (localStorage.getItem(sessionKey)) setError((e as Error).message);
    } finally {
      setAuthChecked(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <>
      <Header />
      <main className="page">
        <div className="event-top">
          <div>
            <div className="eyebrow">
              <LockKeyhole size={14} /> ACHTER DE SCHERMEN
            </div>
            <h1 className="event-title">Jij bepaalt het moment.</h1>
            <p className="muted">
              Zet de woorden klaar. Verzamel je spelers. Laat het gebeuren.
            </p>
          </div>
          {account && (
            <button
              className="button ghost"
              onClick={async () => {
                await api("/auth/logout", { method: "POST" });
                localStorage.removeItem(sessionKey);
                setAccount(null);
                setSelected("");
                window.location.href = "/";
              }}
            >
              Uitloggen
            </button>
          )}
        </div>
        <ErrorBox text={error} />
        {!authChecked ? (
          <p className="muted">Je hostomgeving wordt geladen…</p>
        ) : !account ? (
          <section className="panel login">
            <LockKeyhole className="lavender-text" size={30} />
            <h2>Log in om te hosten.</h2>
            <p className="muted">
              Met een gratis account maak en beheer je jouw eigen Binga's.
            </p>
            <a className="button lime full-width" href="/login?next=/host">
              Naar inloggen
              <ArrowRight size={18} />
            </a>
          </section>
        ) : selected ? (
          <>
            <button
              className="text-link back"
              onClick={() => {
                setSelected("");
                void load();
              }}
            >
              <ChevronLeft size={16} />
              Alle evenementen
            </button>
            <HostGame id={selected} />
          </>
        ) : (
          <>
            <div className="section-heading">
              <h2>Jouw evenementen</h2>
              <button
                className="button lime"
                onClick={() => setCreating(!creating)}
              >
                {creating ? <X size={18} /> : <Plus size={18} />}{" "}
                {creating ? "Sluiten" : "Nieuw evenement"}
              </button>
            </div>
            {creating && (
              <form
                className="panel create-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    const game = await api<Game>("/host/games", {
                      method: "POST",
                      body: { title, description, words: words.split("\n") },
                    });
                    setCreating(false);
                    setTitle("");
                    setDescription("");
                    setWords("");
                    setSelected(game.id);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <h2>Een nieuw voorgevoel.</h2>
                <div className="form-columns">
                  <div>
                    <label className="field">
                      Naam evenement
                      <input
                        placeholder="De grote collegebingo"
                        maxLength={100}
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </label>
                    <label className="field">
                      Korte uitleg
                      <textarea
                        placeholder="Wat gaan we volgen?"
                        maxLength={500}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </label>
                    <p className="muted small">
                      4 × 4 kaart · live afvinken · eerste lijn + volle kaart
                      <br />
                      De woordenpool staat vast zodra spelers hun kaarten maken.
                    </p>
                  </div>
                  <div>
                    <label className="field">
                      Woordenpool — één item per regel
                      <textarea
                        className="words-input"
                        placeholder="Goede vraag&#10;Daar kom ik op terug&#10;Volgende slide"
                        required
                        value={words}
                        onChange={(e) => setWords(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => setWords(seedWords.join("\n"))}
                    >
                      Vul een voorbeeldpool in <Sparkles size={15} />
                    </button>
                    <p className="small muted">
                      17–150 unieke items. Spelers kiezen er zelf 16.
                    </p>
                  </div>
                </div>
                <button className="button lime" disabled={busy}>
                  {busy ? "Aanmaken…" : "Open de lobby"}
                  <ArrowRight size={18} />
                </button>
              </form>
            )}
            <div className="event-list">
              {games.map((g) => (
                <button
                  className="event-tile panel"
                  key={g.id}
                  onClick={() => setSelected(g.id)}
                >
                  <span className={`status-badge ${g.status}`}>
                    {labels[g.status]}
                  </span>
                  <h3>{g.title}</h3>
                  <div>
                    <span>
                      <Users size={16} /> {g.players} spelers
                    </span>
                    <ArrowUpRight size={22} />
                  </div>
                </button>
              ))}
              {!games.length && !creating && (
                <div className="panel empty">
                  <Grid2X2 size={32} />
                  <h2>Het begint met een voorspelling.</h2>
                  <p className="muted">
                    Maak je eerste evenement en nodig je spelers uit.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
function HostGame({ id }: { id: string }) {
  const { game, error, connected } = useGame(id);
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const action = async (path: string, body: unknown) => {
    setBusy(true);
    setActionError("");
    try {
      await api(path, { method: "PUT", body });
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!game) return <ErrorBox text={error} />;
  const url = `${location.origin}/g/${id}`;
  return (
    <>
      <section className="admin-game-head panel">
        <div>
          <span className={`status-badge ${game.status}`}>
            {connected ? labels[game.status] : "Verbinding herstellen…"}
          </span>
          <h2>{game.title}</h2>
          <span className="muted">
            {game.players} spelers · {game.calls.length} items afgevinkt
          </span>
        </div>
        <div className="admin-controls">
          {game.status === "lobby" && (
            <button
              className="button lime"
              disabled={!game.players || busy}
              onClick={() =>
                void action(`/host/games/${id}/status`, { status: "live" })
              }
            >
              <Radio size={18} />
              Start het spel
            </button>
          )}
          {game.status === "live" &&
            (confirmEnd ? (
              <>
                <span>Ronde definitief afsluiten?</span>
                <button
                  className="button danger"
                  disabled={busy}
                  onClick={() => {
                    void action(`/host/games/${id}/status`, {
                      status: "finished",
                    });
                    setConfirmEnd(false);
                  }}
                >
                  Ja, afronden
                </button>
                <button
                  className="button ghost"
                  onClick={() => setConfirmEnd(false)}
                >
                  Terug
                </button>
              </>
            ) : (
              <button
                className="button ghost"
                onClick={() => setConfirmEnd(true)}
              >
                Spel afronden
              </button>
            ))}
        </div>
      </section>
      <ErrorBox text={error || actionError} />
      <div className="play-layout">
        <section className="panel">
          <div className="section-heading">
            <h2>
              {game.status === "lobby"
                ? "Dit kan er zomaar gebeuren."
                : "Wat kwam er voorbij?"}
            </h2>
            <span className="tiny">{game.items.length} ITEMS</span>
          </div>
          <div className="search">
            <Search size={18} />
            <input
              placeholder="Zoek een woord of gebeurtenis…"
              aria-label="Zoek hostwoorden"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <p className="small muted">
            {game.status === "live"
              ? "Tik om te bevestigen. Nogmaals tikken draait de bevestiging terug en herberekent de scores."
              : game.status === "lobby"
                ? "Zodra je start, worden kaarten vastgezet en kun je hier afvinken."
                : "Deze ronde is afgesloten. De eindstand staat vast."}
          </p>
          <div className="admin-words">
            {game.items
              .filter((w) => w.text.toLowerCase().includes(query.toLowerCase()))
              .map((w) => (
                <button
                  key={w.id}
                  disabled={game.status !== "live" || busy}
                  className={`admin-word ${game.calls.includes(w.id) ? "called" : ""}`}
                  onClick={() =>
                    void action(`/host/games/${id}/calls/${w.id}`, {
                      active: !game.calls.includes(w.id),
                    })
                  }
                >
                  <span>{w.text}</span>
                  {game.calls.includes(w.id) ? (
                    <Check size={20} />
                  ) : (
                    <Plus size={20} />
                  )}
                </button>
              ))}
          </div>
        </section>
        <aside>
          <section className="panel invite">
            <span className="tiny">NODIG JE SPELERS UIT</span>
            <div className="qr">
              <QRCodeSVG value={url} size={136} />
            </div>
            <strong className="game-code">{id}</strong>
            <button
              className="button ghost full-width"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                } catch {
                  setActionError(`Kopieer deze link: ${url}`);
                }
              }}
            >
              <Copy size={16} />
              {copied ? "Link gekopieerd!" : "Kopieer deelnamelink"}
            </button>
            <a
              className="text-link"
              href={`/g/${id}`}
              target="_blank"
              rel="noreferrer"
            >
              Open spelersomgeving <ArrowUpRight size={15} />
            </a>
          </section>
          <Ranking
            rows={game.standings}
            finished={game.status === "finished"}
          />
          <Rules game={game} />
        </aside>
      </div>
    </>
  );
}
const path = location.pathname;
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {path === "/host" || path === "/admin" ? (
      <Host />
    ) : path === "/login" ? (
      <AuthPage />
    ) : path === "/account" ? (
      <AccountPage />
    ) : path.startsWith("/g/") ? (
      <PlayerGame id={decodeURIComponent(path.split("/")[2])} />
    ) : (
      <Home />
    )}
  </React.StrictMode>,
);
