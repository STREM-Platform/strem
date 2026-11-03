# Agent guide

STREM is one monorepo: `apps/mobile` (Expo), `services/*` (FastAPI), `deploy/`
(Docker Compose + scripts), `docs/` (product, ADRs, legal). Read `README.md` first.

- Work from a GitHub issue. Issues labelled `core` are the current goal; `future`
  ones wait until the core is shipped.
- One branch and one pull request per issue (`issueNN-short-name`). Don't merge
  your own PR; the owner tests first.
- Keep it simple. Delete code and docs that nothing uses instead of keeping them
  "for later". Don't add services, repos or abstractions an issue didn't ask for.
- Before a PR: the CI checks for the parts you touched (ruff, mypy, pytest; tsc,
  lint, jest; Playwright for app flows).
- Never commit secrets. `.env` files stay local; `.env.example` holds safe defaults.
- Health data, auth and AI behaviour that affects safety need the owner's review.
