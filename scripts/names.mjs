// Dump of the people a prediction-market site is likely to show (made for Andaaza), so their flags and faces are saved in advance rather than
// added one by one as they appear. Run by hand, rarely (a new season, a new World Cup):
//   node scripts/names.mjs      (then `node scripts/build.mjs` to fetch their marks)
// Sources: every Polymarket event in Andaaza's subjects since June 2024 and every Kalshi event (the names people bet
// on), the current F1 grid, and the ATP and WTA top 150. A name is kept when:
//   - it traded at least $20,000 in all (sport) or $250,000 (everything else), or it is on the grid/rankings;
//   - Wikidata says it is a person, with a country to show a flag for, and it has articles in at least 8 Wikipedias
//     (a sign of being known beyond one market).
//   - it is not only an American football, baseball or ice hockey player (Andaaza leaves those sports out).
// Plus the "seed" list in config/people.json: people who matter here but are rarely bet on by name (Kohli, Modi,
// managers). Writes config/people.json (name → flag code), keeping the seed. Hand entries in config/sources.json
// "people" win over it.
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const UA = { "user-agent": "curl/8.5.0 (andaaza names dump; https://getandaaza.vercel.app)" };
const wait = ms => new Promise(r => setTimeout(r, ms));
async function json(u) {
  for (let i = 0; i < 5; i++) { try { const r = await fetch(u, { headers: UA }); if (r.ok) return await r.json(); if (r.status === 404) return null; } catch {} await wait(2000 * 2 ** i); }
  return null;
}
const fold = t => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const SPORT = /f1|soccer|cricket|tennis|nba|champions-league|la-liga|premier-league|ballon|world-cup|ipl|Sports/i;

