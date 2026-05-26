# Analytics Dashboard — Approved Mockup

Static HTML mockup for the Awaye analytics dashboard that will live inside `apt-web` as a new admin section. This file is the **approved design direction** following a three-proposal exploration; the implementation will be built to match it (with real data) once the Product Owner has signed off.

## How to view

Open the mockup in a browser:

```sh
open docs/analytics-mockups/dashboard-mockup.html
```

Or serve the directory:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000/dashboard-mockup.html
```

Single self-contained HTML file. Tailwind, Google Fonts and all assets are loaded via CDN — no build step.

## What this mockup represents

A **weekly analytics brief** for Product Owner + leadership, served inside the existing `apt-web` admin portal as a new "Analytics" nav entry (ADMINS-group gated). All numbers in the mockup are fictional.

## The design

A hybrid of three explored directions:

| Element | Inherited from | Purpose |
| --- | --- | --- |
| KPI cards, sparklines, cohort heatmap, side stats | Hybrid Spotlight (P3) | Modern SaaS scannability + the all-important cohort retention grid |
| Fraunces serif "Veckan i siffror" header + pull-quote takeaway | Editor's Letter (P1) | Gravitas + a single sentence PO sees first |
| Drop-zones between every funnel step (red = biggest leak, green = strong conversion, yellow = low confidence) | Annotated Funnel (P2) | You see WHERE the funnel leaks, not just THAT it does |

## Design principles

| Principle | Implementation |
| --- | --- |
| **Visual consistency with apt-web** | Sidebar mirrors `src/admin/layout/AdminLayout.tsx`. Stone-950/900 background. Orange `#F24E1E` / `#FF7262` accent. Sora font. Rounded-xl. New "Analytics" nav entry. |
| **10 funnel questions covered** | Signups, verify rate, activation, first-workout-completion, trial→paid, paywall view→purchase, paywall dismiss, retention D7/D14/D30, median time signup→first workout, iOS vs Android. |
| **Sample-size confidence** | Explicit warnings when N is thin. Thresholds: N ≥ 200 = high, 100 ≤ N < 200 = mid, N < 100 = low. Surfaced as chips and insight blocks. |
| **Editorial interpretation** | The pull-quote at the top is the single most important takeaway of the week. Hand-written or Claude-generated, reviewed before publishing. |
| **Drop-zone semantics** | Red zone (striped) = biggest leak that needs investigation. Green zone = strong conversion worth defending. Yellow zone = low N, ignore the percentage. |

## Mock data used

All numbers fictional. Weekly snapshot for week 21, 2026 (19–25 May).

| Metric | Value | W/W |
| --- | --- | --- |
| Signups | 247 | +12.3% |
| Verify rate | 91.1% | +0.4 pp |
| Activation (chose program) | 68.0% | +4.6 pp |
| First workout started | 36.0% | -2.1 pp |
| First workout completed | 21.1% | -1.1 pp |
| Trial → Paid | 4.2% | -0.8 pp (n=23, low conf) |
| Paywall views | 412 | +9% |
| Paywall CR | 5.6% | -0.9 pp |
| Retention D7 / D14 / D30 | 53% / 41% / 32% | ~flat |
| iOS vs Android trial→paid | 5.1% vs 3.4% | |
| Median time signup → first done | 2.4 d | |
| Median time signup → paid | 11.8 d | |
| Club code vs organic D30 retention | 38.4% vs 30.1% | +8.3 pp |

The "biggest leak this week" narrative is **Activation → First workout started** (53% drop) — that's the red drop-zone in the funnel.

## Next step

PO sign-off, then a real React implementation under `src/admin/analytics/`. The implementation plan with data pipeline decisions lives in the `awaye_app` repo: `docs/analytics/dashboard-design-decision.md`.

## Origin

Designed 2026-05-26 as part of the analytics dashboard exploration. The earlier 3-proposal exploration files have been removed — only the approved hybrid remains.

Context docs:
- `awaye_app/docs/analytics/foundation-plan.md` — what the dashboard answers and why
- `awaye_app/docs/analytics/capability-matrix.md` — the 10 funnel questions
- `awaye_app/docs/analytics/dashboard-design-decision.md` — this design's decision record
