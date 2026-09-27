# Binga als lokale HAOS-add-on

Deze map bevat de bron voor een installeerbare lokale Home Assistant-add-on. Maak vanuit de projectroot eerst de zelf-contained bundel:

```sh
npm run ha:package
```

De uitvoer staat in `build-artifacts/home-assistant-repository/`. De map `binga` daarin bevat alle broncode die Supervisor nodig heeft om het image op de Pi te bouwen. `repository.yaml` is alvast aanwezig voor eventueel later publiceren als catalogus.

## Installeren op de Pi

1. Kopieer de gegenereerde map `build-artifacts/home-assistant-repository/binga` naar `/addons/binga` op HAOS, bijvoorbeeld met de Studio Code Server- of Samba-add-on.
2. Open **Instellingen → Add-ons → Add-onwinkel** en kies rechtsboven **Controleren op updates**. Onder *Lokale add-ons* verschijnt Binga.
3. Installeer Binga. De eerste build op de Pi kan enige tijd duren doordat Node en Rust compileren.
4. Start de add-on en controleer de logs. Open daarna de webinterface op de voorgestelde hostpoort 8098.
5. Maak via `/login` een account om zelf spellen te hosten. Spelers hebben geen account nodig.

De huidige configuratie ondersteunt `aarch64`, passend bij een moderne 64-bits Raspberry Pi-installatie. Controleer vóór installatie in **Instellingen → Systeem → Reparaties → Systeeminformatie** dat de architectuur `aarch64` is. Voeg geen andere architectuur toe zonder die build ook te testen.

## Cloudflared

Voeg aan de bestaande lokale Cloudflared-configuratie de entry uit `cloudflared.example.yaml` toe. Vervang `HAOS_LAN_IP` door het vaste lokale IP van de Pi:

```yaml
additional_hosts:
  - hostname: binga.allardnet.nl
    service: http://HAOS_LAN_IP:8098
```

Bewaar overige Cloudflared-instellingen en bestaande hosts. Start Cloudflared daarna opnieuw. Bij een remote tunnel voer je deze hostname-servicekoppeling in het Cloudflare Zero Trust-dashboard in; lokale add-onopties worden dan genegeerd.

De publieke verbinding eindigt bij Cloudflare op HTTPS en loopt lokaal via HTTP naar poort 8098. Server-Sent Events gebruiken een langlopende HTTP-verbinding; controleer daarom een echte live update vanaf mobiel internet.

## Data en herstel

De SQLite-database `/data/binga.sqlite` bevat ook accounts en sessies. `backup: cold` laat Supervisor Binga stoppen voor een back-up, zodat de database en eventuele WAL-bestanden consistent samen worden meegenomen. Controleer herstel met een testevenement voordat een toekomstige versie het opslagschema wijzigt.

De browsersleutel van een gastspeler staat alleen in de eigen browser. Een HA-back-up bewaart de kaart wel, maar herstelt verwijderde browseropslag niet. Accountspelers vinden hun kaart terug door opnieuw in te loggen.

## Releaseketen

De broncode staat in [Allardo24/binga](https://github.com/Allardo24/binga). Een gewone push voert GitHub CI uit. Een versietag start de aparte ARM64-imageworkflow; `publiceer-ha.bat` controleert daarna of dat image anoniem te downloaden is en publiceert pas dan `repository.yaml` en `binga/` als HA-catalogus in dezelfde repository. Tot de eerste geslaagde release blijft de lokale add-onbundel hierboven de installatieroute.

Officiële referenties: [Home Assistant appconfiguratie](https://developers.home-assistant.io/docs/apps/configuration/) en [lokale app-tests](https://developers.home-assistant.io/docs/apps/testing/).
