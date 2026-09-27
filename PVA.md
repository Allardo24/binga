# Binga — conceptueel plan van aanpak

Status: conceptfase afgerond; voldoende richting voor verdere uitwerking. Spelregels en technische keuzes hieronder zijn voorstellen, tenzij ze rechtstreeks uit de gemaakte keuzes volgen. Detailvragen en puntenbalans horen bij de bouw- en testfase.

## 1. Het idee

Binga maakt van een persconferentie, college, speech of andere gebeurtenis een gezamenlijk bingospel. Een beheerder zet vooraf woorden, uitspraken en gebeurtenissen klaar. Deelnemers openen de website op hun telefoon en kiezen uit die lijst de items die zij verwachten. Daarmee krijgen ze een persoonlijke bingokaart.

Wanneer iets daadwerkelijk gebeurt, bevestigt de beheerder dat in het systeem. Binga vinkt de bijbehorende vakjes op alle deelnemende kaarten automatisch live af. De spanning zit in voorspellen, samen volgen en steeds dichter bij bingo komen.

De uitstraling is uitbundig: felle kleuren, duidelijke voortgang, speelse animaties en een groot winmoment. Gokapps dienen als visuele inspiratie; geld inzetten is geen onderdeel van dit concept.

## 2. Het verloop van een spel

1. **Voorbereiden:** de beheerder maakt een evenement aan met een titel, korte uitleg en een lijst van mogelijke woorden of gebeurtenissen. Bij twijfelgevoelige items kan een korte definitie staan, bijvoorbeeld of varianten van een woord ook meetellen.
2. **Deelnemen:** spelers openen een link of scannen een QR-code. Ze kiezen een schermnaam en stellen hun kaart samen uit de beschikbare lijst.
3. **Kaart indelen en vastzetten:** de speler kiest items uit de adminpool en bepaalt zelf welk item in welk vakje komt. Na bevestiging bewaart Binga de selectie en indeling.
4. **Starten:** de beheerder start het spel. Vanaf dat moment staan de woordenlijst en de kaarten vast.
5. **Spelen:** de beheerder tikt aan wat langskomt. De server verwerkt de bevestiging en werkt alle betrokken kaarten bij.
6. **Prestaties en punten:** het systeem herkent prestaties, zoals een lijn of volle kaart, en kent automatisch punten toe. Wie dezelfde prestatie eerder haalt, krijgt meer punten. Het spel gaat door zodat iedereen prestaties kan blijven behalen.
7. **Afronden:** de beheerder beëindigt het evenement. Spelers zien hun eindkaart, behaalde prestaties, totaalscore en de eindranglijst.

## 3. Spelregels voor de eerste versie

Live afvinken, het kaartformaat van 4 × 4, zelf kiezen en plaatsen uit de adminpool en punten voor prestaties waarbij eerder behalen meer oplevert zijn vastgesteld. De verdere uitwerking hieronder bevat nog voorstellen.

- Een kaart heeft **4 × 4 vakjes**, zonder vrij middenvak: overzichtelijk op een telefoon en zestien voorspellingen per speler.
- De beheerder biedt meer dan zestien unieke items aan, zodat spelers echt iets te kiezen hebben.
- Een speler kiest zestien verschillende items uit de adminpool en plaatst die zelf op de kaart. De server valideert en bewaart de indeling; opnieuw laden verandert de kaart niet.
- De kaarten worden live afgevinkt zodra de beheerder een item bevestigt. Prestaties leveren punten op; het spel eindigt niet bij de eerste bingo. Een lijn en een volle kaart zijn de beoogde eerste prestaties. Houd de prestatievoorwaarden en puntentoekenning uitbreidbaar.
- Per item telt alleen of het minstens één keer is voorgekomen. Herhalingen leveren geen extra punten op.
- De beheerder is de scheidsrechter. Spelers vinken zelf niets af.
- Deelnemen en wijzigen kan tot de start. Later instromen valt voorlopig buiten de eerste versie.
- Een verkeerde bevestiging kan worden teruggedraaid. Kaarten en uitslagen worden dan opnieuw berekend; spelers zien dat er een correctie is geweest.
- Eén kaart per browsersessie is het uitgangspunt. Zonder accounts is één kaart per persoon niet strikt afdwingbaar.

