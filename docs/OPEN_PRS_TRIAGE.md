# Open pull requests — triage

**Applied on main:** The same fixes as **#13** (workflows use @v4; health handler fine) and **#23** (E2E CORS fallback `localhost:5173`, Node 18 removed from `automated-testing.yml`) are now on `main`. Merge those PRs when they become mergeable, or close them.

---

## List (newest first)

| # | Title | Author | Status | Suggested |
|---|--------|--------|--------|-----------|
| [23](https://github.com/pdtribe181-prog/modullar-advancia/pull/23) | Fix E2E CORS test and remove unsupported Node 18 from automated-testing matrix | Copilot | Review required | Fix applied on main; merge or close |
| [21](https://github.com/pdtribe181-prog/modullar-advancia/pull/21) | Fix failing CI workflows: E2E CORS test origin, Node 18 matrix incompatibility, codecov v5 | Copilot | **Draft** | Mark ready or merge; overlaps with #23 — pick one |
| [20](https://github.com/pdtribe181-prog/modullar-advancia/pull/20) | Add Cloudflare Workers configuration | cloudflare-workers-and-pages bot | Review required | Review only if you use Cloudflare Workers; else close |
| [18](https://github.com/pdtribe181-prog/modullar-advancia/pull/18) | chore(actions): bump codecov/codecov-action from 4 to 5 | Dependabot | Review required | Safe to merge (dependency bump) |
| [17](https://github.com/pdtribe181-prog/modullar-advancia/pull/17) | chore(actions): bump actions/checkout from 4 to 6 | Dependabot | Review required | Safe to merge (dependency bump) |
| [16](https://github.com/pdtribe181-prog/modullar-advancia/pull/16) | chore(actions): bump actions/setup-node from 4 to 6 | Dependabot | Review required | Safe to merge (dependency bump) |
| [13](https://github.com/pdtribe181-prog/modullar-advancia/pull/13) | Fix ESLint no-useless-assignment error and invalid GitHub Actions versions | Copilot | Not mergeable (review/CI?) | Fixes on main; merge when mergeable or close |

---

## Suggested merge order

1. **#13** — ESLint + Actions fixes (unblocks clean CI).
2. **#16, #17, #18** — Dependabot bumps (checkout, setup-node, codecov); merge in any order after CI is green.
3. **#21 or #23** — Pick one CI/E2E fix (they overlap). Prefer **#23** if it’s the slimmer fix; close #21 as duplicate or merge it and close #23.
4. **#20** — Only if you want Cloudflare Workers config in this repo; otherwise close.
5. **docs/repo-map-and-banner** (if still open) — Docs-only; merge when convenient.

---

## How to merge (in order)

Do these from the repo root with GitHub CLI (`gh`) installed and authenticated, or use the GitHub UI (PR page → “Merge pull request”).

**1. Merge #13 (ESLint + Actions fixes)**  
- GitHub UI: [PR #13](https://github.com/pdtribe181-prog/modullar-advancia/pull/13) → Merge pull request.  
- Or: `gh pr merge 13 --squash` (or `--merge`).

**2. Merge Dependabot PRs #16, #17, #18** (any order after CI is green)  
- `gh pr merge 16 --squash`  
- `gh pr merge 17 --squash`  
- `gh pr merge 18 --squash`

**3. Pick one of #21 or #23 (CI/E2E fix)**  
- Prefer **#23** if it’s the slimmer fix: `gh pr merge 23 --squash`.  
- Then close #21 as duplicate, or merge #21 and close #23.

**4. #20 (Cloudflare Workers)**  
- Merge only if you use Cloudflare Workers in this repo; otherwise close: `gh pr close 20`.

**5. After all merges**  
- Locally: `git pull origin main`  
- If you use the mirror: `npm run push:mirror`

---

## Quick links

- [All open PRs](https://github.com/pdtribe181-prog/modullar-advancia/pulls)
- [PRs with no review](https://github.com/pdtribe181-prog/modullar-advancia/pulls?q=is%3Apr+is%3Aopen+review%3Anone)
