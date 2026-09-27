// The daily run's first step: read what a site is showing now, find the names and competitions that have no mark in
// index.json, work out what each one is, and add it to the config within the daily limit. Then build.mjs fetches them.
//   node scripts/missing.mjs [site's JSON address]    (default: Andaaza's current reading)
// What it adds, and why: a person (Wikidata says human, known in 8+ Wikipedias) → config/people.json with their flag;
// a club (ESPN has a team of exactly that name) → config/sources.json "crests.extra"; a country's other spelling →
// "countries". Anything it can't place is listed in missing-report.md for a person to decide, never guessed.
import { readFileSync, writeFileSync } from "node:fs";
import { fold } from "./fold.mjs";

const SITE = process.argv[2] || "https://getandaaza.vercel.app/api/consensus";
const UA = { "user-agent": "curl/8.5.0 (thefirstparth/marks daily run)" };
const wait = ms => new Promise(r => setTimeout(r, ms));
const json = async u => { for (let i = 0; i < 4; i++) { try { const r = await fetch(u, { headers: UA }); if (r.ok) return await r.json(); if (r.status === 404) return null; } catch {} await wait(1500 * 2 ** i); } return null; };
const S = JSON.parse(readFileSync("config/sources.json", "utf8")), P = JSON.parse(readFileSync("config/people.json", "utf8"));
const I = JSON.parse(readFileSync("index.json", "utf8"));

// The same matching a site should use (README.md): exact, without a club's "FC"/"CF", or a longer name that starts
// with a known one (a one-word country only before non-surname words such as "Women" or "O/U").
function known(name) {
  const n = fold(name), bare = n.replace(/^(fc|cf|rc|ac|sc|club) (?=\w{4})/, "").replace(/ (fc|cf|afc|sc|fk|sk)$/, "");
  if (I.names[n] || I.names[bare]) return true;
  return Object.keys(I.names).some(k => n.startsWith(k + " ") && (k.includes(" ") || /^(\d|o u|1st|2nd|u\d|women|men|national|team|a|b|xi|v|vs)\b/.test(n.slice(k.length + 1))));
}

// 1. Names on the site now: leaders, contenders, both sides of each match.
const d = await json(SITE); if (!d) { console.log("site not reachable; nothing to do"); process.exit(0); }
const shown = new Set(), titles = new Set();
const walk = c => { if (!c || typeof c !== "object") return; if (Array.isArray(c)) return c.forEach(walk);
  if (typeof c.t === "string") titles.add(c.t);
  for (const o of c.o || []) if (o.name && !/^(yes|no|other|others|draw|tie)$/i.test(o.name)) shown.add(o.name);
  for (const k of ["a", "b", "home", "away"]) if (typeof c[k] === "string" && c[k].length < 40) shown.add(c[k]);
  for (const v of Object.values(c)) if (v && typeof v === "object") walk(v); };
walk(d);
const unknown = [...shown].filter(n => /\p{L}{3}/u.test(n) && n.split(" ").length <= 4 && !/\d/.test(n) && !/^\$|^\d|[<>≥≤]|\bor (above|below|more|less)\b|^(above|below|over|under|between|before|after|by|in) /i.test(n) && !known(n));
console.log(`${shown.size} names shown, ${unknown.length} without a mark`);

// 2. Place each one, most important first (the order they appear), up to the daily limit.
const added = [], left = [];
for (const name of unknown) {
  if (added.length >= S.limits.daily_new) { left.push(`${name} (daily limit reached; next run)`); continue; }
  // A club: ESPN has a team of exactly this name.
  const t = await json(`https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(name)}&type=team&limit=5`);
  const team = t?.items?.find(i => fold(i.displayName) === fold(name) && i.logos?.length);
  if (team) { (S.crests.extra ||= {})[team.displayName] = team.logos.find(l => l.rel?.includes("default"))?.href || team.logos[0].href; added.push(`club: ${team.displayName} (ESPN ${team.league})`); continue; }
  // A person: Wikidata, human, known in 8+ Wikipedias, with a country.
  const s = await json(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=1&search=${encodeURIComponent(name)}`);
  const hit = s?.search?.[0];
  if (hit && fold(hit.label) === fold(name)) {
    const e = (await json(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|sitelinks&ids=${hit.id}`))?.entities?.[hit.id];
    const claim = p => (e?.claims?.[p] || []).map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
    if (claim("P31").includes("Q5") && Object.keys(e.sitelinks || {}).length >= 8) {
      // Their country: the one they compete for (P1532), else citizenship (P27) if there is one, or one marked preferred.
      // Several and none preferred (Lula, Troye Sivan): no flag rather than a guess.
      const cit = (e?.claims?.P27 || []).filter(x => x.mainsnak?.datavalue), pref = cit.filter(x => x.rank === "preferred");
      const HOME = { Q21: "gb-eng", Q22: "gb-sct", Q25: "gb-wls", Q26: "gb-nir" }, c = claim("P1532")[0] || (pref.length === 1 ? pref[0] : cit.length === 1 ? cit[0] : null)?.mainsnak.datavalue.value.id;
      let flag = HOME[c]; if (!flag && c) flag = (await json(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=${c}`))?.entities?.[c]?.claims?.P297?.[0]?.mainsnak?.datavalue?.value?.toLowerCase();
      if (flag && Object.keys(P.people).length < S.limits.people) { P.people[fold(name)] = flag; if (!P.seed.includes(name)) P.seed.push(name); added.push(`person: ${name} (${flag})`); continue; }
    }
  }
  left.push(name);
  await wait(200);
}
writeFileSync("config/sources.json", JSON.stringify(S, null, 1) + "\n");
writeFileSync("config/people.json", JSON.stringify(P, null, 1) + "\n");
writeFileSync("missing-report.md", `# Last daily run: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC\n\nRead ${SITE}: ${shown.size} names shown, ${unknown.length} without a mark.\n\n## Added (${added.length}, limit ${S.limits.daily_new} a day)\n${added.map(a => `- ${a}`).join("\n") || "- nothing"}\n\n## Not placed (left for a person; never guessed)\n${left.map(a => `- ${a}`).join("\n") || "- nothing"}\n`);
console.log(`added ${added.length}, not placed ${left.length}; see missing-report.md`);