### Puntensysteem

Iedere speler kan voor dezelfde prestaties punten krijgen. Elke prestatie heeft een eigen puntenregeling: wie haar eerder behaalt, ontvangt meer punten dan wie haar later behaalt. De totaalscore bepaalt de ranglijst binnen het evenement. Ook laat behaalde prestaties blijven punten waard.

Voorstel voor de eerste versie:

- **Eerste lijn:** één volledige rij, kolom of diagonaal. Eenmalig punten per speler voor deze prestatie.
- **Volle kaart:** alle zestien vakjes geraakt. Een afzonderlijke prestatie die boven op de lijnpunten komt.
- **Eerlijk gelijktijdig:** de volgorde van adminbevestigingen bepaalt wanneer een prestatie is behaald. Alle spelers die haar door dezelfde bevestiging halen, krijgen dezelfde punten. Internetsnelheid, het moment waarop de telefoon bijwerkt en een eventuele animatie hebben geen invloed.
- **Automatische toekenning:** de server kent punten toe, ook als een speler tijdelijk offline is. Opnieuw laden of verbinden kent geen dubbele punten toe.
- **Correcties:** bij het terugdraaien van een bevestiging worden prestaties, scores en ranglijst opnieuw berekend vanuit de geldige bevestigingen in hun oorspronkelijke volgorde. Ook eerder toegekende punten kunnen daardoor veranderen.
- **Gelijke eindscore:** spelers delen voorlopig dezelfde positie; er wordt geen willekeurige winnaar aangewezen.

De exacte bedragen en afbouwformule volgen later. Een mogelijke aanpak is een basisbedrag plus een bonus op basis van hoe vroeg de prestatie ten opzichte van andere spelers is behaald. Leg vóór de start de regels vast en toon ze aan deelnemers; pas ze niet tijdens het spel aan. Beslis bij de uitwerking hoe gelijke plaatsen meetellen in de bonus voor latere spelers.

Prestaties blijven losse regels, zodat bijvoorbeeld een tweede lijn, vier hoeken of andere patronen later kunnen worden toegevoegd. Of iedere extra lijn punten krijgt, staat nog open; het voorstel hierboven beloont alleen de eerste lijn.

## 4. Wat de eerste versie moet kunnen

Binga krijgt twee aparte ingangen binnen dezelfde app: een spelersomgeving en een afgeschermde adminomgeving. Beide draaien in dezelfde HAOS-add-on en gebruiken dezelfde spelgegevens. Een presentatiescherm voor een beamer of tv is niet gewenst en valt buiten het plan.

**Aanvulling accounts:** iedereen kan een Binga-account aanmaken. Een account geeft toegang tot de eigen hostomgeving en bewaart gespeelde spellen, punten en een algemene ranking. Meespelen blijft zonder account mogelijk. Een ingelogde speler vindt zijn kaart op een ander apparaat terug; een gast gebruikt de sleutel in zijn browser. Alleen de maker van een evenement mag het starten, afvinken en afsluiten. Accounts en sessies staan samen met de spellen in de SQLite-database onder `/data` van de HAOS-add-on; er is geen afzonderlijke dienst of extra publieke poort nodig.

### Voor de beheerder

Een afgeschermde beheerpagina met evenement aanmaken, woordenlijst invoeren, deelnamelink en QR-code tonen, deelnemersaantal bekijken, starten, items bevestigen of corrigeren en afsluiten. Grote knoppen en een zoekfunctie maken het mogelijk om tijdens een live gebeurtenis snel bij te houden wat er gebeurt.

### Voor de speler

Een mobiele flow met vier schermen: deelnemen, woorden kiezen en plaatsen, bingokaart en eindresultaat. Plaatsen moet ook met tikken kunnen, zodat slepen op een klein scherm niet verplicht is. De eigen kaart blijft beschikbaar na verversen of een korte verbindingsonderbreking op hetzelfde apparaat. Een verbindingsindicator maakt zichtbaar of de kaart actueel is.

