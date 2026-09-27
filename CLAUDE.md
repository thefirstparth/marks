# marks: context for a session (and the daily routine)

Parth Bhatia's shared library of logos, flags, club crests and faces. README.md explains what's in it, how names work
and where gathering stops (limits in `config/sources.json`). Sites copy it; nothing reads it at run time.

**Rules that never bend**
- File names and ids never change once published (other repos refer to them). Add; don't rename.
- Stay inside `limits`. If a run would pass them, stop and say so in `missing-report.md`.
- No mark is better than a wrong mark. Never guess a person, club or logo; leave it in the report for Parth.
- Faces must be photos taken in 2025 or later, of the right person, centred on the face.
- Never edit thefirstparth/house-of-1400. Andaaza changes are limited to the files named below.
- Commits end with the attribution lines the session gives you; no model names in commits.

## The daily routine (07:50 IST, Sonnet)

1. Make sure both repos are here: `thefirstparth/marks` and `thefirstparth/andaaza` (add and clone them if not).
   In `marks`: `npm ci`.
2. `npm run missing`: reads Andaaza's current reading, adds names shown without a mark (people → config/people.json,
   clubs → config/sources.json `crests.extra`), at most `daily_new`, and writes `missing-report.md`.
3. `npm run build`: fetches the new marks and rechecks up to `daily_recheck` due ones (outdated crests, faces, logos).
4. **Look at every face that is new or changed in this run** (compare `index.json` with the last commit: entries under
   `people/` whose `hash` changed). Make one contact sheet (the faces with their names) and view it. If a face is
   the wrong person, a crowd, a back, blurred, or clearly older than 2025: add the name to `no_face` in
   `config/sources.json`, delete that file, and run `npm run build` again. Also glance at new club crests.
5. If nothing changed (`git status` clean apart from `missing-report.md`'s date): commit the report only, stop.
6. Commit to `marks` main: "Daily marks: +N new, M rechecked" and a short list. Push.
7. In `andaaza` (on `main`, pulled): `MARKS_DIR=../marks npm run marks`. It may change only `public/logos.js`,
   `public/marks/**` and `public/credits.html`. Check: `node --check public/logos.js`, the page still loads
   (`npm run dev`, open it, no errors, marks visible). If only those files changed, commit "Marks: daily update" to
   `main` and push (Vercel deploys; open pages pick up the new marks by themselves via `/marks/version.json`). If
   anything else would change, don't push: open a pull request and explain.
8. If a step fails (a source down, a limit reached), don't force it: write it in `missing-report.md`, commit, stop.
   Nothing on any site depends on this routine.

## By hand

- `npm run names`: rarely (a new season or World Cup). Mines Polymarket/Kalshi history + F1 grid + ATP/WTA top 150,
  checks Wikidata, rewrites `config/people.json` (keeps `seed`), at most `limits.people`.
- `FACES_ALL=1 npm run build`: faces beyond the key people, still within `limits.faces`.
