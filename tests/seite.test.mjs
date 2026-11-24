import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const pages = { "index.html": read("index.html"), "podcast.html": read("podcast.html") };
const css = read("styles.css");
const siteJs = read("site.js");
const html = pages["index.html"];
const podcast = pages["podcast.html"];
const header = (page) => page.match(/<header class="site-head">[\s\S]*?<\/header>/)[0];

test("Beide Seiten starten hell und werden nicht automatisch dunkel", () => {
  for (const [name, page] of Object.entries(pages)) {
    assert.match(page, /<html lang="de" data-theme="light">/, name);
    assert.match(page, /<link rel="stylesheet" href="styles.css">/, `${name} nutzt das gemeinsame CSS`);
    assert.match(page, /<script src="site.js"><\/script>/, `${name} nutzt das gemeinsame JS`);
  }
  assert.doesNotMatch(css, /prefers-color-scheme/, "Dunkelmodus soll nur über den Schalter kommen");
  assert.match(css, /:root\[data-theme="dark"\]/, "Dunkel-Farben müssen weiter existieren");
});

test("Dunkelmodus-Schalter ist auf beiden Seiten ein Button mit Zustand", () => {
  for (const [name, page] of Object.entries(pages)) {
    assert.match(page, /<button class="theme-toggle" id="theme-toggle" type="button" aria-pressed="false">/, name);
  }
});

test("Startseite: Menü springt zu sichtbaren Abschnitten, Podcast führt auf die Unterseite", () => {
  const nav = html.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)[0];
  const targets = [...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(targets, ["#quiz", "#studiengaenge", "#vergleich", "podcast.html"]);
  for (const id of targets.filter((t) => t.startsWith("#")).map((t) => t.slice(1))) {
    const tag = html.match(new RegExp(`<main id="main">[\\s\\S]*?(<section id="${id}"[^>]*>)`))?.[1];
    assert.ok(tag, `Abschnitt #${id} fehlt in <main>`);
    assert.doesNotMatch(tag, /\bhidden\b/, `Abschnitt #${id} darf nicht versteckt sein`);
  }
});

test("Podcast-Seite: gleicher Header, Menüpunkt aktiv, Links zurück zur Startseite", () => {
  const brandOf = (page) => header(page).match(/<svg class="brand-mark"[\s\S]*?<\/a>/)[0];
  assert.equal(brandOf(podcast), brandOf(html), "Logo auf beiden Seiten identisch");
  const nav = podcast.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)[0];
  const targets = [...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(targets, ["index.html#quiz", "index.html#studiengaenge", "index.html#vergleich", "podcast.html"]);
  assert.match(nav, /<a href="podcast.html" aria-current="page">Podcast<\/a>/);
  assert.match(header(podcast), /<a class="brand" href="index.html">/, "Logo führt zur Startseite");
  assert.match(podcast, /href="index.html#quiz"/, "Weg zurück zum Quiz");
});

// PODCAST aus site.js lesen, ohne den DOM-Teil auszuführen
const podcastConfig = Function(`${siteJs.match(/const PODCAST = \{[\s\S]*?\n\};/)[0]}; return PODCAST;`)();
const seconds = (at) => at.split(":").map(Number).reduce((sum, part) => sum * 60 + part, 0);

