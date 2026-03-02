# Open pull requests — triage

As of the last check, **modullar-advancia** had **7 open PRs**. Suggested order to merge (dependencies first, then docs, then CI/deps).

---

## List (newest first)

| # | Title | Author | Status | Suggested |
|---|--------|--------|--------|-----------|
| [23](https://github.com/pdtribe181-prog/modullar-advancia/pull/23) | Fix E2E CORS test and remove unsupported Node 18 from automated-testing matrix | Copilot | Review required | Merge after #21 if #21 is superseded by this |
| [21](https://github.com/pdtribe181-prog/modullar-advancia/pull/21) | Fix failing CI workflows: E2E CORS test origin, Node 18 matrix incompatibility, codecov v5 | Copilot | **Draft** | Mark ready or merge; overlaps with #23 — pick one |
| [20](https://github.com/pdtribe181-prog/modullar-advancia/pull/20) | Add Cloudflare Workers configuration | cloudflare-workers-and-pages bot | Review required | Review only if you use Cloudflare Workers; else close |
| [18](https://github.com/pdtribe181-prog/modullar-advancia/pull/18) | chore(actions): bump codecov/codecov-action from 4 to 5 | Dependabot | Review required | Safe to merge (dependency bump) |
| [17](https://github.com/pdtribe181-prog/modullar-advancia/pull/17) | chore(actions): bump actions/checkout from 4 to 6 | Dependabot | Review required | Safe to merge (dependency bump) |
| [16](https://github.com/pdtribe181-prog/modullar-advancia/pull/16) | chore(actions): bump actions/setup-node from 4 to 6 | Dependabot | Review required | Safe to merge (dependency bump) |
| [13](https://github.com/pdtribe181-prog/modullar-advancia/pull/13) | Fix ESLint no-useless-assignment error and invalid GitHub Actions versions | Copilot | Review required | Merge (lint + Actions fixes) |

---

## Suggested merge order

1. **#13** — ESLint + Actions fixes (unblocks clean CI).
2. **#16, #17, #18** — Dependabot bumps (checkout, setup-node, codecov); merge in any order after CI is green.
3. **#21 or #23** — Pick one CI/E2E fix (they overlap). Prefer **#23** if it’s the slimmer fix; close #21 as duplicate or merge it and close #23.
4. **#20** — Only if you want Cloudflare Workers config in this repo; otherwise close.
5. **docs/repo-map-and-banner** (if still open) — Docs-only; merge when convenient.

---

## Quick links

- [All open PRs](https://github.com/pdtribe181-prog/modullar-advancia/pulls)
- [PRs with no review](https://github.com/pdtribe181-prog/modullar-advancia/pulls?q=is%3Apr+is%3Aopen+review%3Anone)

After merging, run `git pull origin main` locally and `npm run push:mirror` if you keep the mirror in sync.
