# Binga op Home Assistant OS

Na installatie opent **Webinterface openen** Binga via de lokale poort. De publieke route wordt afzonderlijk door Cloudflared verzorgd.

## Accounts

Maak via `/login` een Binga-account om spellen te maken en te hosten. Iedereen mag een account aanmaken; er is geen algemeen beheerderswachtwoord. Deelnemers kunnen zonder Binga- of Home Assistant-account meespelen.

Wachtwoordherstel via e-mail is nog niet beschikbaar. Bewaar de inloggegevens goed.

## Gegevens

Accounts, sessies, evenementen, kaarten en bevestigingen staan in `/data/binga.sqlite`. Binga gebruikt een koude Home Assistant-back-up: Supervisor stopt de app tijdens de back-up zodat SQLite en eventuele WAL-bestanden samen consistent worden opgeslagen.

Een accountsessie vervalt na dertig dagen en blijft geldig na een herstart. Een accountkaart is na inloggen op een ander apparaat terug te vinden. Voor gasten staat de sleutel waarmee ze hun kaart terugvinden alleen in hun browser; verwijderde browseropslag kan niet vanuit Binga worden hersteld.

## Cloudflared

Stel in de bestaande Cloudflared-add-on onder `additional_hosts` het volgende in. Vervang `HAOS_LAN_IP` door het lokale IP-adres van de Home Assistant-Pi:

```yaml
additional_hosts:
  - hostname: binga.allardnet.nl
    service: http://HAOS_LAN_IP:8098
```

Behoud de bestaande `external_hostname`, `tunnel_name` en overige Cloudflared-instellingen. Start Cloudflared na de wijziging opnieuw. De add-on maakt voor een lokale tunnel doorgaans zelf het DNS-record aan. Bij een remote tunnel configureer je dezelfde hostname en service in het Cloudflare Zero Trust-dashboard.

Controleer daarna vanaf wifi en mobiele data:

- `https://binga.allardnet.nl/api/health` geeft `ok: true`;
- de startpagina, `/login` en `/host` laden via HTTPS;
- een open spelerskaart krijgt een beheerdersvinkje direct binnen;
- na kort offline gaan haalt de spelerskaart de actuele stand opnieuw op.

Zet geen Cloudflare Access-login voor het hele Binga-domein als deelnemers zonder account moeten kunnen meedoen. Binga controleert de accountsessie en spelmaker bij elke hostactie.
