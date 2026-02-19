# Branch Protection Rules

Configure these rules at **Settings → Branches → Add branch protection rule**.

---

## `main` Branch (Production)

| Setting | Value |
|---------|-------|
| **Pattern** | `main` |
| Require a pull request before merging | ✅ |
| — Required approvals | 1 |
| — Dismiss stale reviews on new push | ✅ |
| — Require review from code owners | ✅ (if CODEOWNERS defined) |
| Require status checks to pass | ✅ |
| — Required checks | `lint`, `test-backend`, `test-frontend`, `All Tests Passed` |
| — Require up-to-date branch | ✅ |
| Require signed commits | ✅ (recommended) |
| Require linear history | ✅ (squash merges) |
| Include administrators | ✅ |
| Restrict who can push | `pdtribe181-prog`, GitHub Actions bot |
| Allow force pushes | ❌ |
| Allow deletions | ❌ |

---

## `develop` Branch (Staging)

| Setting | Value |
|---------|-------|
| **Pattern** | `develop` |
| Require a pull request before merging | ✅ |
| — Required approvals | 0 (self-merge allowed for solo dev) |
| Require status checks to pass | ✅ |
| — Required checks | `lint`, `test-backend`, `All Tests Passed` |
| — Require up-to-date branch | ✅ |
| Allow force pushes | ❌ |
| Allow deletions | ❌ |

---

## Feature Branches (`feature/*`, `fix/*`, `chore/*`)

No protection rules required — developers merge to `develop` via PR.

### Recommended PR workflow

```
feature/* → develop (PR, 0 required reviewers)
develop   → main    (PR, 1 required reviewer + CI green)
main      → tag     (manual: git tag v1.2.3 && git push --tags)
```

---

## Required Status Checks

These job names must match exactly what appears in the CI workflow:

- `Lint & Type Check`
- `Backend Tests`  
- `Frontend Tests`
- `All Tests Passed`
- `Build`

---

## Setting Up via GitHub CLI

```bash
# Protect main
gh api repos/pdtribe181-prog/modullar-advancia/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["All Tests Passed","Build"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null

# Protect develop
gh api repos/pdtribe181-prog/modullar-advancia/branches/develop/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["All Tests Passed"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":0}' \
  --field restrictions=null
```
