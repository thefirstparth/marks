# marks

A small library of **logos, flags, club crests and faces**, saved as files with one index, so any site can put the
right mark next to a name ("Real Madrid", "Max Verstappen", "India", "Wimbledon", "Anthropic") without fetching
anything from anyone at run time. Made for [Andaaza](https://getandaaza.vercel.app); free for any of Parth's sites.

## What is in it

| Folder | What | Style | Named by |
|---|---|---|---|
| `flags/` | every country and territory, round | colour SVG | ISO 3166 code: `in.svg`, `es.svg`; home nations `gb-eng.svg`, `gb-sct.svg`, `gb-wls.svg`, `gb-nir.svg` |
| `clubs/` | football clubs (about 30 leagues and cups) and NBA teams | colour PNG, 64 px; `-dark` version for dark backgrounds where one exists | the club's own English name: `real-madrid.png`, `golden-state-warriors.png` |
| `teams/` | IPL teams, the smaller F1 teams | colour, from Wikipedia | `chennai-super-kings.png`, `haas.svg` |
| `people/` | faces of key sportspeople and public figures | JPEG, 96 px square, centred on the face, **photo from 2025 or later** | the person's name: `max-verstappen.jpg` |
| `brands/` | companies and products (AI labs, car makers, streaming, fintech, Polymarket, Kalshi, Manifold) | single-colour SVG in `currentColor` | the brand: `anthropic.svg`, `ferrari.svg` |
| `competitions/` | tournaments and leagues (Champions League, F1, Wimbledon, IPL, LaLiga), plus oil, rupee, dollar | SVG or picture | the competition: `wimbledon.svg`, `f1.svg` |

**File names never change.** A name is the English name folded to lower case with hyphens, no accents
(`Atlético Madrid` → `atletico-madrid`). New marks are only ever added; a mark is removed only when nothing names it
any more.

## The index: `index.json`

```json
{
  "names":        { "real madrid": "clubs/real-madrid", "real madrid cf": "clubs/real-madrid", "psg": "clubs/paris-saint-germain", "india": "flags/in", "max verstappen": "people/max-verstappen" },
  "competitions": { "champions league": "competitions/uefa", "wimbledon": "competitions/wimbledon", "oil": "competitions/oil-barrel" },
  "marks": {
    "clubs/real-madrid": { "kind": "club", "style": "colour", "file": "clubs/real-madrid.png", "dark": "clubs/real-madrid-dark.png",
                           "from": "ESPN esp.1", "licence": "trademark of its owner", "fetched": "2026-09-27", "checked": "2026-09-27", "hash": "a1b2c3d4" }
  }
}
```

- **`names`**: a *folded* name → a mark id. Fold a name before looking it up: lower case, strip accents, keep only
  letters and digits, single spaces (`scripts/fold.mjs`, one line). It holds every spelling markets use
  ("Man City", "Türkiye", "Ivory Coast", "Arsenal FC" → strip the "FC").
- **`competitions`**: a folded word or phrase to find *inside a title* ("UEFA Champions League: 2027 Champion" contains
  "champions league").
- **`marks`**: the file, its **style** (`drawing` = one colour, draws in the text colour; `colour` = show as is;
  `face` = round crop it; `mono` = paint in the text colour through its shape), where it came from, its licence, when
  it was fetched and last checked, and a short **hash** that changes when the file changes (use it to bust caches).

## Using it from another site

1. **Copy, don't hotlink.** At build time (or once, by hand), copy the folders and `index.json` into your site. Your
   site then works even if this repo or GitHub disappears. A one-line copy:
   `git clone --depth 1 https://github.com/thefirstparth/marks /tmp/marks && cp -r /tmp/marks/{index.json,flags,clubs,teams,people,brands,competitions} public/marks/`
2. If you must link instead, jsDelivr serves this public repo:
   `https://cdn.jsdelivr.net/gh/thefirstparth/marks@main/clubs/real-madrid.png` (add `?v=<hash>` so an updated file is fetched).
3. **Matching a name** (what Andaaza does, in order):
   1. fold it; look it up in `names`;
   2. else drop a club's "FC"/"CF"/"AFC"/"SC" at the end or "FC"/"RC"/"Club" at the start, and look again;
   3. else, if it *starts with* a known name followed by a space, use that one, but only when the known name has two
      or more words, or it is a flag/brand and the rest is not a surname ("Spain O/U 2.5", "India Women", "Mercedes AMG
      Motorsport" yes; "Chad Smith" no, "Inter Miami" no).
4. **Showing it**, so it suits light, dark and print looks:
   - `drawing` SVGs: inline them (or use them as a CSS mask) so they take your text colour. Size ~1.1em, beside the
     name, never on its own line.
   - `colour` pictures: as they are; on a dark background use `dark` if present.
   - `face`: a circle (`border-radius:50%`), ~1.3em.
   - flags: round already.
   - In a print or "old paper" look, tone pictures down (e.g. `filter: grayscale(.55) sepia(.35)`).
5. **Less is more.** One mark per name, only next to names people will recognise faster with it. No mark beats a
   wrong one: a site should show nothing when a name isn't found.

## Where gathering stops (so it never grows forever)

The limits live in `config/sources.json` (`limits`), in plain words:

- **Clubs:** the leagues listed there (top five, Portugal, Netherlands, Europe's three cups, Club World Cup,
  Championship, Scotland, Turkey, Belgium, Switzerland, Austria, Greece, Nordics, Russia, Saudi, Brazil, Argentina,
  Mexico, MLS, Indian Super League) and the NBA; at most **900** crests. Clubs outside them are added only when a site
  actually shows them.
- **People:** at most **1,200** names (the seed list first, then the most traded on Polymarket and Kalshi since mid-2024,
  checked on Wikidata: a real person known in 8+ Wikipedias). **Faces for at most 300**, key people first; everyone
  else gets the flag they play under.
- **Countries:** all of them (about 250), once.
- **Whole library:** at most **40 MB**.
- **Daily run:** adds at most **30** new marks and rechecks at most **30** due ones.
- **Rechecks:** crests every 180 days (rebrands), tournament and team logos yearly, faces yearly (a newer photo),
  people without a face every 180 days.

## Keeping it up to date

- **By hand:** `npm install`, then `npm run names` (rarely: a new season, a World Cup; refreshes
  `config/people.json` from what people bet on), then `npm run build` (fetches what's missing or due; writes
  `index.json`).
- **Daily (optional):** a Claude routine runs at 07:50 IST: `npm run missing` (reads what Andaaza shows, adds names that
  have no mark, within the daily limit, and writes `missing-report.md` listing what it couldn't place) → `npm run build`
  → checks new faces are the right people → commits here → refreshes Andaaza's copy. See `CLAUDE.md`. If the routine
  ever stops, nothing breaks: sites keep their copies; the library just stops growing.

## Faces

A face must be a photo **taken in 2025 or later**: ESPN's headshot if ESPN updated it since, else the person's
Wikipedia lead photo, else their newest cropped portrait on Wikimedia Commons, else any Commons photo with exactly one
clear, large face. A small face detector (pico, MIT) finds the face; it must be the biggest clear face in the photo
(so a spectator is never picked) and the crop is centred on it. No such photo: no face (the flag stays).
Wikimedia photos keep their author and licence in `index.json`; a site showing them should list them on a credits page.

## Sources and licences

Iconify sets (Simple Icons CC0, Arcticons CC BY-SA 4.0, Circle Flags MIT, BoxIcons MIT, MingCute Apache 2.0,
Material Symbols Apache 2.0, Hugeicons MIT); ESPN (crests, headshots); Wikipedia and Wikimedia Commons (tournament and
team logos; photos under their own licences, see `index.json`); the owners' own sites (Polymarket, Manifold,
Roland-Garros). Logos and crests are trademarks of their owners and are shown to identify them.
