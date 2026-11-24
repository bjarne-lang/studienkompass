# Dual-Studienkompass

Kampagnen-Website „Welches Studium passt zu mir?“ von Bjarne & Felix, Studienprojekt an der VWA.
Quiz zu Studienform (dual oder Vollzeit) und Fachrichtung (Medien/IT, BWL, Soziales), dazu die Studiengänge der BA Lüneburg, ein Vergleich dual vs. Vollzeit und eine Podcast-Unterseite.

Das Ergebnis des Quiz dient nur zur Orientierung und ersetzt keine persönliche Studienberatung.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Startseite als One-Pager: Quiz, Studiengänge, Vergleich, Kampagne. Enthält Fragen und Auswertungslogik |
| `podcast.html` | Podcast-Unterseite mit Player, Kapiteln und Transkript |
| `styles.css` | Gestaltung für beide Seiten |
| `site.js` | gemeinsame Einstellungen und Funktionen |
| `fonts/` | selbst gehostete Schriften mit Lizenztexten |
| `tests/` | automatisierte Tests |
| `docs/abhaengigkeiten.md` | eingesetzte Schriften, Werkzeuge und Dienste |

Statische Dateien, kein Build-Schritt, keine Cookies, kein Tracking, keine Anfragen an fremde Server.

## Inhalte ändern

Oben in `site.js`:

- `LINKS`: Links zu VWA, Podcast (Spotify) und Instagram. Leer = Button „bald verfügbar“
- `PODCAST`: Podcast-Datei, Länge, Kapitel und Transkript
- `PHOTOS` und `PHOTO_EFFECT`: Fotos und Poster-Effekt
- `QUOTES`: Zitate von Bjarne und Felix

Fragen und Ergebnistexte stehen in `index.html` im Script-Block `kompass-logic` und darunter.

## Lokal ansehen

```bash
python3 -m http.server 8765
```

Dann http://localhost:8765 im Browser öffnen.

## Tests

```bash
npm test
```

Benötigt Node.js ab Version 20, keine weiteren Pakete.
