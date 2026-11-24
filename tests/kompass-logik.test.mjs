import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const source = html.match(/<script id="kompass-logic">([\s\S]*?)<\/script>/)?.[1];
assert.ok(source, "Logik-Block <script id=\"kompass-logic\"> nicht gefunden");
const context = vm.createContext({});
vm.runInContext(source, context);
const K = context.Kompass;

// Objekte aus dem vm-Kontext haben eigene Prototypen, für deepEqual daher in normale Werte umwandeln.
const plain = (x) => JSON.parse(JSON.stringify(x));
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg ?? ""} erwartet ${b}, erhalten ${a}`);

const P1 = K.QUESTIONS.filter((q) => q.part === 1);
const P2 = K.QUESTIONS.filter((q) => q.part === 2);
const idOf = (id) => K.QUESTIONS.findIndex((q) => q.id === id);

function best(q, key, dir = 1) {
  return K.allAnswers(q).reduce((acc, a) =>
    ((K.contribution(q, a)[key] || 0) * dir > (K.contribution(q, acc)[key] || 0) * dir ? a : acc));
}
const optionWhere = (q, pred) => q.o.findIndex((o) => pred(o.w));
const neutralPart1 = (q) =>
  q.type === "choice" ? optionWhere(q, (w) => !w.d)
  : q.type === "scale" ? 2
  : [optionWhere(q, (w) => w.d > 0), optionWhere(q, (w) => w.d < 0)];
const part2For = (key) => P2.map((q) => best(q, key));
// Bevorzugt Antworten mit der Vertiefung, sonst die der zugehörigen Fachrichtung.
const part2ForSub = (dir, sub) => P2.map((q) =>
  K.allAnswers(q).reduce((acc, a) => {
    const score = (x) => { const c = K.contribution(q, x); return (c[sub] || 0) * 10 + (c[dir] || 0); };
    return score(a) > score(acc) ? a : acc;
  }));

test("Fragen sind vollständig und gültig aufgebaut", () => {
  assert.equal(P1.length, 8);
  assert.equal(P2.length, 10);
  const subKeys = Object.values(K.SUBS).flatMap((s) => Object.keys(s));
  for (const q of K.QUESTIONS) {
    assert.ok(q.id && q.short && q.q, `Frage ohne id/short/q: ${q.id}`);
    assert.ok(["choice", "scale", "multi", "rank"].includes(q.type), `Unbekannter Typ bei ${q.id}`);
    if (q.type === "choice") assert.equal(q.o.length, 3, `${q.id} braucht 3 Antworten`);
    if (q.type === "multi") assert.ok(q.max >= 1 && q.max <= q.o.length && q.factor > 0, `${q.id}: max/factor`);
    for (const o of q.o ?? []) {
      for (const k of Object.keys(o.w)) {
        const allowed = q.part === 1 ? ["d"] : [...K.DIR_KEYS, ...subKeys];
        assert.ok(allowed.includes(k), `${q.id}: Gewicht ${k} gehört nicht in Teil ${q.part}`);
      }
      if (q.part === 2) assert.equal(K.DIR_KEYS.filter((k) => o.w[k]).length, 1, `${q.id}: „${o.t}“ muss genau einer Fachrichtung zählen`);
    }
  }
  assert.equal(new Set(K.QUESTIONS.map((q) => q.id)).size, K.QUESTIONS.length, "ids müssen eindeutig sein");
});

test("Alle Fachrichtungen können gleich viele Punkte erreichen", () => {
  const max = K.DIR_KEYS.map((k) => P2.reduce((s, q) => s + K.extremes(q, k).max, 0));
  assert.ok(max[0] > 0);
  max.forEach((m) => close(m, max[0], "Maximalpunkte"));
});

test("Vertiefungen einer Fachrichtung sind ungefähr gleich erreichbar", () => {
  for (const [dir, subs] of Object.entries(K.SUBS)) {
    const max = Object.keys(subs).map((s) => P2.reduce((sum, q) => sum + K.extremes(q, s).max, 0));
    assert.ok(Math.min(...max) > 0, `${dir}: jede Vertiefung braucht Punkte`);
    assert.ok(Math.max(...max) - Math.min(...max) <= 0.5 + 1e-9, `${dir}: ${JSON.stringify(max)}`);
  }
});

test("Teil 1 ist zwischen dual und Vollzeit symmetrisch", () => {
  for (const q of P1) {
    const { min, max } = K.extremes(q, "d");
    close(min, -max, `${q.id}`);
  }
});

test("Nur duale Antworten ergeben Duales Studium mit 100 %", () => {
  const { form } = K.evaluate(K.QUESTIONS, [...P1.map((q) => best(q, "d")), ...part2For("m")]);
  assert.equal(form.key, "dual");
  close(form.norm, 1);
  assert.equal(form.dualPct, 100);
  assert.equal(form.drivers.length, 3);
  assert.ok(form.drivers.every((d) => d.value > 0));
});

test("Nur Vollzeit-Antworten ergeben Vollzeitstudium mit 0 % dual", () => {
  const { form } = K.evaluate(K.QUESTIONS, [...P1.map((q) => best(q, "d", -1)), ...part2For("m")]);
  assert.equal(form.key, "voll");
  assert.equal(form.dualPct, 0);
  assert.ok(form.drivers.every((d) => d.value < 0));
});

test("Ausgeglichene Antworten ergeben „Beides möglich“ ohne Tendenz", () => {
  const { form } = K.evaluate(K.QUESTIONS, [...P1.map(neutralPart1), ...part2For("m")]);
  assert.equal(form.key, "both");
  assert.equal(form.tendency, null);
  assert.equal(form.dualPct, 50);
});

test("Genau ein Drittel zählt schon als duales Studium, knapp darunter als Tendenz", () => {
  // 2 duale Antworten (+2), Skala „trifft voll zu“ (+1), eine Vollzeit-Auswahl im Multi (−1/3) = 8/3 von 8
  const base = P1.map(neutralPart1);
  const choices = P1.map((q, i) => (q.type === "choice" ? i : -1)).filter((i) => i >= 0);
  const answers = base.slice();
  for (const i of choices.slice(0, 2)) answers[i] = best(P1[i], "d");
  const scale = P1.findIndex((q) => q.type === "scale");
  const multi = P1.findIndex((q) => q.type === "multi");
  answers[scale] = 4;
  answers[multi] = [optionWhere(P1[multi], (w) => w.d < 0)];
  const exact = K.evaluate(K.QUESTIONS, [...answers, ...part2For("m")]).form;
  close(exact.norm, 1 / 3);
  assert.equal(exact.key, "dual");

  answers[scale] = 3;
  const below = K.evaluate(K.QUESTIONS, [...answers, ...part2For("m")]).form;
  assert.equal(below.key, "both");
  assert.equal(below.tendency, "dual");
});

test("Klare Fachrichtung gewinnt mit 100 %", () => {
  for (const k of K.DIR_KEYS) {
    const { dir } = K.evaluate(K.QUESTIONS, [...P1.map(neutralPart1), ...part2For(k)]);
    assert.equal(dir.tie, false);
    assert.deepEqual(plain(dir.top), [k]);
    close(dir.pct[k], 100, k);
    assert.equal(dir.drivers.length, 3);
  }
});

test("Gleichstand zweier Richtungen ergibt Allrounder", () => {
  const answers = P2.map(() => undefined);
  let mCount = 0;
  P2.forEach((q, i) => {
    if (q.type !== "choice") return;
    const key = mCount++ < 4 ? "m" : "b";
    answers[i] = optionWhere(q, (w) => w[key]);
  });
  const rank = P2.findIndex((q) => q.type === "rank");
  const r = P2[rank];
  answers[rank] = ["m", "b", "s"].map((k) => optionWhere(r, (w) => w[k]));
  const multi = P2.findIndex((q) => q.type === "multi");
  answers[multi] = [optionWhere(P2[multi], (w) => w.b)];
  // m: 4 + 1 = 5, b: 4 + 0,5 + 0,5 = 5
  const { dir } = K.evaluate(K.QUESTIONS, [...P1.map(neutralPart1), ...answers]);
  close(dir.raw.m, 5);
  close(dir.raw.b, 5);
  assert.equal(dir.tie, true);
  assert.deepEqual(plain(dir.top).sort(), ["b", "m"]);
});

test("Fünf Prozentpunkte Abstand sind kein Gleichstand mehr", () => {
  const answers = P2.map(() => undefined);
  let mCount = 0;
  P2.forEach((q, i) => {
    if (q.type !== "choice") return;
    const key = mCount++ < 4 ? "m" : "b";
    answers[i] = optionWhere(q, (w) => w[key]);
  });
  const rank = P2.findIndex((q) => q.type === "rank");
  answers[rank] = ["m", "b", "s"].map((k) => optionWhere(P2[rank], (w) => w[k]));
  const multi = P2.findIndex((q) => q.type === "multi");
  answers[multi] = [optionWhere(P2[multi], (w) => w.m)];
  // m: 4 + 1 + 0,5 = 5,5 (55 %), b: 4 + 0,5 = 4,5 (45 %)
  const { dir } = K.evaluate(K.QUESTIONS, [...P1.map(neutralPart1), ...answers]);
  assert.equal(dir.tie, false);
  assert.deepEqual(plain(dir.top), ["m"]);
});

test("Vertiefung folgt den Unterschlüsseln der gewählten Antworten", () => {
  // Alles Medien/IT, Rangfolge mit dem Video zuletzt und im Multi nur „Programmieren“: IT vor Medien
  const mAnswers = part2ForSub("m", "mIT");
  const rank = P2.findIndex((q) => q.type === "rank");
  mAnswers[rank] = ["b", "s", "m"].map((k) => optionWhere(P2[rank], (w) => w[k]));
  const multi = P2.findIndex((q) => q.type === "multi");
  mAnswers[multi] = [optionWhere(P2[multi], (w) => w.mIT)];
  const { dir } = K.evaluate(K.QUESTIONS, [...P1.map(neutralPart1), ...mAnswers]);
  assert.deepEqual(plain(dir.top), ["m"]);
  assert.deepEqual(plain(dir.subs.m), ["mIT"]);

  const soz = K.evaluate(K.QUESTIONS, [...P1.map(neutralPart1), ...part2ForSub("s", "sKul")]).dir;
  assert.deepEqual(plain(soz.top), ["s"]);
  assert.deepEqual(plain(soz.subs.s), ["sKul"]);
});

test("Ungültige Antworten werden erkannt und nicht gezählt", () => {
  const multi = K.QUESTIONS[idOf("themen")];
  assert.equal(K.isAnswered(multi, []), false);
  assert.equal(K.isAnswered(multi, [0, 1, 2, 3]), false, "mehr als max");
  assert.equal(K.isAnswered(multi, [0, 0]), false, "doppelt");
  assert.equal(K.isAnswered(multi, [0, 9]), false, "außerhalb");
  assert.equal(K.isAnswered(multi, [0, 1, 2]), true);

  const rank = K.QUESTIONS[idOf("reihenfolge")];
  assert.equal(K.isAnswered(rank, [0, 1]), false, "unvollständig");
  assert.equal(K.isAnswered(rank, [2, 0, 1]), true);

  const scale = K.QUESTIONS[idOf("dreizwei")];
  assert.equal(K.isAnswered(scale, 5), false);
  assert.equal(K.isAnswered(scale, undefined), false);
  assert.deepEqual(plain(K.contribution(multi, [0, 1, 2, 3])), {});
  assert.throws(() => K.isAnswered({ type: "freitext" }, "x"), /Unbekannter Fragetyp/);
});

test("Rangfolge vergibt 1, 0,5 und 0 Punkte", () => {
  const rank = K.QUESTIONS[idOf("reihenfolge")];
  const c = plain(K.contribution(rank, [2, 0, 1]));
  close(c[K.DIR_KEYS.find((k) => rank.o[2].w[k])], 1);
  close(c[K.DIR_KEYS.find((k) => rank.o[0].w[k])], 0.5);
  close(c[K.DIR_KEYS.find((k) => rank.o[1].w[k])] ?? 0, 0);
});

test("Mischen behält die neutrale Antwort am Ende und liefert eine Permutation", () => {
  const q = K.QUESTIONS[idOf("geld")];
  const seq = [0.9, 0.1, 0.5, 0.3];
  for (const r of seq) {
    const order = plain(K.orderFor(q, () => r));
    assert.equal(order.at(-1), q.o.findIndex((o) => o.last));
    assert.deepEqual(order.slice().sort(), [0, 1, 2]);
  }
  assert.equal(K.orderFor(K.QUESTIONS[idOf("dreizwei")]), null);
  const multi = K.QUESTIONS[idOf("themen")];
  assert.deepEqual(plain(K.orderFor(multi, () => 0.42)).sort(), [0, 1, 2, 3, 4, 5]);
});

test("Antwort-Texte für die Begründung", () => {
  assert.equal(K.answerLabel(K.QUESTIONS[idOf("dreizwei")], 4), "trifft voll zu");
  const rank = K.QUESTIONS[idOf("reihenfolge")];
  assert.equal(K.answerLabel(rank, [1, 0, 2]), `Platz 1: ${rank.o[1].t}`);
  const multi = K.QUESTIONS[idOf("wichtig")];
  assert.equal(K.answerLabel(multi, [0, 3]), `${multi.o[0].t} · ${multi.o[3].t}`);
  assert.equal(K.answerLabel(multi, []), "");
});
