# Binga

Een eerste werkende versie van live bingo voor persco's, colleges en speeches. React/TypeScript/Vite voor de interface, Rust/Axum voor de server en SQLite voor blijvende opslag. Gebaseerd op [PVA.md](PVA.md).

## Wat er nu werkt

- Vrij aan te maken accounts met `/login`, een profiel op `/account` en een hostomgeving op `/host`.
- Meespelen zonder account blijft mogelijk; met account blijven kaart, gespeelde rondes, punten en ranking beschikbaar na wisselen van apparaat.
- Evenement aanmaken met een eigen woordenpool, deelnamelink en QR-code.
- Zestien woorden kiezen en zelf plaatsen op een 4×4-kaart; bestaande woorden wisselen bij verplaatsen van plek.
- Kaart aanpassen in de lobby, vastzetten zodra de host start.
- Live bevestigingen via SSE, plus periodiek ophalen als terugval.
- Eerste lijn en volle kaart, automatische punten en ranglijst. Gelijke prestaties op dezelfde bevestiging krijgen gelijke punten.
- Bevestigingen terugdraaien met herberekening van prestaties en scores.
- Kaart herstellen na verversen, opslag na serverherstart en een eindstand bij afsluiten.
- Mobiele vormgeving met markeringen, bijna-bingo en een puntenmelding. Verminderde beweging wordt gerespecteerd; er is geen automatisch geluid.

## Lokaal starten

**Windows:** dubbelklik op `start.bat` in de projectmap. Dit bouwt de frontend en laat de Rust-server de volledige app op poort 5173 aanbieden. Het venster toont de actuele link voor een telefoon op dezelfde wifi. Open op de laptop `http://127.0.0.1:5173/`. Laat het terminalvenster open; stop met **Ctrl+C**. Een tweede dubbelklik herkent een al draaiende Binga-sessie en start geen extra processen. Het bestand vindt zowel een gewone Node-installatie als de Codex-runtime op deze werkplek.

De lokale starter luistert standaard op `0.0.0.0:5173`, zodat andere apparaten op hetzelfde lokale netwerk verbinding kunnen maken. Sta poort 5173 toe voor **particuliere netwerken** als Windows Firewall daarom vraagt. Gebruik geen router-portforwarding; externe toegang loopt bij de HAOS-versie via Cloudflared.

Als de telefoon geen verbinding krijgt, open PowerShell eenmaal **als administrator** en voer uit:

```powershell
New-NetFirewallRule -DisplayName "Binga lokaal TCP 5173" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Private
```

Vereisten: Node.js 22.12+ (hier getest met 24), npm, Rust stable en de bijbehorende compiler/linker. Op Windows kan dat MSVC met C++ Build Tools zijn. Deze werkplek heeft een lokale GNU-toolchain onder `.tools`; de scripts herkennen die automatisch. `.tools` hoort niet in Git of een release.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. De devstarter start en stopt frontend en backend samen. Maak via `/login` een account om zelf spellen te hosten.

Op deze werkplek is npm lokaal beschikbaar als alternatief:

```powershell
node .tools/package/bin/npm-cli.js run dev
```

Een ronde proberen: maak een account via `/login`, open `/host`, maak een evenement (er is een knop voor voorbeeldwoorden), open de deelnamelink in een tweede tab, stel zonder account een kaart samen en start daarna vanuit de hostomgeving het spel. Vink de woorden in de eerste rij af om punten te zien.

## Productiebuild en configuratie

```sh
npm run web:build
npm run server:build
```

Start daarna `server/target/release/binga-server` (Windows: `.exe`). De Rust-server serveert `dist`; Vite is geen productieserver.

| Instelling | Standaard / betekenis |
| --- | --- |
| `BINGA_BIND` | `127.0.0.1:8080` lokaal; container `0.0.0.0:8080` |
| `BINGA_DATA_DIR` | `server-data` lokaal; `/data` in de container |
| `BINGA_WEB_DIR` | `dist` lokaal; `/app/web` in de container |
| `BINGA_API_TARGET` | Vite-proxydoel; standaard `http://127.0.0.1:8080` |

Accounts, Argon2-wachtwoordhashes en sessies staan in dezelfde SQLite-database als de spellen. Sessies blijven dertig dagen geldig en overleven een serverherstart. Spelerssleutels blijven in de eigen browser; de backend bewaart alleen de hash. Een accountkaart is ook via een nieuwe browser na inloggen terug te vinden. De API geeft spelers geen kaarten of sleutels van anderen, wel schermnamen en scores op de ranglijst. Alleen de maker van een spel kan het starten, afvinken en afronden.

Accounts gebruiken voorlopig een gebruikersnaam en wachtwoord zonder e-mailadres. Wachtwoordherstel is nog niet ingebouwd; bewaar het wachtwoord dus goed.

