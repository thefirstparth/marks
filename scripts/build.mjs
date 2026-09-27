// Builds the library: fetches every mark named in config/sources.json and config/people.json, saves it under its
// folder (brands/, competitions/, flags/, clubs/, people/, teams/) and writes index.json, the list any site reads.
//   node scripts/build.mjs             add what is missing; recheck what is due (see "limits" in config/sources.json)
//   FACES_ALL=1 node scripts/build.mjs  also look up faces beyond the key people (still within the face limit)
// Nothing here runs on a website: sites copy the files they want (see README.md).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { optimize } from "svgo";
import { faces as facesFor } from "./faces.mjs";
import { fold } from "./fold.mjs";

const C = JSON.parse(readFileSync("config/sources.json", "utf8"));
const PEOPLE_FILE = JSON.parse(readFileSync("config/people.json", "utf8"));
const LIMIT = C.limits;
const clean = o => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !k.startsWith("$")));
const slug = t => fold(t).replace(/ /g, "-");
const today = new Date().toISOString().slice(0, 10);
const OLD = existsSync("index.json") ? JSON.parse(readFileSync("index.json", "utf8")) : { marks: {} };
const marks = {}, names = {}, competitions = {}, missing = [];
const UA = { "user-agent": "curl/8.5.0 (thefirstparth/marks library build)" };
const wait = ms => new Promise(r => setTimeout(r, ms));
const get = async u => { for (let i = 0; i < 5; i++) { try { const r = await fetch(u, { headers: UA }); if (r.ok) return r; if (r.status === 404) return null; } catch {} await wait(2000 * 2 ** i); } return null; };
// Due: never fetched, its file lost, or not checked for `days`. Rechecks of marks that still exist stop at the daily
// limit ("daily_recheck"); the rest wait for the next run, oldest first next time.
let rechecks = 0;
const due = (id, days) => { const m = OLD.marks[id]; if (!m || (m.file && !existsSync(m.file))) return true;
  if (Date.now() - Date.parse(m.checked || 0) <= days * 864e5) return false; return rechecks++ < LIMIT.daily_recheck; };
const keep = id => { if (OLD.marks[id] && existsSync(OLD.marks[id].file)) { marks[id] = OLD.marks[id]; return true; } return false; };
const hash = f => createHash("sha1").update(readFileSync(f)).digest("hex").slice(0, 8);
const put = (id, m) => { const prev = OLD.marks[id]; marks[id] = { ...m, fetched: prev && prev.hash === hash(m.file) ? prev.fetched : today, checked: today, hash: hash(m.file) }; };
// A picture is saved; if its source fails, the copy already saved is kept, so a rerun never loses a mark.
async function save(url, file) {
  mkdirSync(file.split("/")[0], { recursive: true });
  const r = url && await get(url), type = r?.headers.get("content-type") || "";
  if (r && /image|svg/.test(type)) { const b = Buffer.from(await r.arrayBuffer()); writeFileSync(file, b); return b; }
  return existsSync(file) ? readFileSync(file) : null;
}
const svgo = s => optimize(s, { multipass: true, floatPrecision: 2, plugins: [{ name: "preset-default", params: { overrides: { removeViewBox: false } } }] }).data;

