# VOXEL RAGE — Janitscharen

**▶ Play in the browser: [xiondigital.net/voxelrage](https://xiondigital.net/voxelrage/)**

This is the web-hosting fork of [player529/Jannitschar](https://github.com/player529/Jannitschar).
Pushing to `main` builds the static web edition and deploys it to GitHub Pages
(`.github/workflows/pages.yml`), so the live page is always the build from the
tip of `main` — same setup as Leap Buddies and KankaKombat. Sync this fork with
upstream to pick up new game versions.

**Online on the web build:** GitHub Pages can't run the game's Node WebSocket
relay, so `web/net.js` swaps the `/ws` socket for a Supabase Realtime broadcast
transport built exactly like Leap Buddies' (public anon key only, isolated
`voxelrage-v1-` rooms, nothing stored): 4-letter room codes, host-authoritative, two players — the host tab
stays open and runs the simulation. Solo and local co-op need no network at
all. From a local checkout, `node server.js` remains the original way to play
online on your own network. Details in `web/README.md`.

---

# VOXEL RAGE — Janitscharen

Voxel-Beat-'em-up im osmanischen Istanbul. Alles besteht aus Würfeln: Figuren, Straßen,
Häuser, Partikel. Kein Build, kein npm — Three.js r160 liegt lokal in `vendor/`.

## Starten

```bash
node server.js                # http://127.0.0.1:8123 (nur dieser Rechner)
node server.js 9000           # anderer Port
node server.js 8123 0.0.0.0   # im WLAN erreichbar (siehe unten)
```

`node` muss installiert sein (getestet mit Node 26). Der Server liefert die Dateien aus und
spricht WebSocket für den Online-Koop. Ein reiner Statik-Server (z. B. `python -m http.server`)
reicht für Solo/Koop lokal, aber **nicht** für Online.

## Mit Freunden spielen

Für Online-Koop brauchen **beide** dieselbe Server-Adresse im Browser — es reicht nicht,
`index.html` zu verschicken, denn der Server vermittelt die Verbindung.

**Im selben WLAN**

1. Auf dem Host-Rechner `node server.js 8123 0.0.0.0` starten (oder `HOST=0.0.0.0 node server.js`).
   Der Start zeigt die WLAN-Adresse an, z. B. `http://192.168.1.183:8123`.
2. Die Firewall fragt beim ersten Start: **Node.js** für **private Netzwerke** zulassen.
3. Freunde öffnen diese Adresse, wählen **Online**, tragen den 4-stelligen Code ein und klicken
   **Beitreten**. Der Host klickt **Raum erstellen (Host)**, gibt den Code weiter und startet
   mit **Schlacht beginnen**.
4. Server und Host müssen während der ganzen Runde laufen: Der Host rechnet die Simulation,
   der Gast sendet nur Eingaben.

**Über das Internet** (ohne Portfreigabe)

1. `winget install Cloudflare.cloudflared` (einmalig).
2. `cloudflared tunnel --url http://localhost:8123` starten und die ausgegebene
   `https://…trycloudflare.com`-Adresse plus Raumcode an die Freunde schicken.
3. Tunnel und `node server.js` laufen lassen, solange gespielt wird; die Adresse ändert sich
   bei jedem Tunnel-Neustart. Alternativ `server.js` auf einen Node-Server mit WebSocket legen.

Online-Koop ist für **zwei** Spieler ausgelegt (Host + Gast) und host-authoritativ.

## Modi

Beim Start: Namen eintragen (frei, max. 14 Zeichen), Modus wählen.

* **Solo** — ein Janitschar; K.O. bedeutet Game Over, `R` startet neu.
* **Koop lokal** — zwei Spieler an einer Tastatur, gemeinsame Kamera.
* **Online** — Host erstellt einen Raum und bekommt einen 4-stelligen Code; der Gast trägt den
  Code ein und tritt bei. Der Host startet die Schlacht, beide spielen denselben Run.
  Host rechnet die Simulation, der Gast sendet nur Eingaben und rendert die Snapshots.

## Schwierigkeit

Vor dem Start wählbar; im Online-Koop gilt die Wahl des Hosts.

| | Leicht | Normal | Hart | Albtraum |
|---|---|---|---|---|
| Gegner pro Abschnitt | 14–18 | 18–24 | 24–32 | 28–32 |
| Beute pro Abschnitt | 7 | 5 | 4 | 3 |
| Gegner-HP | 85 % | 100 % | 120 % | 135 % |
| Gegner-Schaden | 75 % | 100 % | 125 % | 145 % |
| Nachschub ab | 4 Gegnern | 5 Gegnern | 6 Gegnern | 8 Gegnern |
| Drop-Chance (Gegner / Requisiten) | 22 % / 35 % | 14 % / 22 % | 9 % / 12 % | 6 % / 7 % |

Die gewählte Stufe steht im HUD unter der Wellenanzeige. Mehr Gegner bedeuten auch mehr
Nachschub: Trupps von 3–6 Gegnern rücken nach, sobald der Abschnitt fast geräumt ist.

**Albtraum** markiert jeden dritten Spawn als **Elite**: goldene Bodenaura, Schulterplatten
und Krone, 70 % mehr Leben, 30 % mehr Schaden, 8 % mehr Tempo, doppelte Punkte und eine
höhere Beutechance. In jeder Bosswelle stehen zusätzlich **drei Elite-Wachen** – Garde,
Schildträger und Janitschar – um den Boss; das Ziel lautet dann **BOSS + WACHE BESIEGEN**.
Der Boss selbst bleibt ein Boss und wird nicht zur Elite.

## Steuerung

| | Spieler 1 | Spieler 2 |
|---|---|---|
| Laufen / Tiefe | `A`/`D`, `W`/`S` | `←`/`→`, `↑`/`↓` |
| Schlag / Waffe / **Item aufnehmen** | `J` | `,` |
| Kick | `K` | `.` |
| Spezial (Osmanische Schelle) | `L` | `/` |
| Sprung / Esel-Hüpfen | `Space` | `Enter` |
| Rennen (halten) | `Shift` | `Rechts-Shift` |
| Greifen / Kette (Wurf) | `G` | `;` |
| Esel auf-/absteigen | `E` | `'` |

**Tasten frei belegen:** Im Startmenü unter **Steuerung → Tasten belegen** lässt sich jede
Aktion beider Spieler neu zuweisen. Ein Klick auf die Taste, dann die gewünschte Taste
drücken; eine bereits belegte Taste wird **getauscht**, nicht doppelt vergeben. `ESC` bricht
ab, **Standard wiederherstellen** setzt alles zurück. Die Belegung wird lokal im Browser
gespeichert (`voxel-rage-bindings-v1`) und im Online-Koop mit dem Host synchronisiert –
der Gast schickt seine Belegung beim Beitreten und bei jeder Änderung. `P`, `M`, `R`, `ESC`
und Funktionstasten bleiben für Pause, Musik, Neustart und Browser reserviert. Die Tabelle
oben zeigt die Standardbelegung; alle Hinweise im Spiel (Fußzeile, Greif-Schilder,
Beute-Prompts, Esel-Schild, HUD) übernehmen die geänderten Tasten.

`M` Musik an/aus · `R` Neustart. Rennen geht auch automatisch nach 0,85 s Laufen.
**Pause:** `ESC` oder `P` friert Simulation, Snapshots und Musik ein und blendet
das Pause-Overlay ein; erneut `ESC`/`P` oder ein Klick setzt fort. `R` startet aus der
Pause heraus neu. Während `SIEG`/`GAME OVER` und im Startmenü ist Pause gesperrt.
Im Online-Koop pausiert der Host für beide; ein Pausieren des Gasts wird an den Host
weitergereicht. Ist `ESC` im Browser belegt (z. B. Vollbild), funktioniert `P` genauso.
Der **Bordstein ist begehbar**: Mit `W`/`S` (P2 `↑`/`↓`) steigt man auf den Gehweg, die
Figuren stehen dort 0,3 Einheiten höher und die Kamera folgt in die Tiefe. Parkende Autos
blockieren die Kante; zwischen den Autos kommt man weiter.
In der Luft + Schlag = **Sprungangriff** (Divekick mit Schockwelle bei der Landung).
**Kombos:** Mit freien Händen baut die Schlag-Taste eine **5er-Schlagkette** auf, die
Tritt-Taste eine **3er-Trittkette**. Jede Stufe ist eine eigene Technik mit eigener
Silhouette, Reichweite und Wucht – nicht nur ein weiterer Winkel:

| Stufe | Schlag | Schaden | Reichweite | Bewegung |
|---|---|---|---|---|
| 1 | **Links-Jab** | 8 | 1,95 | kurze Kammer, schnurgerade aus der Schulter, Deckung oben |
| 2 | **Rechts-Cross** | 9 | 2,05 | Hüfte und Ferse drehen mit, kurzer Schritt nach vorn |
| 3 | **Uppercut** | 11 | 1,90 | erst in die Knie, dann Faust von unten vors Kinn |
| 4 | **Kopfnuss** | 12 | 1,75 | Fäuste zur Deckung, Kopf und Körper stoßen nach vorn |
| 5 | **Kleine Schelle** | 25 | 2,20 | Handkante holt auf der Fernseite aus und fegt kameranah durch |

| Stufe | Tritt | Schaden | Reichweite | Bewegung |
|---|---|---|---|---|
| 1 | **Lowkick** | 13 | 2,25 | flacher Hüftschwung, Fuß bleibt knapp über dem Boden |
| 2 | **Highkick** | 17 | 2,65 | Standbein streckt durch, Fuß steigt bis Kopfhöhe |
| 3 | **Roundhouse** | 30 | 3,00 | Hüfte holt weit aus, gestreckter Fuß fegt im Bogen durch |

Jab, Cross, Uppercut und Schelle haben eigene Armkurven und Faustspuren;
die Kopfnuss setzt einen kurzen Schritt in den Gegner. Der Finisher (5. Schlag bzw.
3. Tritt) hat eigenen Ring, Bildschirmblitz und Kamera-Schub; die Schelle bekommt dazu
einen Klatsch-Sound. Die Kette bleibt 0,55 s nach dem Angriff offen, bricht bei einem
Treffer am Spieler und wird von Waffen unterbrochen.
**Greifen & Werfen:** `G` packt einen Gegner in Reichweite direkt am Kragen – weiter
entfernte Ziele zieht die **Kette** heran. Im Griff bleibt der Gegner vorn, der Spieler
kann langsam mit ihm laufen und sich mit `A`/`D` drehen; `J` wirft ihn nach vorn. Bosse
lassen sich nicht halten, nehmen aber Kettenschaden.
Die **Osmanische Schelle** (`L`) ist der Spezialangriff: eine riesige offene Hand fährt aus
dem Ärmel, holt aus und zieht im breiten Halbkreis durch. Jeder Getroffene bekommt einen
roten **Handabdruck**, über dem Treffer steht **„ŞAK!“**, dazu gibt es Handspur, Schockwellen,
Zeitlupe und einen satten Klatsch-Sound. Sie trifft mehrere Gegner gleichzeitig, schleudert
sie weg, zerbricht Requisiten und lässt die Kamera erzittern. Die Leiste unter der
Lebensanzeige füllt sich durch Treffer; ist sie voll, zeigt das HUD **„L — SCHELLE BEREIT“**.

## Inhalt

* **10 Map-Runden** (Distrikte) mit je **3 Abschnitten = 30 Wellen**. Eine Runde ist eine
  durchgehende Straße von ~340 Einheiten: erst laufen, dann kämpfen, Zwischentor, weiterlaufen.
  Jeder Abschnitt hat 18–24 Gegner (Leicht 14–18, Hart 24–32, Albtraum 28–32; erste Gruppe + Nachschub),
  der Abschnitt endet erst, wenn alle Gegner liegen und das Tor aufgeht. Am Ende von Abschnitt 3 wartet der Boss; nach ihm
  öffnet sich das Exit-Tor am Straßenende und die nächste Map-Runde startet.
* **Bodenzustand im Koop:** Bei 0 HP ist man nicht sofort K.O., sondern liegt **12 s** am
  Boden. Der Partner muss nur in Reichweite (2,1) bleiben: Der goldene Rettungsbalken im HUD
  füllt sich in 1,7 s, danach steht man mit 60 HP und 2 s Unverwundbarkeit wieder auf —
  **ohne ein Leben zu verlieren**. Läuft die Zeit ab (oder ist der Partner selbst draußen),
  wird wie gewohnt ein Leben verbraucht. Liegende sind für Gegner kein Ziel, können nicht
  angreifen und nicht laufen; der HUD-Text zählt die Restzeit („HILFE 8s“), dann den
  Fortschritt („RETTEN 64%“). Solo gibt es keinen Bodenzustand — dort kostet 0 HP sofort ein Leben.
* **Gemeinsame Kamera im Koop:** Die Kamera folgt dem Mittelpunkt beider Spieler und zieht
  über die echte Projektion so weit zurück, bis Füße und Kopf beider Figuren mit Rand im
  Bild liegen — auch im Hochformat. Damit niemand hinauslaufen kann, hält eine Leine die
  beiden auf höchstens **16 Einheiten** zusammen: Wer vorausläuft, wird an dieser Grenze
  gestoppt, der Hinweis „ZU WEIT WEG · BLEIB BEIM PARTNER“ erscheint (höchstens alle 3,5 s).
  Gebremst wird der Spieler, der sich in diesem Frame bewegt hat; der andere bleibt stehen.
  Wer reitet, zieht seinen Esel mit. Solo bleibt die Kamera wie gehabt.
* **3 Leben pro Spieler:** Ein K.O. kostet ein Leben; nach 6 s steigt man wieder ein — im
  Koop neben dem Partner, allein an der Todesstelle (2,4 s Unverwundbarkeit). Bei 0 Leben
  scheidet der Spieler aus und bleibt draußen; im Koop spielt der andere weiter, erst wenn
  beide ausgeschieden sind, kommt **GAME OVER**.
* **Getrennte Punkte:** Jeder Spieler sammelt seine **eigenen Punkte** – Kills zählen für den,
  der den Treffer gesetzt hat, Gold für den, der es aufnimmt. Im Koop stehen im HUD zwei
  Zeilen untereinander: **P1** in Gold, **P2** in Blau, jeweils mit eigenem Fortschritt bis
  zum nächsten Extraleben. Alle **2000 eigenen Punkte** gibt es ein Extraleben (bis 9) für
  genau diesen Spieler; ausgeschiedene Spieler werden dadurch nicht zurückgeholt. Die Leben
  stehen als **♥ n** unter dem Spielernamen. Solo zeigt das HUD nur die P1-Zeile.
  Der Distrikt-Bonus (+500) geht an beide Spieler, da beide die Straße geräumt haben.
* **10 Gegnertypen** mit eigenen Werten und Requisiten: Punk, Runner (Dash), Brute, Garde (blockt),
  Messer, Schütze (Fernkampf), Bomber (explodiert beim K.O.), Schildträger, Ninja, Janitschar.
  Alle Gegner **holen sichtbar aus und schlagen durch**: Der Schlagarm zieht nach hinten, der
  Oberkörper dreht weg, die Waffe glimmt in der Typfarbe auf, der Durchzug zieht eine leuchtende
  Spur, und am Trefferpunkt sitzen Blitz, Ring und Staub. Waffen und Schilde hängen an beiden
  Armen — sichtbar ist immer die kameranahe Kopie, damit der Schlag in jeder Laufrichtung lesbar
  bleibt. Fernkämpfer haben statt des Schwungs einen kurzen Rückstoß.
* **Eigene Angriffsstile:** Jeder Gegnertyp hat seine eigene Schlagkurve statt einer
  gemeinsamen. Punk/Bomber schwingen weit aus (0,52 s Ausholen), Messer/Ninja stechen schmal
  mit Ausfallschritt zu (0,34 s, enges Trefferfeld), Garde/Schildträger rammen den Schild vor
  (0,46 s, hoher Rückstoß), Brute/Janitschar holen mit beiden Fäusten über den Kopf aus
  (0,66 s), der Runner springt auf die Spielerposition und trifft im Umkreis von 1,45
  (0,5 s), und der Schütze feuert auch auf Tuchfühlung statt zu prügeln. Trefferfenster,
  Reichweite und Rückstoß hängen am Stil; Bosse nutzen den Stil ihres Typs mit 20 % kürzerem
  Ausholen.
* **Lebensbalken:** Nach dem ersten Treffer erscheint über dem Gegnerkopf ein kleiner Balken
  (drei Viertel-Kerben, goldener Rahmen). Er füllt sich proportional zu den Rest-HP und
  wechselt die Farbe: grün über 60 %, gelb über 30 %, darunter rot; jeder Treffer blitzt weiß
  auf. Ungeschädigte Gegner zeigen keinen Balken, Bosse nutzen weiterhin die große HUD-Leiste
  am oberen Rand.
* **Schadenszahlen:** Jeder Treffer zeigt die exakte Zahl über dem Gegnerkopf. Sie steigt
  auf, ploppt kurz auf und blendet aus; die Farbe sagt, wie schwer der Treffer war —
  creme (unter 15), gold (ab 15), orange (ab 30), rot (ab 50, also Finisher, Schelle,
  Bazooka). Die Textur wird pro Zahl zwischengespeichert, maximal 48 Zahlen gleichzeitig;
  im Online-Koop schickt der Host die Treffer im Snapshot mit, damit der Gast dieselben
  Zahlen sieht.
* **10 Bosse**, einer pro Distrikt, immer am Ende der dritten Welle. Eigene Namen, Werte,
  Farben und ein Schockwellen-Slam: Der Boss reißt beide Fäuste hoch, ein Warnring auf dem
  Boden wächst bis zur Trefferreichweite, dann kracht der Einschlag mit Schockwellen, Staub
  und Bildschirmwackeln herunter — wer aus dem Ring läuft, entkommt.
* **Items:** Döner (+40 Leben), Ayran (+15), Gold (+50 Punkte). Pro Abschnitt liegen je nach
  Schwierigkeit nur 4–7 Objekte in der Laufgasse (mindestens eine Waffe, ein Döner, ein Ayran
  und Gold); die Objekte sind kompakt (halbe Modell- und Textgröße), haben einen Leuchtring,
  eine Lichtsäule und ein Namensschild (z. B. „DÖNER“). In Reichweite erscheint zusätzlich
  **„J / , · NEHMEN“** – aber nur am nächstgelegenen Item, damit sich bei einem Beute-Cluster
  keine Schilder überlappen; aufgenommen wird zu Fuß mit der Schlag-Taste (`J`, P2 `,`), nicht
  mehr durch bloßes Darüberlaufen. Gegner und zerbrechliche Fässer/Kisten lassen nur noch selten Beute
  fallen (siehe Schwierigkeit).
* **Zerstörbare Straße:** Autos, Straßenlaternen, Bänke, Mülltonnen, Hydranten, Pylonen,
  Fässer und Kisten nehmen Schaden. Kleine Requisiten fallen mit einem Treffer, Laternen und
  Bänke brauchen zwei, Autos vier Treffer (schwere Schläge zählen doppelt, die Osmanische
  Schelle zerstört sofort). Autos explodieren, verletzen Gegner im Umkreis und lassen ein
  ausgebranntes Wrack mit glimmender Motorhaube zurück; die Kollision verschwindet mit dem
  Auto. Danach heult für 3,6 s die **Autoalarmanlage**: rot/blaue Warnlichter mit
  Lichtsäulen am Wrack, Zweiklang und Bodenwellen alle 0,6 s. Gegner im Umkreis von
  13 Einheiten lassen den Spieler stehen und laufen zum Wrack (1,45× Tempo) – auch Bosse.
  Der Alarm ist eine taktische Ablenkung, bevor die Meute zurückkehrt. Zusätzlich ruft er
  eine **kleine Verstärkungswelle** herbei: drei Gegner (auf Bosswellen zwei) erscheinen
  links und rechts vom Wrack auf der Fahrbahn, mit rot/blauen Ringen und dem Banner
  „ALARM · VERSTÄRKUNG“. Sie zählen zum Abschnitt und müssen ebenfalls besiegt werden.
  Pro Abschnitt gibt es höchstens zwei solche Trupps im Abstand von 14 s; nach dem Räumen
  oder zwischen zwei Abschnitten kommt keine Verstärkung. Laternen erlöschen
  mit Funken und Glas und hinterlassen einen abgeknickten Mast,
  Bänke zerbrechen zu Brettern auf dem Gehweg. Requisiten in Reichweite lassen gelegentlich
  Beute fallen (Chance je Schwierigkeitsstufe).
* **Schadensstufen:** Autos zeigen nach jedem der drei nicht tödlichen Treffer mehr Risse,
  Ruß und Rauch; ab dem zweiten hängt die Stoßstange, beim letzten steht die Haube offen
  und die Kabine sitzt schief. Laternen bekommen Glasrisse, verlieren Helligkeit und
  flackern, Bänke splittern, kippen leicht und stauben. Die Stufen bleiben bis zum
  Zerbrechen sichtbar und verschwinden mit dem Requisit.
* **Waffen** mit Munition bzw. Haltbarkeit, mit der Schlag-Taste (`J` / P2 `,`) aufgenommen:
  Pistole, Gewehr (durchschlagend), Bazooka (Flächenschaden), Baseballschläger, Schlagring,
  Kusarigama. Die Waffe liegt als eigenes Modell mit Namen in der Straße und wird nach dem
  Aufsammeln **sichtbar in der Hand getragen**. Schusswaffen feuern bei gehaltener `J`-Taste
  Dauerfeuer mit Mündungsfeuer, Leuchtspur und Kamera-Rückstoß; die Mündung sitzt am Lauf.
* **Greifen & Werfen:** `G` (P2 `;`) packt den nächsten Gegner. Steht er näher als 2,4
  Einheiten, greifen beide Hände direkt am Kragen; weiter weg (bis 12,5) zieht die sichtbare
  Kette ihn heran. Ein Zielring und ein „G · GRIFF“-Schild markieren das Ziel. Im Griff hängt
  der Gegner vorn am Spieler, kann nicht zuschlagen und wird im Schritttempo mitgezogen;
  `A`/`D` dreht den Griff, der Gegner wandert mit. Nach 2,6 s reißt er sich los.
  `J` (P2 `,`) wirft ihn: 34 Schaden beim Abwurf, danach fliegt er im Bogen, trifft unterwegs
  andere Gegner (22) und Requisiten und schlägt mit einer kleinen Druckwelle auf (12).
* **Esel pro Map:** Am Anfang jeder Map-Runde steht ein Esel mit Schild **„E / ' · REITEN“**.
  Mit `E` (P2 `'`) steigt man auf und reitet deutlich schneller (`Shift` = Galopp). Im Sattel
  löst `Space` (P2 `Enter`) einen **Hüpfer** aus: Der Esel zieht die Beine an, springt hoch
  und lässt sich in der Luft weiter lenken; wer vorher läuft, springt ein Stück nach vorn.
  Die Landung wirft Staub auf und schüttelt kurz die Kamera. Im Sattel kämpft der Esel
  eigenständig: `J` (P2 `,`) ist ein **Fronttritt** mit beiden Vorderbeinen (18 Schaden,
  kurze Reichweite, schneller Tritt), `K` (P2 `.`) ein **Drehtritt**, bei dem die
  Hinterhand herumfährt und auch Gegner hinter dem Reiter trifft (24 Schaden, 2,9
  Einheiten rundum). Beide Tritte bauen Energie auf (6 bzw. 9), laden also den Balken.
  Bei **vollem Balken** löst `L` (P2 `/`) den **Superkick** aus: Hinterhand zum Ziel,
  beide Hinterbeine geschlossen – 46 Schaden, breite Trefferzone, starkes Wegschleudern,
  Treffer an Requisiten, zwei Huff-Einschläge und ein „SUPERKICK“-Banner; der Balken
  wird dabei geleert. Ist er noch nicht voll, passiert bei `L` nichts. Waffen, Osmanische
  Schelle und Kette ruhen im Sattel. Jeder Treffer am Reiter wirft ihn herunter; der Esel
  galoppiert dann in die Gegenrichtung davon und ist für diese Map weg.
  Freiwillig absteigen (`E`) lässt den Esel stehen, sodass man wieder aufsteigen kann.
* **Musik:** pro Distrikt ein eigener synthetischer Track (Skala, Tempo, Basslinie), für
  Bosskämpfe ein schnellerer Moll-Track. Wird im Browser live erzeugt, keine Audiodateien.

## Architektur

| Datei | Inhalt |
|---|---|
| `index.html` | HUD, Startmenü, Online-Panel, komplettes CSS |
| `game.js` | Three.js-Szene, Figuren-Fabrik, Kampf, Wellen, Items, Netcode, Menü |
| `content.js` | Daten: Distrikte, Gegner, Bosse, Waffen, Items, 30 Wellen, Musik-Sequencer |
| `server.js` | statischer Server + WebSocket-Relay (ohne Abhängigkeiten) |
| `vendor/three.module.js` | Three.js r160 (MIT) |

`window.__voxel` ist ein Entwicklungs-Handle (Spieler, Gegner, `step()`, `startWave()`,
`give()`, Net-Status), das beim Debuggen hilft.

## Grenzen

* Online-Koop ist Host-authoritativ und für zwei Spieler gedacht; der Gast interpoliert die
  Host-Positionen (~10 Snapshots/s), es gibt keine Vorhersage und keine Lobby-Liste.
  Der Esel wird als einzelner Snapshot mit Position, Zustand, Trittzeiten (Superkick,
  Front-, Drehtritt) und Hüpfhöhe
  übertragen; die Drehung von Superkick und Drehtritt leiten beide Seiten aus der
  jeweiligen Trittzeit ab.
  Auf- und Absteigen läuft über die normale Aktionsnachricht des Gasts.
* Die Schlagposen der Gegner sind eine gemeinsame prozedurale Kurve (Ausholen/Durchziehen);
  die Typen unterscheiden sich über Waffe, Farbe und Tempo, nicht über eigene Animationen.
  Bosse teilen Schaden nur über den Slam und den normalen Schlag aus.
* Kein Gamepad, keine Persistenz, keine Continues — nur Respawn nach 6 s im Koop.
* Die Distrikte sind prozedural gebaute Varianten derselben Straße (eigenes Wahrzeichen,
  Farben, Requisiten) — keine 10 handmodellierten Level.
* Der Esel ist pro Map auf einen Versuch ausgelegt: nach einem Sturz ist er weg. Das
  Reiten wurde solo und im lokalen Koop getestet, nicht mit zwei echten Online-Clients.
* Musik und Sounds sind synthetisch; es gibt keinen Soundtrack als Datei.
