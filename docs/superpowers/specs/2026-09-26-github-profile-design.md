# GitHub Profile README — "Aurora Glass" Design

Date: 2026-09-26
Owner: Sohan Narewadi (GitHub: `Sohan-Narewadi`)

## Goal
A profile README that leaves visitors impressed and keeps itself current
(projects, stats, recent activity) without hand-editing.

## Confirmed decisions
- **Direction:** Aurora glass — midnight background, violet/cyan/pink aurora
  gradients, glassmorphism cards, animated wave header, typing line.
- **Approach:** self-generated SVGs built by a scheduled GitHub Action from live
  GitHub data (no reliance on third-party stat-card hosts). Only two public
  third-party pieces: the typing-line header and the contribution snake.
- **Display name:** Sohan Narewadi
- **Tagline (typing line):** "Software Dev · Data Explorer · Builder"
- **Links:**
  - LinkedIn: https://www.linkedin.com/in/sohan-narewadi-2b6b51367/
  - Email: sohan.n@somaiya.edu
  - Portfolio: placeholder `https://sohan-narewadi.dev` (dummy; a single
    constant in `config.json` to change later)
- **Publishing:** built and previewed locally; nothing is pushed or created on
  GitHub without explicit approval. `gh` is not installed.

## Repo layout
```
Sohan-Narewadi/
├── README.md                      # assembled from template by build script
├── config.json                    # name, tagline, links, palette, featured list
├── projects.json                  # per-project description, tags, order, static flag
├── assets/                        # generated SVGs (committed)
├── scripts/build.mjs              # fetch GitHub data → render SVGs + README.md
├── scripts/README.template.md
├── .github/workflows/update.yml   # every 6h + on push + manual dispatch
└── docs/superpowers/specs/
```

## README sections (top to bottom)
1. **Hero** — animated aurora wave banner, name, typing line.
2. **About** — glass card: short bio (student/early-career software developer),
   quick facts.
3. **Tech stack** — glowing pills grouped by area; languages seeded from the
   real repos (Java, C, JavaScript, HTML/CSS, Python/Jupyter).
4. **Featured projects** — glass SVG cards, one per project: title,
   description, tech tags, stars + last-pushed date (live projects only), link.
5. **Currently working on** — the 3 most recently pushed repos (live).
6. **Stats** — language breakdown, total repos/stars, recent-activity summary,
   as aurora-styled SVGs.
7. **Contribution snake** — recolored to the aurora palette.
8. **Connect** — LinkedIn, Email, Portfolio buttons + footer wave.

## Projects
Live (read via GitHub API from `Sohan-Narewadi`): MediBridge, QUIZ_BATTLE,
Flutter---Mini-Project---CodeWar, smart_irrigation_3d,
Supermarket-Customer-Purchase-Analysis, DS_IA_Browser_Manager, plus the web
repos (optimizer_117, Travel-and-Tourism ×2, FSDL exp 2/4) grouped in a compact
"More builds" row rather than full cards.

Static (SIH 2026, links only — repos returned 404 to unauthenticated API
requests, so they are private or hidden; no live stats are possible):
- OceanEmbed — https://github.com/arsiwalamoiz24/OceanEmbed-SIH-2026
- SIH-26 Internal Round — https://github.com/arsiwalamoiz24/SIH-26-internal-round

Static cards carry a "Smart India Hackathon 2026" badge. Their descriptions come
from the owner's one-line summaries stored in `projects.json`; the card omits any
detail the owner has not provided rather than inventing it.

## Dynamic behavior
`update.yml` runs `build.mjs` with the built-in `GITHUB_TOKEN`. It re-renders
the SVGs and README, then commits only if files changed. Cron: every 6 hours.

## Theming
Dark glass surfaces with a fixed aurora palette baked into the SVGs, so they
render correctly in both light and dark GitHub themes.

## Error handling
- API failure or rate limit: keep the previously committed SVGs; the workflow
  logs the error and exits non-zero without overwriting assets.
- Repo with no description: use the description from `projects.json`.
- Missing static-card data: render the card without that field.

## Testing / verification
- `node scripts/build.mjs --offline` renders from a saved API fixture so the
  layout can be checked without network access.
- Every generated SVG is opened in a browser and screenshotted at desktop and
  narrow (mobile) GitHub widths before delivery.
- README links checked for 200/valid targets (external links excluding private
  repos).

## Out of scope
Portfolio website (dummy link only), blog feed, visitor counters, music widgets.