Tijdens het spel ziet de speler de eigen score, behaalde prestaties en positie in de evenementranglijst. Bij een prestatie wordt duidelijk hoeveel punten erbij komen. De einduitslag toont ook de opbouw van de score.

### Voor de spelbeleving

Geraakte vakjes krijgen een korte animatie. Bij bijna-bingo neemt de visuele spanning toe; bij bingo volgt een uitbundige viering. Geluid is optioneel en staat standaard uit, zodat het ook tijdens een college bruikbaar is. Minder beweging blijft mogelijk en status is ook zonder kleurverschillen herkenbaar.

## 5. Technische richting

Basis: de lokale **vite-rust-ha-app**-skill. We volgen het patroon React/TypeScript/Vite voor de interface en Rust/Axum voor de server, met spelregels los van interface en HTTP-afhandeling. Binga gaat als **Home Assistant-add-on op de eigen Raspberry Pi met HAOS** draaien. Een desktopversie valt buiten de huidige scope.

Conceptuele verdeling:

**Hosting op de Pi met HAOS is het uitgangspunt.** De add-on bevat de gebouwde frontend en de Rust-backend. Blijvende spelgegevens komen in de datamap van de add-on (`/data`). De containerarchitectuur moet aansluiten op de werkelijke HAOS-installatie op de Pi; die controleren we vóór het bouwen van het image.

Het publieke adres wordt **https://binga.allardnet.nl**. Spelers moeten via dat domein kunnen deelnemen vanaf het thuisnetwerk, andere wifi-netwerken en mobiel internet, zonder een Home Assistant-account. De toegang loopt via **Cloudflare en de bestaande Cloudflared-add-on op HAOS**. Bij implementatie koppelen we het subdomein via die tunnel aan Binga en controleren we HTTPS, bereikbaarheid en live updates. De beheerinterface blijft afgeschermd; eventuele HA-ingress voor beheer kan aanvullend worden ingericht. De precieze installatiegegevens worden tijdens de technische uitwerking onderzocht en zijn geen open vraag voor deze conceptfase.

**Capaciteit:** de eerste versie richt zich op circa twintig gelijktijdige spelers per evenement. Twintig is het verwachte maximum bij normaal gebruik, geen harde deelnemerslimiet. Meer spelers ondersteunen is wenselijk; de praktische ruimte daarboven bepalen we met een capaciteitstest op de Pi.

Voor oplevering volgen we de skill: broncode, containerimage en HA-catalogus krijgen overeenkomende versies. De catalogus verwijst pas naar een nieuwe versie nadat het bijbehorende image is gecontroleerd. Installatie en werking op HAOS worden apart getest.

- **Frontend met React/TypeScript/Vite:** mobiele spelersinterface en beheerinterface. De Rust-server serveert de gebouwde frontend in productie; Vite wordt alleen voor ontwikkeling en bouwen gebruikt.
- **Rust/Axum-server:** evenementen, deelnemers, kaartselecties, bevestigingen en bingocontrole.
- **Permanente opslag:** evenementen, vastgezette kaarten en bevestigingen blijven bewaard bij een herstart. Bij containergebruik staan deze gegevens buiten het image. De serveropslag is leidend; browsercache is alleen een hulpmiddel. Back-up en herstel krijgen bij installatie een concrete werkwijze.
- **Server als bron van waarheid:** de browser toont de stand; de server valideert selecties en bepaalt treffers, prestaties, punten en ranglijst. Prestatieherkenning en puntentoekenning blijven aparte onderdelen van de domeinlogica.
- **Updates:** live bijwerken is onderdeel van de eerste versie, bijvoorbeeld via Server-Sent Events. Periodiek ophalen kan als tijdelijke ontwikkelstap of terugval dienen. Ook na opnieuw verbinden haalt de speler de volledige actuele stand op. De publieke proxy of tunnel moet deze updates correct doorgeven.

De eerste versie toont bevestigingen live. Onthulling achteraf is geen onderdeel van de huidige scope.