De SQLite-database is de bron voor spel- en accountgegevens; browseropslag bevat de sessiesleutel en eventuele gastspelerssleutels. Maak een back-up terwijl de server gestopt is en bewaar de volledige datamap. Herstel met dezelfde versie. Bestaande spellen van vóór accounts blijven speelbaar, maar krijgen geen eigenaar en verschijnen dus niet in een nieuw hostaccount.

## Voorlopige puntenregeling

Iedere speler verdient eenmaal punten voor de eerste lijn (rij, kolom of diagonaal) en eenmaal voor een volle kaart. De instellingen worden per evenement opgeslagen:

- Lijn: 100 basispunten + maximaal 100 bonuspunten.
- Volle kaart: 300 basispunten + maximaal 200 bonuspunten, boven op lijnpunten.
- Bonus = maximum minus `floor(maximum × eerdere spelers / max(aantal spelers − 1, 1))`.
- Spelers die dezelfde prestatie bij dezelfde bevestiging halen, tellen niet als eerder ten opzichte van elkaar. Latere groepen tellen alle eerdere spelers mee.
- Scores worden uit de geldige bevestigingsvolgorde afgeleid. Correcties kunnen dus ook bestaande punten terugnemen.

Dit is een startpunt voor proefspellen. De regels staan in `server/src/domain.rs`; de interface toont de opgeslagen puntbereiken. Extra prestaties kunnen naast de bestaande herkenning worden toegevoegd. Er is nog geen editor voor puntregels in de hostomgeving. Alleen afgeronde spellen tellen mee voor de blijvende accountscore en overall ranking.

## Controles

```sh
npm test
npm run test:server
npm run web:build
npm run server:build
npx playwright install chromium
npm run test:e2e
```

De browsertests starten een echte Rust-server met een tijdelijke database op poort 18080. Er worden geen echte spelgegevens gebruikt. Als Chromium niet gedownload kan worden, gebruik een lokaal geïnstalleerde Chrome:

```powershell
$env:BINGA_BROWSER_CHANNEL = 'chrome'
npm run test:e2e
```

De tests controleren een volledige mobiele spelronde inclusief login, kaartbouw, bewaren, live afvinken, punten, correctie en afronden. Een aanvullende proef opent vijftig SSE-verbindingen en controleert hun updates. Dit is een lokale laptoptest, geen capaciteitstest op de Pi.

## HAOS en Cloudflared

Het Dockerfile en een installeerbare lokale HAOS-add-onbundel staan klaar. Maak die met `npm run ha:package`; de uitvoer komt in `build-artifacts/home-assistant-repository/binga`. Zie [de installatie-opzet](deploy/home-assistant/README.md). De beoogde route is `binga.allardnet.nl` → bestaande Cloudflared-add-on → `http://HAOS_LAN_IP:8098` → Binga-add-on. Er is nog geen image of catalogus gepubliceerd en de tunnel op de Pi is nog niet aangepast.

## GitHub en releases

De broncode staat in [Allardo24/binga](https://github.com/Allardo24/binga). Een push naar `main` of een pull request voert automatisch de frontend-, Rust- en browsertests uit en controleert de lokale HA-bundel. Een gewone push installeert niets op Home Assistant.

Een versietag zoals `v0.1.0` start apart de ARM64-imageworkflow. Die bouwt en test de container op een ARM64-runner en publiceert het versie-image naar `ghcr.io/allardo24/binga`. De Windows-starter `publiceer-ha.bat` controleert de versies en lokale tests, volgt de GitHub-workflows voor de exacte commit en maakt de HA-catalogus pas zichtbaar nadat het image ook zonder aanmelding kan worden opgehaald. De eerste GHCR-publicatie is standaard privé; maak het package in je eigen GitHub-instellingen publiek voordat de catalogus wordt gepusht.

De openbare HA-catalogus komt na een geslaagde release als `repository.yaml` en `binga/` in dezelfde GitHub-repository. Pas dan kun je `https://github.com/Allardo24/binga` als add-onrepository aan Home Assistant toevoegen. De huidige lokale bundel blijft daarnaast bruikbaar voor een handmatige installatie.

## Wat nog volgt

De lokale checks controleren de webbuild, Rust- en API-tests en browserflows. Docker, ARM64, de echte Pi en Cloudflared zijn nog niet getest; daarvoor is deze lokale controle geen vervanging.

- Container bouwen/starten, ARM64-image controleren en installeren op de daadwerkelijke Pi.
- Cloudflared-route en externe telefoonverbinding controleren.
- Capaciteit en herstart/back-up/herstel op HAOS testen.
- Puntenbalans en gebruiksgemak met een echte groep aanscherpen.
- Eventueel later: extra prestaties, bewerkbare spelregels, eigen woordsuggesties en hostgoedkeuring.

Gastspelers houden één kaart per browser per evenement. Wie een account gebruikt, heeft één kaart per account per evenement en kan die na inloggen op een ander apparaat terugvinden. Zonder account gaat bij wissen van browseropslag de toegang tot de eigen kaart verloren; de kaart blijft wel op de server bewaard.