test("Podcast-Seite: Platzhalter-Logik bleibt für künftige Folgen erhalten", () => {
  assert.match(podcast, /if \(!PODCAST\.file\)/, "Player prüft, ob eine Datei eingetragen ist");
  assert.match(podcast, /Die Folge erscheint bald/);
  assert.match(podcast, /Das Transkript ergänzen wir/, "Hinweis, solange kein Transkript da ist");
  assert.match(podcast, /<details class="transcript"/, "Transkript als aufklappbarer Bereich");
  assert.match(podcast, /el\("audio", \{ controls: ""/, "nativer Player mit Bedienelementen, per Tastatur bedienbar");
  assert.match(podcast, /console\.error\("Transkript konnte nicht geladen werden:"/, "Ladefehler wird gemeldet, nicht verschluckt");
});

test("Podcast: Audiodatei ist vorhanden und klein genug für GitHub", () => {
  assert.ok(podcastConfig.file, "Folge ist eingetragen");
  const url = new URL(`../${podcastConfig.file}`, import.meta.url);
  assert.ok(existsSync(url), `${podcastConfig.file} fehlt`);
  const mb = statSync(url).size / 1024 / 1024;
  assert.ok(mb < 50, `${podcastConfig.file} hat ${mb.toFixed(1)} MB, GitHub warnt ab 50 MB`);
  assert.match(podcastConfig.duration, /^\d{1,2}:\d{2}$/, "Länge als mm:ss");
});

test("Podcast: Transkript-Datei ist vorhanden und in Absätze gegliedert", () => {
  const url = new URL(`../${podcastConfig.transcriptFile}`, import.meta.url);
  assert.ok(existsSync(url), `${podcastConfig.transcriptFile} fehlt`);
  const paragraphs = readFileSync(url, "utf8").split(/\n\s*\n/).filter((p) => p.trim());
  assert.ok(paragraphs.length >= 5, `nur ${paragraphs.length} Absätze`);
});

test("Podcast: Kapitel im Player und Zwischenüberschriften im Transkript stimmen überein", () => {
  const transcript = readFileSync(new URL(`../${podcastConfig.transcriptFile}`, import.meta.url), "utf8");
  const headings = [...transcript.matchAll(/^## ([\d:]+) · (.+)$/gm)].map((m) => ({ at: m[1], title: m[2] }));
  assert.deepEqual(headings, podcastConfig.chapters.map(({ at, title }) => ({ at, title })));
});

test("Podcast: Kapitel sind gültig, aufsteigend und innerhalb der Folge", () => {
  const total = seconds(podcastConfig.duration);
  let last = -1;
  for (const c of podcastConfig.chapters) {
    assert.match(c.at, /^\d{1,2}:\d{2}$/, `Zeitformat bei „${c.title}“`);
    assert.ok(c.title && c.title.length <= 40, `Kapiteltitel „${c.title}“`);
    const s = seconds(c.at);
    assert.ok(s > last, `„${c.title}“ muss nach dem vorherigen Kapitel liegen`);
    assert.ok(s < total, `„${c.title}“ liegt hinter dem Ende der Folge`);
    last = s;
  }
});

test("Gemeinsames JS ist nicht doppelt in den Seiten definiert", () => {
  for (const [name, page] of Object.entries(pages)) {
    for (const def of ["function el(", "function personFigure(", "function setupLink(", "const LINKS", "const PHOTOS", "const $ ="]) {
      assert.ok(!page.includes(def), `${name} definiert ${def} erneut, gehört nach site.js`);
    }
  }
});

test("Fotos bekommen den Poster-Effekt, ohne Foto gibt es einen Platzhalter", () => {
  assert.match(siteJs, /<filter id="ba-poster"/, "Filter #ba-poster wird ins Dokument eingefügt");
  assert.match(css, /img\.poster \{ filter: url\(#ba-poster\)/, "Filter muss auf Fotos mit Klasse poster wirken");
  assert.match(siteJs, /const PHOTO_EFFECT = true;/);
  assert.match(siteJs, /class: PHOTO_EFFECT \? "poster" : ""/, "Fotos erhalten die Klasse poster nur bei aktivem Effekt");
  assert.match(siteJs, /"Foto folgt"/, "ohne Foto erscheint der Platzhalter");
  assert.doesNotMatch(html + podcast + siteJs, /ILLUSTRATIONS|FIGURE_/, "gezeichnete Figuren sind entfernt");
});

test("Header zeigt auf beiden Seiten das Kampagnen-Logo mit lesbarem Namen", () => {
  for (const [name, page] of Object.entries(pages)) {
    const brand = page.match(/<a class="brand"[\s\S]*?<\/a>/)?.[0];
    assert.ok(brand, `${name}: Logo-Link fehlt`);
    assert.match(brand, /<svg class="brand-mark"[^>]*aria-hidden="true"/, "Bildmarke ist Deko und für Screenreader versteckt");
    assert.match(brand, /Dual-Studien<em>kompass<\/em>/, "Wortmarke als echter Text, damit der Link einen Namen hat");
    assert.match(page, /<link rel="icon" type="image\/svg\+xml"/, `${name}: Favicon mit dem Logo`);
  }
});

test("Schriften sind selbst gehostet, keine Anfragen an Google", () => {
  for (const [name, page] of Object.entries(pages)) {
    assert.doesNotMatch(page, /fonts\.googleapis\.com|fonts\.gstatic\.com/, `${name} lädt Schriften extern`);
  }
  const files = [...css.matchAll(/url\("(fonts\/[^"]+\.woff2)"\)/g)].map((m) => m[1]);
  assert.deepEqual(files.sort(), ["fonts/bricolage-grotesque-latin.woff2", "fonts/caveat-latin.woff2", "fonts/figtree-latin.woff2"]);
  for (const file of files) {
    assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${file} fehlt`);
  }
  for (const license of ["OFL-bricolagegrotesque.txt", "OFL-caveat.txt", "OFL-figtree.txt"]) {
    assert.ok(existsSync(new URL(`../fonts/${license}`, import.meta.url)), `Lizenztext ${license} fehlt`);
  }
});

test("Nichts wird im Browser gespeichert", () => {
  const inline = Object.values(pages).flatMap((p) => [...p.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]));
  const scripts = [...inline, siteJs].join("\n");
  for (const api of ["localStorage", "sessionStorage", "document.cookie", "indexedDB"]) {
    assert.ok(!scripts.includes(api), `${api} widerspricht „anonym, nichts wird gespeichert“`);
  }
});
