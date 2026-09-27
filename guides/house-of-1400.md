# Using the marks library in The House of 1400

For a session working on thefirstparth/house-of-1400. Read the library's README.md first (layout, `index.json`,
matching rules, limits). This guide says where marks would help the paper, from a read of house14.vercel.app on
27 Sep 2026. It is advice: the paper's own CLAUDE.md, design rules and editor decide. Nothing here links the paper to
Andaaza; both only copy files from this neutral library.

## How to bring it in (keeps the paper self-sufficient)

- **Copy, never hotlink.** In the paper's own build or daily run, copy the library into the paper's `public/marks/`
  (`git clone --depth 1 https://github.com/thefirstparth/marks` → copy `index.json` and the folders the paper uses).
  If the library or GitHub ever disappears, the paper keeps its copy and keeps working.
- Read `index.json` once per build; fold names the library's way (`scripts/fold.mjs`) and follow README "Matching a
  name" exactly. Show nothing when a name isn't found; never guess.
- **Replace the runtime ESPN crests.** Madridismo's fixtures and the La Liga table load crests from ESPN at run time
  (`crest()` in `public/app.js`, `a.espncdn.com/combiner/...`). The library has the same crests saved
  (`clubs/<name>.png`, keyed by name). Using them removes an outside dependency; keep the paper's greyscale treatment.
- **Madridismo's crown can become the crest.** The paper kept a crown because Iconify has no Real Madrid crest; the
  library has `clubs/real-madrid.png`. Editor's call.
- Style it like a newspaper: small (about the cap height), next to the name, never on its own line; greyscale or ink
  for print looks; one mark per name.

## Where marks would help (by section)

| Section | What's there now | Suggested mark | Library |
|---|---|---|---|
| Top rail / "Next up" | "Bahrain Grand Prix in Malaysia", "India v Afghanistan" | competition mark (F1) + round flags of the sides/host | `competitions/f1`, `flags/*` |
| Front page kickers | "F1 · AZERBAIJAN GRAND PRIX", "TENNIS · LAVER CUP", "AI · SAFETY", "NATIONS LEAGUE" | one small mark before the kicker when the kicker names a competition, country or company in `index.json` | `competitions/`, `flags/`, `brands/` |
| The Fixture List | "Laver Cup · final day", "Asian Games cricket · India v Afghanistan", "China Open · Djokovic…" | competition mark; flags or crests for both sides; face or flag for a named player | all folders |
| Madridismo | opponents (Villarreal, AS Roma, Sevilla, RB Leipzig) with ESPN crests; La Liga mini-table | same crests from the library (saved copies); LaLiga mark on the table header | `clubs/`, `competitions/la-liga` |
| The Wider Pitch | kickers "PREMIER LEAGUE", "AFRICA" | competition mark on the kicker only (not every club in a headline) | `competitions/premierleague` |
| Paddock Notes | race weekend (emoji flag 🇲🇾), standings; constructors already carry Simple Icons marks; Williams, Haas and Racing Bulls have none | round flag instead of the emoji (consistent across devices); driver faces or flags in the standings; the missing team logos | `flags/`, `people/`, `teams/williams`, `teams/haas`, `teams/racing-bulls` |
| The Crease | "India vs West Indies", next match v Afghanistan; IPL in season | round flags for sides; IPL team logos | `flags/`, `teams/chennai-super-kings`… |
| Deuce | "Carlos Alcaraz vs Alex de Minaur", Laver Cup, China Open | faces (or flags) for players; Grand Slam and ATP marks when named | `people/`, `competitions/wimbledon`, `…/roland-garros`, `…/australian-open`, `…/us-open`, `…/atp` |
| The Sidelines | "GOLF · PRESIDENTS CUP", "ASIAN GAMES · KABADDI" India v Iran | flags for national sides only | `flags/` |
| Dateline | kickers "INDIA · DIPLOMACY", "INDIA · WEATHER" | a small flag on country kickers (not on every country in the text) | `flags/` |
| The Workshop | "APPLE …", "AI · SAFETY" OpenAI | brand mark on the kicker's company | `brands/apple`, `brands/openai`… |
| The Ledger | Sensex, S&P 500, rupee, oil | rupee / dollar / oil marks where the item is about them | `competitions/currency-rupee-rounded`, `…/attach-money-rounded`, `…/oil-barrel` |
| Screen & Stage | where to watch (Netflix, Prime Video, JioHotstar…) | streaming brand marks next to "where to watch" | `brands/netflix`, `brands/primevideo`, `brands/jiohotstar`… |
| The Betting Window | market leaders and contenders ("Barcelona 24%", "Harry Kane 56%", "Lamine Yamal 28%") | crest / face / flag beside each name, as Andaaza does | all folders |
| Talk of the Day, Before You Go, House Note | trending topics, advice, a joke | none (words carry these; marks would clutter) | — |

Exact ids: look them up in `index.json` (`names` / `competitions`); the table's ids are examples.

## Keeping the paper's copy fresh

The library changes at most once a day (its routine runs at 07:50 IST). The paper can re-copy in its own daily run;
each mark has a `hash`, so only changed files need replacing, and `?v=<hash>` on a picture's address makes browsers
load the new one.