De minimale gegevens zijn een evenement met vastgelegde prestatie- en puntenregels, de bijbehorende items, deelnemers met hun kaartindeling en de bevestigingen met volgorde en tijdstip. Behaalde prestaties en scores moeten daaruit reproduceerbaar zijn, inclusief na correcties. Items krijgen een vaste identiteit los van hun tekst. Zo kan later een goedgekeurde woordsuggestie aan dezelfde pool worden toegevoegd zonder de kaartstructuur te vervangen. Beheerhandelingen vereisen authenticatie; een deelnamelink geeft uitsluitend toegang tot het spel als speler.

## 6. Aanpak in kleine stappen

1. **Basis bouwen:** Pi-architectuur en Cloudflared-route onderzoeken en eenvoudige schermschetsen maken volgens de gevonden skill. Begin met een voorlopige, aanpasbare puntenregeling; verfijn de balans tijdens proefspellen.
2. **Complete spelcyclus bouwen:** één evenement voorbereiden, op een telefoon deelnemen, een kaart bewaren, items bevestigen en automatisch prestaties, punten en ranglijst bepalen.
3. **Live gedrag betrouwbaar maken:** meerdere telefoons bijwerken, verbinding herstellen, verkeerde bevestigingen corrigeren en gelijktijdige prestaties eerlijk afhandelen. Test met twintig gelijktijdige spelers en onderzoek met extra gesimuleerde spelers hoeveel ruimte er boven dat richtdoel is.
4. **Binga uitstraling geven:** kleuren, typografie, kaartanimaties, bijna-bingo en winmoment uitwerken.
5. **Op HAOS testen en proefspel organiseren:** de add-on op de Pi installeren, opslag na herstart en toegang via binga.allardnet.nl vanaf wifi en mobiel internet controleren, en met een kleine groep een korte speech of video volgen. Controleren of selectie, plaatsing, beheer en bingo zonder uitleg begrijpelijk zijn.

De eerste versie is geslaagd als een beheerder zelfstandig een spel kan organiseren, twintig gelijktijdige spelers via het publieke domein dezelfde bevestigingen live kunnen verwerken, een speler na verversen dezelfde kaart en score terugkrijgt en prestaties en punten consequent volgens de gekozen regels worden toegekend. Gelijktijdige prestaties moeten gelijke punten opleveren en correcties moeten tot een consistente nieuwe ranglijst leiden.

## 7. Bewust bewaren voor later

**Eigen woordsuggesties met goedkeuring:** spelers kunnen later zelf woorden typen, waarna de beheerder ze accepteert, afwijst of samenvoegt met een bestaand item. Goedgekeurde woorden komen in de gedeelde pool. Dit is technisch realistisch. Vaste item-identiteiten en een aparte selectiestap maken uitbreiding overzichtelijk, maar de moderatie-interface en regels rond dubbele woorden en de startdeadline vragen dan nog uitwerking. Voorlopig kiezen spelers uitsluitend uit de vooraf klaargezette adminpool.

Ook voor later: extra spelmodi, herbruikbare themalijsten, meerdere beheerders, publieke evenementen, accounts, ranglijsten over meerdere spellen, andere kaartformaten en automatische spraakherkenning. Geen van deze functies is nodig om het basisidee te testen.

## 8. Concept afgerond, details volgen tijdens ontwikkeling

Vastgesteld: live afvinken, 4 × 4 vakjes, zelf kiezen en plaatsen uit de adminpool, punten voor prestaties met een voordeel voor eerder behalen, een aparte spelers- en adminomgeving zonder presentatiescherm, en hosting als add-on op de Pi met HAOS. Binga wordt via **binga.allardnet.nl**, Cloudflare en de Cloudflared-add-on bereikbaar vanaf alle netwerken. Het richtdoel is twintig gelijktijdige spelers, met liefst ruimte voor meer.

- **Puntenbalans:** bedragen, afbouw en eventuele extra prestaties worden tijdens ontwikkeling en proefspellen aangescherpt.
- **Capaciteit boven twintig spelers:** meten tijdens de capaciteitstest, zonder nu een hoger maximum te beloven.
- **Installatie:** technische gegevens en tunnelconfiguratie onderzoeken bij het bouwen en installeren van de add-on.

Voor dit vroege stadium zijn er geen verdere vragen nodig. De bovenstaande ontwikkelpunten blokkeren het concept niet.
