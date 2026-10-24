/* i18n.js — DE/EN language toggle for VOXEL RAGE, modeled on Leap
 * Buddies' language switcher (a clickable DE | EN control, choice
 * persisted, every UI string swapped). The game itself is German
 * and its code is upstream's, so instead of patching hundreds of
 * string literals, this module translates the DOM: a dictionary of
 * exact strings plus pattern rules for strings with values baked
 * in, applied to every text node at load and kept applied by a
 * MutationObserver (the game writes German into the HUD/menus at
 * runtime; the observer re-translates those writes while English
 * is active and remembers the German originals so switching back
 * is exact). Canvas-drawn text is unaffected (the game only draws
 * a language-neutral hit effect and item labels there).
 * Default language is German (the game's own); the choice persists
 * in localStorage ('voxelrage-lang'). */
(function (global) {
  'use strict';

  var DICT = {
    /* menu / panels / static UI */
    'Mannschaft': 'Team',
    'Steuerung': 'Controls',
    'Beute': 'Loot',
    'Modus': 'Mode',
    'Schwierigkeit': 'Difficulty',
    'Spieler 1': 'Player 1',
    'Spieler 2': 'Player 2',
    'Spieler 1 — Name': 'Player 1 — name',
    'Spieler 2 — Name': 'Player 2 — name',
    'Solo': 'Solo',
    'Koop lokal': 'Local co-op',
    'Online': 'Online',
    'Online-Koop': 'Online co-op',
    'Raum erstellen (Host)': 'Create room (Host)',
    'Beitreten': 'Join',
    'Schlacht beginnen': 'Start battle',
    'Tasten belegen': 'Remap keys',
    'Belegen schließen': 'Close remapping',
    'Standard wiederherstellen': 'Restore defaults',
    'Lokal gespeichert – vor dem Start frei änderbar.': 'Saved locally – can be changed freely before the start.',
    'Musik an/aus ·': 'Music on/off ·',
    'neu starten.': 'restart.',
    'Host startet das Spiel, der Gast kommt in denselben Run.': 'The host starts the game, the guest joins the same run.',
    'Host erstellt einen Raum, Gast tritt mit dem 4-stelligen Code bei.': 'The host creates a room, the guest joins with the 4-letter code.',
    'OSMANISCHES REICH · 1638 · 30 WELLEN': 'OTTOMAN EMPIRE · 1638 · 30 WAVES',
    'VOXEL RAGE — Janitscharen': 'VOXEL RAGE — Janissaries',
    '— KONSTANTINOPEL —': '— CONSTANTINOPLE —',
    'KONSTANTINOPEL': 'CONSTANTINOPLE',
    'PAUSE': 'PAUSE',
    'BOSS': 'BOSS',
    'HITS': 'HITS',
    'NÄCHSTES LEBEN': 'NEXT LIFE',
    'LEBEN': 'LIFE',
    'EXTRA LEBEN': 'EXTRA LIFE',
    'GAME OVER': 'GAME OVER',
    /* instructions prose (node fragments, in page order) */
    'Dreißig Wellen, zehn Bosse. Du bist Janitschar: Schlag, Kick, Sprungangriff, Rennen, Greifen und Werfen.':
      'Thirty waves, ten bosses. You are a Janissary: punch, kick, jump attack, run, grab and throw.',
    'Zehn Distrikte als Map-Runden: drei Abschnitte pro Straße, Tore, Boss am Ende.':
      'Ten districts as map rounds: three sections per street, gates, a boss at the end.',
    'Drei Leben pro Spieler, alle 2000 Punkte gibt es ein Extraleben dazu —':
      'Three lives per player, every 2000 points earns an extra life —',
    'der Fortschritt steht unter dem Punktestand.': 'progress is shown under the score.',
    'Jede Runde ist eine neue Straße — eigener Look, eigene Musik, eigener Boss.':
      'Every round is a new street — its own look, its own music, its own boss.',
    'Im Koop gehst du bei 0 HP erst zu Boden: Bleib beim Partner, dann steht er wieder auf —':
      'In co-op, at 0 HP you first go down: stay close to your partner and they will get back up —',
    'ohne ein Leben zu verlieren. Allein am Boden kostet es nach 12 s ein Leben.':
      'without losing a life. Down and alone costs a life after 12 s.',
    'In jeder Runde wartet ein Esel: aufsteigen, hüpfen und mit Fronttritt, Drehtritt':
      'Every round has a donkey waiting: mount up, hop, and with front kick, spin kick',
    'oder – bei vollem Balken – dem Superkick austeilen —': 'or — with a full bar — unleash the superkick —',
    'ein Treffer wirft dich vom Sattel, dann rennt der Esel weg.': 'one hit throws you from the saddle, then the donkey runs off.',
    'Greifen packt Gegner am Kragen (weiter weg: Kette); halten, mitlaufen,':
      'Grab seizes enemies by the collar (from further away: chain); hold, walk along,',
    'mit Schlag werfen. Im Sattel: Sprung = Hüpfen, Schlag = Fronttritt,':
      'throw with punch. In the saddle: jump = hop, punch = front kick,',
    'Kick = Drehtritt, Spezial = Superkick bei vollem Balken.': 'kick = spin kick, special = superkick with a full bar.',
    'In der Luft + Schlag =': 'In the air + punch =',
    'Sprungangriff': 'jump attack',
    '. Fünf Schläge bzw. drei Tritte': '. Five punches or three kicks',
    'hintereinander bilden eine': 'in a row form a',
    'Kombo': 'combo',
    '; der letzte Treffer ist der Finisher.': '; the last hit is the finisher.',
    'Die Waffe wird sichtbar in der Hand getragen; Schlag-Taste halten = Dauerfeuer mit Mündungsfeuer und Leuchtspur.':
      'The weapon is carried visibly in hand; hold the punch key = automatic fire with muzzle flash and tracers.',
    'Aufnehmen: zu Fuß mit der Schlag-Taste in Reichweite — nicht beim Laufen.':
      'Pick up: on foot with the punch key within reach — not while running.',
    '(Haltbarkeit).': '(durability).',
    '(Munition) ·': '(ammo) ·',
    'Baseballschläger ·': 'Baseball bat ·',
    'Schlagring · Kusarigama': 'Knuckleduster · Kusarigama',
    'Pistole · Gewehr · Bazooka': 'Pistol · Rifle · Bazooka',
    '+40 Leben ·': '+40 health ·',
    'Döner': 'Doner',
    'Ayran': 'Ayran',
    'Gold': 'Gold',
    /* difficulties */
    'Leicht': 'Easy', 'Normal': 'Normal', 'Hart': 'Hard', 'Albtraum': 'Nightmare',
    'LEICHT': 'EASY', 'NORMAL': 'NORMAL', 'HART': 'HARD', 'ALBTRAUM': 'NIGHTMARE',
    'Leicht: 14–18 Gegner pro Abschnitt, mehr Beute, sanfter Schaden.': 'Easy: 14–18 enemies per section, more loot, gentler damage.',
    'Normal: 18–24 Gegner pro Abschnitt, knappe Beute.': 'Normal: 18–24 enemies per section, scarce loot.',
    'Hart: 24–32 Gegner pro Abschnitt, wenig Beute, härtere Treffer.': 'Hard: 24–32 enemies per section, little loot, harder hits.',
    'Albtraum: 28–32 Gegner, Elite-Gegner, 3 Boss-Wachen, minimale Beute.': 'Nightmare: 28–32 enemies, elite enemies, 3 boss guards, minimal loot.',
    /* online / status lines */
    'Verbinde …': 'Connecting …',
    'Verbunden. Warte auf Gegenüber …': 'Connected. Waiting for partner …',
    'Verbindung getrennt.': 'Connection lost.',
    'Gegenüber hat den Raum verlassen.': 'Your partner left the room.',
    'Warte auf den Host …': 'Waiting for the host …',
    'Erst Raum erstellen oder beitreten.': 'Create or join a room first.',
    'Bitte 4-stelligen Code eingeben.': 'Please enter the 4-letter code.',
    'Gast verbunden — Start drücken.': 'Guest connected — press Start.',
    'Host verbunden — warte auf Start …': 'Host connected — waiting for start …',
    'Server nicht erreichbar.': 'Server unreachable.',
    'Raum nicht gefunden — Code prüfen oder der Host hat den Raum geschlossen.': 'Room not found — check the code, or the host closed the room.',
    'Dieser Raum ist bereits voll (Host + 1 Gast).': 'This room is already full (host + 1 guest).',
    'Raumcode schon vergeben — bitte neuen Raum erstellen.': 'Room code already taken — please create a new room.',
    'Verbindung zum Relay verloren.': 'Connection to the relay lost.',
    'Relay nicht erreichbar — Verbindung prüfen und erneut versuchen.': 'Relay unreachable — check your connection and try again.',
    'Online-Bibliothek konnte nicht geladen werden — Seite neu laden.': 'Online library failed to load — reload the page.',
    'Nachricht konnte nicht gesendet werden.': 'Message could not be sent.',
    'Raum konnte nicht betreten werden.': 'Could not enter the room.',
    'GAST': 'GUEST',
    'Spieler 1 · Host': 'Player 1 · Host',
    'Spieler 2 · Gast': 'Player 2 · Guest',
    'Spieler 2 · Online': 'Player 2 · Online',
    /* key remapping */
    'Klick auf eine Taste, dann die neue drücken.': 'Click a key slot, then press the new key.',
    'Standardbelegung wiederhergestellt.': 'Default bindings restored.',
    'TASTE …': 'KEY …',
    'ESC bricht das Belegen ab · P, M, R und ESC bleiben Spieltasten': 'ESC cancels remapping · P, M, R and ESC stay game keys',
    'ESC ODER P · WEITER': 'ESC OR P · CONTINUE',
    'R NEU STARTEN · M MUSIK · KLICK ZUM FORTSETZEN': 'R RESTART · M MUSIC · CLICK TO CONTINUE',
    /* moves / binding labels */
    'Schelle': 'Slap', 'Schlag': 'Punch', 'Kick': 'Kick', 'Sprung': 'Jump',
    'Rennen': 'Run', 'Greifen': 'Grab', 'Spezial': 'Special',
    'Hoch': 'Up', 'Runter': 'Down', 'Links': 'Left', 'Rechts': 'Right',
    'Esel': 'Donkey',
    /* banners / toasts */
    'ALARM · VERSTÄRKUNG': 'ALARM · REINFORCEMENTS',
    'ALLE 10 DISTRIKTE GESCHAFFT': 'ALL 10 DISTRICTS CLEARED',
    'DISTRIKT GESÄUBERT +500': 'DISTRICT CLEARED +500',
    'NACHSCHUB': 'SUPPLIES',
    'TOR OFFEN': 'GATE OPEN',
    'VOM ESEL GESTÜRZT': 'THROWN FROM THE DONKEY',
    'ABGESTIEGEN': 'DISMOUNTED',
    'AUTO-ALARM': 'AUTO ALARM',
    'GRIFF GELÖST': 'GRAB RELEASED',
    'ZU WEIT WEG · BLEIB BEIM PARTNER': 'TOO FAR AWAY · STAY WITH YOUR PARTNER',
    'MUSIK AUS': 'MUSIC OFF',
    'MUSIK AN': 'MUSIC ON',
    'ALLE GEGNER BESIEGEN': 'DEFEAT ALL ENEMIES',
    'BOSS BESIEGEN': 'DEFEAT THE BOSS',
    'FÄUSTE': 'FISTS',
    'AUS': 'OFF',
    'KOPFNUSS': 'HEADBUTT',
    'HIGHKICK': 'HIGH KICK',
    'SUPERKICK': 'SUPERKICK',
    /* districts + subs (content.js) */
    'GROSSER BASAR': 'GRAND BAZAAR',
    'GOLDENES HORN': 'GOLDEN HORN',
    'PALASTGÄRTEN': 'PALACE GARDENS',
    'WAFFENSCHMIEDE': 'WEAPON FORGE',
    'DAMPFBAD': 'STEAM BATH',
    'GRÄBERFELD': 'GRAVEYARD',
    'VERSUNKENE ZISTERNE': 'SUNKEN CISTERN',
    'ANATOLISCHE WÜSTE': 'ANATOLIAN DESERT',
    'THRONSAAL': 'THRONE HALL',
    'STRASSE DER SCHMIEDE': 'STREET OF THE FORGE',
    'GEWÖLBE DER HÄNDLER': "MERCHANTS' VAULT",
    'HAFENKAIS BEI NACHT': 'HARBOR QUAYS AT NIGHT',
    'GLUT UND AMBOSS': 'EMBER AND ANVIL',
    'KUPFERTÖPFE UND NEBEL': 'COPPER POTS AND FOG',
    'NEBEL ÜBER STEINEN': 'FOG OVER STONES',
    'KARAWANENSTRASSE': 'CARAVAN ROAD',
    'UNTERIRDISCHE WASSER': 'UNDERGROUND WATERS',
    'ZWISCHEN MAUERN UND ZYPRESSEN': 'BETWEEN WALLS AND CYPRESSES',
    'DAS LETZTE TOR': 'THE LAST GATE',
    /* bosses (content.js) */
    'KILIC DER SCHMIED': 'KILIC THE SMITH',
    'DEMIRCI DER GLÜHENDE': 'DEMIRCI THE GLOWING',
    'CELLAT IM DAMPF': 'CELLAT IN THE STEAM',
    'GARTENMEISTER NAR': 'GARDEN MASTER NAR',
    'WÄCHTER DER ZISTERNE': 'GUARDIAN OF THE CISTERN',
    'AZRAIL VON DEN GRÄBERN': 'AZRAIL OF THE GRAVES',
    'KORSAR BAHRI': 'CORSAIR BAHRI',
    'SERDAR DER WÜSTE': 'SERDAR OF THE DESERT',
    'VEZIR AL-KABIR': 'VEZIR AL-KABIR',
    'PADISCHAH DER LETZTEN PFORTE': 'PADISHAH OF THE LAST GATE',
    /* items / weapons (content.js) */
    'DÖNER': 'DONER',
    'AYRAN': 'AYRAN',
    'GOLD': 'GOLD',
    'PISTOLE': 'PISTOL',
    'GEWEHR': 'RIFLE',
    'BAZOOKA': 'BAZOOKA',
    'BASEBALLSCHLÄGER': 'BASEBALL BAT',
    'SCHLAGRING': 'KNUCKLEDUSTER',
    'KUSARIGAMA': 'KUSARIGAMA'
  };

  function dict(s) { return Object.prototype.hasOwnProperty.call(DICT, s) ? DICT[s] : s; }

  /* Pattern rules for strings with values baked in. Replacement is a
   * string with $1.. refs or a function(match, groups...) -> string. */
  var PATTERNS = [
    [/^HOST (.+)$/, 'HOST $1'],
    [/^SCHWIERIGKEIT · (.+)$/, function (m, g) { return 'DIFFICULTY · ' + dict(g); }],
    [/^RUNDE (\d+)\/10 · ABSCHNITT (\d+)\/3 · WELLE (\d+)\/30$/, 'ROUND $1/10 · SECTION $2/3 · WAVE $3/30'],
    [/^RUNDE (\d+)\/10$/, 'ROUND $1/10'],
    [/^ABSCHNITT (\d+)$/, 'SECTION $1'],
    [/^DISTRIKT (\d+)$/, 'DISTRICT $1'],
    [/^GEGNER (\d+)$/, 'ENEMIES $1'],
    [/^(\d+) · (.+) — (.+)$/, function (m, n, name, sub) { return n + ' · ' + dict(name) + ' — ' + dict(sub); }],
    [/^(.+) BESIEGT$/, '$1 DEFEATED'],
    [/^(.+) AM BODEN$/, '$1 DOWN'],
    [/^(.+) AUSGESCHIEDEN$/, '$1 IS OUT'],
    [/^(.+) K\.O\. · NOCH (\d+) LEBEN$/, '$1 K.O. · $2 LIVES LEFT'],
    [/^(.+) WIEDER AUF DEN BEINEN$/, '$1 IS BACK UP'],
    [/^(.+) ZERBROCHEN$/, '$1 BROKE'],
    [/^(.+) AUFGENOMMEN$/, function (m, name) { return dict(name) + ' PICKED UP'; }],
    [/^(.+) \+(\d+) LEBEN$/, function (m, name, n) { return dict(name) + ' +' + n + ' HEALTH'; }],
    [/^GOLD \+(.+)$/, 'GOLD +$1'],
    [/^(.+) FRONTTRITT · (.+) DREHTRITT · (.+) SUPERKICK \(VOLLER BALKEN\)$/, '$1 FRONT KICK · $2 SPIN KICK · $3 SUPERKICK (FULL BAR)'],
    [/^GRIFF · (.+) WIRFT · (.+)\/(.+) DREHT$/, 'GRAB · $1 THROWS · $2/$3 TURNS'],
    [/^(.+) — GRIFF BEREIT$/, '$1 — GRAB READY'],
    [/^(.+) — SCHELLE BEREIT$/, '$1 — SLAP READY'],
    [/^(.+) · (.+) — Taste drücken \(ESC bricht ab\)$/, function (m, a, b) { return dict(a) + ' · ' + dict(b) + ' — press a key (ESC cancels)'; }],
    [/^(.+) · (.+) = (.+)$/, function (m, a, b, c) { return dict(a) + ' · ' + dict(b) + ' = ' + c; }],
    [/^(.+) ist für Pause, Musik oder Neustart reserviert\.$/, '$1 is reserved for pause, music or restart.'],
    [/^Verbindungsfehler: (.+)$/, 'Connection error: $1']
  ];

  var lang = 'de';
  try { lang = global.localStorage.getItem('voxelrage-lang') === 'en' ? 'en' : 'de'; } catch (e) {}
  var originals = new WeakMap();   // text node -> German source text
  var applying = false;

  function translateString(raw) {
    var lead = raw.match(/^\s*/)[0];
    var trail = raw.match(/\s*$/)[0];
    var core = raw.trim().replace(/\s+/g, ' ');
    if (!/[A-Za-zÄÖÜäöüß]/.test(core)) return raw;
    if (Object.prototype.hasOwnProperty.call(DICT, core)) return lead + DICT[core] + trail;
    for (var i = 0; i < PATTERNS.length; i++) {
      var m = core.match(PATTERNS[i][0]);
      if (m) {
        var rep = typeof PATTERNS[i][1] === 'function'
          ? PATTERNS[i][1].apply(null, m)
          : core.replace(PATTERNS[i][0], PATTERNS[i][1]);
        return lead + rep + trail;
      }
    }
    return raw;
  }

  function processNode(node) {
    var text = node.nodeValue;
    if (text == null) return;
    if (!originals.has(node)) {
      /* A value we've never seen: in EN mode a fresh German write is
       * translated on the spot; in DE mode it's just remembered so a
       * later switch can translate it too. If the current text is
       * exactly our translation of the stored original, leave it. */
      originals.set(node, text);
    } else if (originals.get(node) !== text && translateString(originals.get(node)) !== text) {
      originals.set(node, text);   // genuine new write (always German from the game)
    }
    if (lang === 'en') {
      var tr = translateString(originals.get(node));
      if (tr !== text) { applying = true; node.nodeValue = tr; applying = false; }
    } else if (originals.get(node) !== text) {
      applying = true; node.nodeValue = originals.get(node); applying = false;
    }
  }

  function walk(root) {
    if (!root) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('[data-noi18n], #netDebug, #netDebugLog, script, style')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (tw.nextNode()) nodes.push(tw.currentNode);
    nodes.forEach(processNode);
  }

  var observer = null;
  function startObserver() {
    if (observer || !global.MutationObserver) return;
    observer = new MutationObserver(function (muts) {
      if (applying) return;
      for (var i = 0; i < muts.length; i++) {
        var mu = muts[i];
        if (mu.type === 'characterData') processNode(mu.target);
        for (var j = 0; j < mu.addedNodes.length; j++) {
          var n = mu.addedNodes[j];
          if (n.nodeType === 3) processNode(n); else walk(n);
        }
      }
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  }

  function apply() {
    document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'de');
    if (lang === 'en' && DICT[document.title]) document.title = DICT[document.title];
    if (lang === 'de' && document.title === 'VOXEL RAGE — Janissaries') document.title = 'VOXEL RAGE — Janitscharen';
    walk(document.body);
    refreshSwitches();
  }

  function setLang(next) {
    var before = lang;
    lang = next === 'en' ? 'en' : 'de';
    try { global.localStorage.setItem('voxelrage-lang', lang); } catch (e) {}
    apply();
    if (before !== lang) {
      try {
        global.document.dispatchEvent(new global.CustomEvent('voxel-lang', { detail: { lang: lang } }));
      } catch (e) {}
    }
  }

  /* The DE | EN switch. The menu and the pause menu each own a slot
   * (ui.js creates it), so the control lives in the game's own menus
   * the way Leap Buddies' language buttons do instead of floating in a
   * corner. Marked data-noi18n so the translator never touches it. */
  var switches = [];
  function paintSwitch(sw) {
    sw.de.style.cssText = btnStyle(lang === 'de');
    sw.en.style.cssText = btnStyle(lang === 'en');
    sw.de.setAttribute('aria-pressed', lang === 'de' ? 'true' : 'false');
    sw.en.setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
  }
  function btnStyle(active) {
    return 'font:inherit;font-size:12px;letter-spacing:.1em;padding:6px 11px;cursor:pointer;' +
      'border:1px solid ' + (active ? '#6be0ff' : '#4a4370') + ';' +
      'background:' + (active ? '#123a4d' : 'rgba(10,8,32,.85)') + ';' +
      'color:' + (active ? '#bffcff' : '#8f86b8') + ';';
  }
  function refreshSwitches() {
    for (var i = 0; i < switches.length; i++) paintSwitch(switches[i]);
  }
  /* attach(hostEl) fills a slot with the control and returns the row. */
  function attach(hostEl) {
    if (!hostEl) return null;
    for (var i = 0; i < switches.length; i++) {
      if (switches[i].el.parentNode === hostEl) return switches[i].el;
    }
    var row = document.createElement('div');
    row.className = 'voxel-lang';
    row.setAttribute('data-noi18n', '');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Sprache / Language');
    row.style.cssText = 'display:flex;gap:5px;font-family:inherit;align-items:center;';
    var de = document.createElement('button');
    de.type = 'button'; de.textContent = 'DE';
    de.title = 'Deutsch';
    de.addEventListener('click', function (ev) { ev.preventDefault(); setLang('de'); });
    var en = document.createElement('button');
    en.type = 'button'; en.textContent = 'EN';
    en.title = 'English';
    en.addEventListener('click', function (ev) { ev.preventDefault(); setLang('en'); });
    row.appendChild(de); row.appendChild(en);
    hostEl.appendChild(row);
    var sw = { el: row, de: de, en: en };
    switches.push(sw);
    paintSwitch(sw);
    return row;
  }

  function init() {
    startObserver();
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.VoxelI18n = {
    setLang: setLang,
    getLang: function () { return lang; },
    attach: attach,
    refresh: refreshSwitches,
  };
})(typeof window !== 'undefined' ? window : globalThis);
