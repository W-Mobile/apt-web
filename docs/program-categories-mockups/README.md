# Program Categories & Coaches — designförslag (admin-UI)

Statisk designmockup för det nya admin-UI:t (kategorier + coacher). Öppna
[`design-proposals.html`](./design-proposals.html) i en webbläsare och växla mellan de tre förslagen
med knapparna uppe till höger (eller tangenterna **1 · 2 · 3**).

Självständig HTML — Tailwind via CDN, Sora från Google Fonts, ingen build. Stylad för att matcha apt-webs
befintliga admin (stone-palett + accent `#F24E1E`).

## De tre förslagen

| # | Namn | Kärnidé |
|---|------|---------|
| **A** | Native Tables | Återanvänder befintlig DataTable + pill-filter rakt av. Lägst risk, snabbast, känns bekant. |
| **B** | Dashboard | Kategorier/coacher som kort med inbyggda räknare, statustoggle och split-content-varning. Bäst överblick. |
| **C** | Master-detail | Tvåpanels-workspace; listfilter speglar appens Performance\|On the court-toggle. Tätast, effektivast vid många kategorier. |

Varje förslag visar samtliga ytor: **kategorihantering, coachhantering, kategori/coach-fält i
innehållsformuläret, samt innehållslistornas kolumn/filter/varningsstate** (+ "Kör migration"-knapp).

## Status

Väntar på val av designriktning innan React-implementation påbörjas. Se plan-dokumentet för
implementationsöversikt och den (nu lösta) `amplify_outputs.json`-synk-noten.
