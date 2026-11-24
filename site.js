/* Gemeinsame Bausteine für index.html und podcast.html: Einstellungen, Fotos, Zitate, Dunkelmodus, Kopfzeile. */

// Links hier eintragen. Leer = Button wird als „bald verfügbar“ angezeigt.
const LINKS = { vwa: "", podcast: "", instagram: "" };

/* Podcast-Folge für podcast.html.
   file: MP3 neben den HTML-Dateien, z. B. "folge-1.mp3". Leer = Hinweis „Folge erscheint bald“.
   chapters: [{ at: "03:15", title: "Geld" }, …] – Klick springt im Player an die Stelle.
   transcript: Text der Folge, Absätze durch eine Leerzeile getrennt. Wichtig für Barrierefreiheit. */
const PODCAST = {
  title: "Welches Studium passt zu mir?",
  episode: "Folge 1",
  duration: "",
  description: "Bjarne studiert dual, Felix in Vollzeit. Im Podcast vergleichen sie ihren Alltag: Geld, Stress, Freizeit und was sie heute anders machen würden.",
  file: "",
  chapters: [],
  transcript: ""
};

// Dateinamen oder URLs der Fotos vom Drehtag. Leer = Platzhalter „Foto folgt“.
// Quellen: bjarne.jpg von marktplatz.io/unser-team, felix.jpg von lueneburg.info/unser-team (öffentliche Teamseiten).
const PHOTOS = { bjarne: "bjarne.jpg", felix: "felix.jpg" };
// true = Fotos bekommen den Poster-Effekt mit flachen Farbstufen (Filter #ba-poster), damit sie grafisch statt echt wirken.
const PHOTO_EFFECT = true;
// ENTWURF: durch echte Zitate aus dem Podcast ersetzen und dann draft auf false setzen.
const QUOTES = {
  bjarne: { text: "Ich verdiene schon während des Studiums mein eigenes Geld. Dafür ist meine Woche ziemlich voll.", draft: true },
  felix: { text: "Ich habe Zeit, mich richtig in Themen reinzufuchsen, und in den Semesterferien bin ich flexibel.", draft: true },
  break: { who: "Bjarne & Felix", text: "Es gibt kein richtig oder falsch. Es geht darum, was zu deinem Alltag passt.", draft: true }
};
const PEOPLE = {
  bjarne: { name: "Bjarne", form: "studiert dual" },
  felix: { name: "Felix", form: "studiert Vollzeit" }
};

const $ = (id) => document.getElementById(id);
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function el(tag, attrs = {}, text) {
  const n = document.createElement(tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text !== undefined) n.textContent = text;
  return n;
}

function setupLink(id, url, label) {
  const a = $(id);
  if (!a) return;
  if (url) { a.href = url; a.removeAttribute("aria-disabled"); a.textContent = label; }
  else { a.removeAttribute("href"); a.setAttribute("aria-disabled", "true"); a.textContent = `${label} (bald verfügbar)`; }
}

function personFigure(key) {
  const p = PEOPLE[key];
  const fig = el("figure", { class: "polaroid" });
  const photo = el("div", { class: "photo" });
  if (PHOTOS[key]) {
    const alt = PHOTO_EFFECT ? `Grafisch verfremdetes Foto von ${p.name}` : `${p.name} beim Drehtag in der VWA`;
    photo.appendChild(el("img", { src: PHOTOS[key], alt, loading: "lazy", class: PHOTO_EFFECT ? "poster" : "" }));
  } else {
    const ph = el("div", { class: "ph", role: "img", "aria-label": `Platzhalter für ein Foto von ${p.name}` });
    ph.append(el("b", { "aria-hidden": "true" }, p.name[0]), el("span", { "aria-hidden": "true" }, "Foto folgt"));
    photo.appendChild(ph);
  }
  fig.append(photo, el("figcaption", {}, `${p.name} ${p.form}`));
  return fig;
}

function fillQuote(box, quote, who) {
  box.innerHTML = "";
  const p = el("p", {}, `„${quote.text}“`);
  const foot = el("footer", {}, who);
  if (quote.draft) foot.appendChild(el("span", { class: "draft" }, "Entwurf"));
  box.append(p, foot);
}

// Füllt alle Elemente mit data-person (Polaroid + Zitat) und, falls vorhanden, das Zitat im Zwischenschritt.
function renderPeople() {
  document.querySelectorAll("[data-person]").forEach(box => {
    const k = box.dataset.person;
    const quote = el("blockquote", { class: "quote" });
    fillQuote(quote, QUOTES[k], PEOPLE[k].name);
    box.append(personFigure(k), quote);
  });
  const breakQuote = $("break-quote");
  if (breakQuote) fillQuote(breakQuote, QUOTES.break, QUOTES.break.who);
}

/* Poster-Effekt für Fotos: echte Farben, leicht verstärkt und je Farbkanal in 6 flache Stufen zerlegt (Siebdruck-Look).
   Der Filter muss im Dokument stehen, auf das die CSS-Regel img.poster { filter: url(#ba-poster) } verweist. */
document.body.insertAdjacentHTML("afterbegin", `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <filter id="ba-poster" color-interpolation-filters="sRGB">
    <feColorMatrix type="saturate" values="1.15"/>
    <feComponentTransfer>
      <feFuncR type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1"/>
      <feFuncG type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1"/>
      <feFuncB type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1"/>
    </feComponentTransfer>
  </filter>
</svg>`);

// Die Kopfzeile bleibt oben stehen. Ihre Höhe geht in scroll-padding ein, damit Ankerziele nicht darunter verschwinden.
const head = document.querySelector(".site-head");
new ResizeObserver(() => document.documentElement.style.setProperty("--head-h", `${head.offsetHeight}px`)).observe(head);

// Die Wahl wird nicht gespeichert, damit „nichts wird gespeichert“ auch für Einstellungen gilt.
$("theme-toggle").addEventListener("click", e => {
  const dark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  e.currentTarget.setAttribute("aria-pressed", String(dark));
});