// 1. Drawings from Iconify (brands and competitions: single colour, drawn in currentColor) and round flags.
async function iconify(ids) {
  const out = {}, bySet = {};
  for (const id of ids) { const [p, n] = id.split(":"); (bySet[p] ||= new Set()).add(n); }
  for (const [p, set] of Object.entries(bySet)) { const list = [...set];
    for (let i = 0; i < list.length; i += 60) {
      const r = await get(`https://api.iconify.design/${p}.json?icons=${list.slice(i, i + 60).join(",")}`), j = r ? await r.json() : {};
      for (const n of list.slice(i, i + 60)) { const ic = j.icons?.[n] || j.icons?.[j.aliases?.[n]?.parent]; if (!ic) continue;
        const w = ic.width || j.width || 24, h = ic.height || j.height || 24;
        out[`${p}:${n}`] = svgo(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"${p === "circle-flags" ? "" : ' fill="currentColor"'}>${ic.body}</svg>`); }
    } }
  return out;
}
const brandIds = { ...clean(C.brands) }, compIds = { ...clean(C.competitions) };
// Every country and territory by its English name, plus the spellings markets use.
const COUNTRIES = {}, region = new Intl.DisplayNames(["en"], { type: "region" });
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) { const code = String.fromCharCode(a, b), n = region.of(code); if (n && n !== code) COUNTRIES[n] = code.toLowerCase(); }
Object.assign(COUNTRIES, clean(C.countries));
const PEOPLE = { ...PEOPLE_FILE.people, ...clean(C.people) };
const flagCodes = new Set([...Object.values(COUNTRIES), ...Object.values(PEOPLE)].filter(Boolean)); // "" = no clear nationality: no flag
const drawn = await iconify([...Object.values(brandIds), ...Object.values(compIds), ...[...flagCodes].map(c => `circle-flags:${c}`)]);
for (const [name, icon] of Object.entries(brandIds)) { const svg = drawn[icon]; if (!svg) { missing.push(icon); continue; }
  const id = `brands/${slug(icon.split(":")[1])}`, file = `${id}.svg`; mkdirSync("brands", { recursive: true }); writeFileSync(file, svg);
  put(id, { kind: "brand", style: "drawing", file, from: `Iconify ${icon}`, licence: C.licences[icon.split(":")[0]] }); names[fold(name)] = id; }
for (const [name, icon] of Object.entries(compIds)) { const svg = drawn[icon]; if (!svg) { missing.push(icon); continue; }
  const id = `competitions/${slug(icon.split(":")[1])}`, file = `${id}.svg`; mkdirSync("competitions", { recursive: true }); writeFileSync(file, svg);
  put(id, { kind: "competition", style: "drawing", file, from: `Iconify ${icon}`, licence: C.licences[icon.split(":")[0]] }); competitions[fold(name)] = id; }
for (const code of flagCodes) { const svg = drawn[`circle-flags:${code}`]; if (!svg) continue;
  const id = `flags/${code}`, file = `${id}.svg`; mkdirSync("flags", { recursive: true }); writeFileSync(file, svg);
  put(id, { kind: "flag", style: "colour", file, from: "Iconify circle-flags", licence: C.licences["circle-flags"] }); }
for (const [n, code] of Object.entries(COUNTRIES)) if (marks[`flags/${code}`]) names[fold(n)] = `flags/${code}`;
for (const [k, v] of Object.entries(clean(C.custom))) { const id = `brands/${slug(k)}`, file = `${id}.svg`;
  writeFileSync(file, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.drawing[0]}" fill="currentColor">${v.drawing[1]}</svg>`);
  put(id, { kind: "brand", style: "drawing", file, from: v.from, licence: "trademark of its owner" }); names[fold(k)] = id; }

// 2. Club crests from ESPN's team lists, league by league (a Night version where ESPN draws a different one).
const pic = (path, file) => save(`https://a.espncdn.com/combiner/i?img=${path}&w=64&h=64&scale=crop&cquality=80&location=origin`, file);
let clubs = 0;
for (const [sport, leagues] of [["soccer", C.crests.soccer], ["basketball", C.crests.basketball]]) for (const lg of leagues) {
  const r = await get(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${lg}/teams`);
  const teams = r ? (await r.json()).sports?.[0]?.leagues?.[0]?.teams?.map(t => t.team) || [] : [];
  if (!teams.length) { missing.push(`espn ${lg}`); continue; }
  const cities = {}; for (const t of teams) cities[fold(t.location)] = (cities[fold(t.location)] || 0) + 1;
  for (const t of teams) {
    const id = `clubs/${slug(t.displayName)}`; if (marks[id]) continue;
    if (clubs >= LIMIT.clubs) break; clubs++;
    if (!due(id, LIMIT.recheck_days.clubs) && keep(id)) { /* checked recently */ }
    else { const src = t.logos?.find(l => l.rel.includes("default"))?.href || t.logos?.[0]?.href; if (!src) continue;
      const lite = await pic(new URL(src).pathname, `${id}.png`); if (!lite) { missing.push(id); continue; }
      const darkSrc = t.logos?.find(l => l.rel.includes("dark"))?.href, dark = darkSrc && await pic(new URL(darkSrc).pathname, `${id}-dark.png`);
      if (dark && dark.equals(lite)) rmSync(`${id}-dark.png`);
      put(id, { kind: "club", style: "colour", file: `${id}.png`, ...(existsSync(`${id}-dark.png`) ? { dark: `${id}-dark.png` } : {}), name: t.displayName, from: `ESPN ${lg}`, licence: "trademark of its owner" }); }
    // Also the name without "FC"/"CF"/"AFC"/"SC" ("Inter Miami CF" → "inter miami"), as markets write it.
    const bare = n => n && fold(n).replace(/ (fc|cf|afc|sc|fk|sk)$/, "").replace(/^(fc|cf|afc|sc) (?=\w{4})/, "");
    for (const n of [t.displayName, t.shortDisplayName, bare(t.displayName), sport === "basketball" && t.name, sport === "basketball" && cities[fold(t.location)] === 1 && t.location])
      if (n && fold(n).length >= 4 && !names[fold(n)]) names[fold(n)] = id;
  }
}
// Clubs outside those leagues that a site showed (added by missing.mjs): name → ESPN logo address.
for (const [name, url] of Object.entries(clean(C.crests.extra))) { const id = `clubs/${slug(name)}`;
  if (!marks[id]) { if (!due(id, LIMIT.recheck_days.clubs) && keep(id)) {} else if (await save(`https://a.espncdn.com/combiner/i?img=${new URL(url).pathname}&w=64&h=64&scale=crop&cquality=80&location=origin`, `${id}.png`))
    put(id, { kind: "club", style: "colour", file: `${id}.png`, name, from: "ESPN search", licence: "trademark of its owner" }); else { missing.push(id); continue; } }
  names[fold(name)] ||= id; }
for (const [k, v] of Object.entries(clean(C.crests.aliases))) if (names[fold(v)]) names[fold(k)] = names[fold(v)];

// 3. Marks from their owners' sites, ESPN or Wikipedia ("own"): tournaments, IPL and small F1 teams, personal logos.
for (const [key, e] of Object.entries(clean(C.own))) {
  if (e.for === "name" && e.famous === false) continue;
  const folder = e.for === "competition" ? "competitions" : e.kind === "team" ? "teams" : "brands", id = `${folder}/${slug(key)}`;
  if (!due(id, LIMIT.recheck_days.own) && keep(id)) { /* recently checked */ }
  else {
    let url = e.url;
    if (e.wiki && !url) { const r = await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=original&titles=${encodeURIComponent(e.wiki)}`);
      url = r && Object.values((await r.json()).query?.pages || {})[0]?.original?.source;
      // Wikipedia hides non-free logos from that list; then take the page's own file with "logo" in its name.
      if (!url) { const q = await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=images&imlimit=50&titles=${encodeURIComponent(e.wiki)}`);
        const f = q && Object.values((await q.json()).query?.pages || {})[0]?.images?.map(i => i.title).find(t => /logo/i.test(t) && !/commons-logo|wiki|flag|icon/i.test(t));
        const ii = f && await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles=${encodeURIComponent(f)}`);
        url = ii && Object.values((await ii.json()).query?.pages || {})[0]?.imageinfo?.[0]?.url; } }
    const ext = e.ext || (String(url || OLD.marks[id]?.file || "").match(/\.(svg|png|webp|jpg)(\?|$)/i)?.[1] || "png").toLowerCase(), file = `${id}.${ext}`;
    let b = await save(url, file); if (!b) { missing.push(id); continue; }
    if (ext === "svg") { let s = b.toString(); if (e.crop) s = s.replace(/<svg\b[^>]*>/, t => t.replace(/\s(viewBox|width|height)="[^"]*"/g, "").replace(/>$/, ` viewBox="${e.crop}">`));
      if (e.style === "drawing") s = svgo(s).replace(/\s(fill|class)="(?!none)[^"]*"/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/^<svg/, '<svg fill="currentColor"');
      writeFileSync(file, s); }
    const dark = e.dark && await save(e.dark, `${id}-dark.${ext}`);
    put(id, { kind: e.for === "competition" ? "competition" : e.kind || "brand", style: e.style, file, ...(dark ? { dark: `${id}-dark.${ext}` } : {}), from: e.wiki ? `Wikipedia: ${e.wiki}` : url, licence: "trademark of its owner" });
  }
  for (const n of [key, ...(e.also || [])]) (e.for === "competition" ? competitions : names)[fold(n)] = id;
}

// 4. People: a face (from 2025 on, centred on the face) for key people, else the flag they play under.
const seed = new Set((PEOPLE_FILE.seed || []).map(fold)), hand = new Set(Object.keys(clean(C.people)).map(fold));
const order = Object.keys(PEOPLE).sort((a, b) => (hand.has(fold(b)) + seed.has(fold(b))) - (hand.has(fold(a)) + seed.has(fold(a))));
// "no_face": people whose found photo was wrong (a person checked it); they keep their flag.
const noFace = new Set((C.no_face || []).map(fold));
const faceWanted = order.filter(n => !noFace.has(fold(n)) && (process.env.FACES_ALL || hand.has(fold(n)) || seed.has(fold(n)))).slice(0, LIMIT.faces);
const lookup = [];
for (const person of faceWanted) { const id = `people/${slug(person)}`;
  if (!due(id, OLD.marks[id]?.file ? LIMIT.recheck_days.faces : LIMIT.recheck_days.no_face)) { if (!keep(id)) marks[id] = OLD.marks[id]; continue; }
  const r = await get(`https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(person)}&limit=5&type=player`);
  const hit = r && (await r.json()).items?.find(i => fold(i.displayName) === fold(person) && i.headshot?.href);
  lookup.push({ key: person, name: person.replace(/\b\w/g, c => c.toUpperCase()), espn: hit?.headshot?.href || "" });
}
console.log(`faces: looking up ${lookup.length} (limit ${LIMIT.faces})`);
const found = await facesFor(lookup, m => console.log("  " + m));
for (const p of lookup) { const id = `people/${slug(p.key)}`, file = `${id}.jpg`;
  if (found[p.key]) { mkdirSync("people", { recursive: true }); writeFileSync(file, found[p.key].jpg); const c = found[p.key].credit;
    put(id, { kind: "person", style: "face", file, name: p.name, from: c ? c.page : "ESPN", licence: c ? `${c.licence}, ${c.author}` : "ESPN headshot", taken: c ? new Date(c.taken).toISOString().slice(0, 10) : undefined }); }
  else if (!keep(id)) marks[id] = { kind: "person", style: "none", file: "", checked: today }; // looked up, nothing clear from 2025 on
}
// Two forms of one name share a face: "andrea kimi antonelli" → "kimi antonelli", "alex albon" → "alexander albon".
const faceOf = n => { const id = `people/${slug(n)}`; if (marks[id]?.file) return id; const f = fold(n), last = f.split(" ").pop();
  const o = Object.keys(PEOPLE).map(fold).find(k => k !== f && marks[`people/${slug(k)}`]?.file && PEOPLE[k] === PEOPLE[n] && (f.endsWith(" " + k) || (k.split(" ").pop() === last && k.startsWith(f.split(" ")[0]))));
  return o ? `people/${slug(o)}` : ""; };
for (const [n, code] of Object.entries(PEOPLE)) { const id = faceOf(n) || `people/${slug(n)}`;
  names[fold(n)] = marks[id]?.file ? id : marks[`flags/${code}`] ? `flags/${code}` : undefined; if (!names[fold(n)]) delete names[fold(n)]; }

// 5. Stop rules: the library never grows past its limits; files nothing names any more are removed.
const files = new Set(Object.values(marks).flatMap(m => [m.file, m.dark]).filter(Boolean));
for (const dir of ["brands", "competitions", "flags", "clubs", "people", "teams"]) if (existsSync(dir)) for (const f of readdirSync(dir)) if (!files.has(`${dir}/${f}`)) rmSync(`${dir}/${f}`);
const bytes = [...files].reduce((a, f) => a + statSync(f).size, 0);
if (bytes > LIMIT.total_mb * 1048576) console.log(`WARNING: library is ${(bytes / 1048576).toFixed(1)} MB, over its ${LIMIT.total_mb} MB limit`);
const counts = {}; for (const m of Object.values(marks)) if (m.file) counts[m.kind] = (counts[m.kind] || 0) + 1;
writeFileSync("index.json", JSON.stringify({ $comment: "See README.md. names: a folded name (lower case, no accents, letters and digits) → a mark id; competitions: a folded word or phrase found in a title → a mark id; marks: id → file, style, source, licence, dates.", made: today, counts, names: Object.fromEntries(Object.entries(names).sort()), competitions, marks: Object.fromEntries(Object.entries(marks).sort()) }, null, 1) + "\n");
console.log(`library: ${JSON.stringify(counts)}, ${(bytes / 1048576).toFixed(1)} MB, ${Object.keys(names).length} names`);
if (missing.length) console.log(`not found: ${missing.join(", ")}`);
