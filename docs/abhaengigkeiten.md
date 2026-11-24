# Abhängigkeiten

Die Seite besteht aus statischen Dateien ohne Build-Schritt und ohne npm-Pakete. Externe Dienste werden zur Laufzeit nicht angefragt.

| Name | Zweck | Version | Veröffentlicht / Stand |
|---|---|---|---|
| Bricolage Grotesque (selbst gehostet, `fonts/`) | Überschriften, Logo-Wortmarke | Google Fonts v9, variable Schrift (wght 500–800, opsz) | heruntergeladen am 24.11.2026 |
| Figtree (selbst gehostet, `fonts/`) | Fließtext | Google Fonts v9, variable Schrift (wght 400–800) | heruntergeladen am 24.11.2026 |
| Caveat (selbst gehostet, `fonts/`) | Handschrift-Akzente | Google Fonts v23, variable Schrift (wght 600–700) | heruntergeladen am 24.11.2026 |
| Node.js (nur Tests) | `node --test` für Auswertungslogik und Seitenaufbau | ab 20, getestet mit 24.15.0 | 24.15.0 laut nodejs.org |
| GitHub Pages | kostenloses Hosting der statischen Seite | – | – |

## Lizenzen

Alle drei Schriften stehen unter der SIL Open Font License 1.1 und sind kostenlos. Die Lizenztexte liegen in `fonts/OFL-*.txt` und müssen bei Weitergabe der Schriftdateien mitgeliefert werden.

## Zeichensatz

Eingebunden ist nur der Latin-Zeichensatz. Er enthält alle deutschen Sonderzeichen (ä, ö, ü, ß, „“). Werden später Zeichen aus anderen Schriftsystemen gebraucht, müssen die passenden Teildateien ergänzt werden.