// 1. Names people bet on.
const volume = new Map(); // name → { v, sport }
const add = (n, v, sport) => { n = String(n || "").trim(); if (!/^[A-ZÀ-Ž][\p{L}.'-]+( [A-ZÀ-Ž'][\p{L}.'-]+){1,3}$/u.test(n)) return;
  const o = volume.get(n) || { v: 0, sport: false }; o.v += v; o.sport ||= sport; volume.set(n, o); };
const tags = ["f1", "soccer", "cricket", "tennis", "nba", "ai", "tech", "economy", "finance", "india", "geopolitics", "world", "movies", "music", "pop-culture", "celebrities", "awards", "champions-league", "la-liga", "premier-league", "ballon-dor", "world-cup", "ipl"];
for (const t of tags) for (const closed of [false, true]) for (let off = 0; off < (closed ? 1000 : 300); off += 100) {
  const j = await json(`https://gamma-api.polymarket.com/events?tag_slug=${t}&closed=${closed}&order=volume&ascending=false&limit=100&offset=${off}${closed ? "&end_date_min=2024-06-01T00:00:00Z" : ""}`);
  if (!j?.length) break;
  for (const e of j) { const v = +e.volume || 0; for (const m of e.markets || []) add(m.groupItemTitle, v / Math.max(1, e.markets.length), SPORT.test(t)); }
  await wait(150);
}
console.log(`Polymarket: ${volume.size} names so far`);
for (const status of ["settled", "open"]) {
  let cursor = "";
  for (let i = 0; i < 80; i++) {
    const j = await json(`https://api.elections.kalshi.com/trade-api/v2/events?status=${status}&limit=200&with_nested_markets=true${cursor ? "&cursor=" + cursor : ""}`);
    if (!j) break;
    for (const e of j.events || []) if (/Sports|World|Entertainment|Science|Technology|Elections|Politics|Financials|Economics|Companies/.test(e.category || ""))
      for (const m of e.markets || []) add(m.yes_sub_title, +m.volume || 0, /Sports/.test(e.category));
    cursor = j.cursor; if (!cursor) break; await wait(250);
  }
}
console.log(`with Kalshi: ${volume.size} names`);
const wanted = new Set([...volume].filter(([, o]) => o.v >= (o.sport ? 20000 : 250000)).map(([n]) => n));

// 2. Who is current: the F1 grid, the ATP and WTA top 150.
const grid = await json("https://sports.core.api.espn.com/v2/sports/racing/leagues/f1/seasons/2026/athletes?limit=100");
for (const it of grid?.items || []) { const a = await json(it.$ref.replace("http:", "https:")); if (a?.displayName) wanted.add(a.displayName); }
for (const tour of ["atp", "wta"]) { const j = await json(`https://site.api.espn.com/apis/site/v2/sports/tennis/${tour}/rankings`); for (const r of j?.rankings?.[0]?.ranks || []) if (r.athlete?.displayName) wanted.add(r.athlete.displayName); }
const OLD = existsSync("config/people.json") ? JSON.parse(readFileSync("config/people.json", "utf8")) : {}, seed = OLD.seed || [];
for (const n of seed) wanted.add(n);
console.log(`candidates: ${wanted.size}`);

// 3. Wikidata: a person, known in 8+ Wikipedias, and the country they compete for or belong to.
const ids = new Map(); // wikidata id → name as bet on
for (const n of wanted) {
  const j = await json(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=1&search=${encodeURIComponent(n)}`);
  const hit = j?.search?.[0]; if (hit && (fold(hit.label) === fold(n) || seed.includes(n))) ids.set(hit.id, n);
  await wait(60);
}
const people = {}, countries = new Map(), claim = (e, p) => (e.claims?.[p] || []).map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
// Home nations play under their own flags.
const HOME = { Q21: "gb-eng", Q22: "gb-sct", Q25: "gb-wls", Q26: "gb-nir" };
const list = [...ids.keys()];
for (let i = 0; i < list.length; i += 50) {
  const j = await json(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|sitelinks&ids=${list.slice(i, i + 50).join("|")}`);
  for (const [id, e] of Object.entries(j?.entities || {})) {
    if (!claim(e, "P31").includes("Q5") || Object.keys(e.sitelinks || {}).length < 8) continue;
    const sport = claim(e, "P641"); if (sport.length && sport.every(x => ["Q41323", "Q5369", "Q41466"].includes(x))) continue; // American football, baseball, ice hockey
    // Country they compete for, else their citizenship if single (or the one marked preferred); several: no flag.
    const cit = (e.claims?.P27 || []).filter(x => x.mainsnak?.datavalue), pref = cit.filter(x => x.rank === "preferred");
    const c = claim(e, "P1532")[0] || (pref.length === 1 ? pref[0] : cit.length === 1 ? cit[0] : null)?.mainsnak.datavalue.value.id; if (c) people[ids.get(id)] = c;
  }
  await wait(200);
}
const need = [...new Set(Object.values(people))].filter(c => !HOME[c]);
for (let i = 0; i < need.length; i += 50) {
  const j = await json(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=${need.slice(i, i + 50).join("|")}`);
  for (const [id, e] of Object.entries(j?.entities || {})) { const iso = e.claims?.P297?.[0]?.mainsnak?.datavalue?.value; if (iso) countries.set(id, iso.toLowerCase()); }
}
// Stop: at most "people" names (config/sources.json limits), the seed first, then the most traded.
const LIMIT = JSON.parse(readFileSync("config/sources.json", "utf8")).limits.people;
const rank = n => (seed.includes(n) ? 1e15 : 0) + (volume.get(n)?.v || 0);
const out = {};
for (const [n, c] of Object.entries(people).sort((a, b) => rank(b[0]) - rank(a[0])).slice(0, LIMIT).sort((a, b) => a[0].localeCompare(b[0]))) { const f = HOME[c] || countries.get(c); if (f) out[fold(n)] = f; }
writeFileSync("config/people.json", JSON.stringify({
  $comment: "Made by scripts/names.mjs from the names bet on at Polymarket and Kalshi, the F1 grid and the ATP/WTA top 150, checked on Wikidata. Name → the flag they play under or belong to. Safe to edit by hand; config/sources.json \"people\" wins over it. scripts/build.mjs then fetches their marks.",
  made: new Date().toISOString().slice(0, 10), seed, people: out }, null, 1) + "\n");
console.log(`config/people.json: ${Object.keys(out).length} people`);
