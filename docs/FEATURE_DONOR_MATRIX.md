# Feature Donor Matrix

Use this document to decide what can be borrowed into the canonical repo without turning multiple repos into parallel production sources.

## Rule

- Build and deploy production from `pdtribe181-prog/modullar-advancia` only.
- Pull ideas or isolated features from other repos intentionally, with review, tests, and adaptation to the current stack.

## Repo Assessment

| Repo | What it is good for | What to avoid copying wholesale |
|------|---------------------|----------------------------------|
| `muchaeljohn739337-art/advanciapayledger-new1` | Mobile app structure, rich sitemap/content inventory, alternate admin UX ideas | Its repo layout, duplicate product docs, and separate deployment story |
| `pbigstop/advancia-pay-ledger` | Ledger-focused workflows, withdrawal flows, Redis stream concepts, scheduler ideas | Running a second backend/frontend for the same live domains |
| `advancia-devuser/advancia-healthcare1` | Smart wallet, passkey, and account-abstraction R&D | Replacing the current production stack with a separate Next.js/Alchemy app |
| `muchaeljohn739337-art/modular-saas-platform-nw` | Long-range architecture reference only | Microservices, K8s, Terraform, and parallel platform migration without a formal rewrite plan |
| `muchaeljohn739337-art/modular-prop-1` | Delivery notes, deployment checklists, packaging ideas | Copying nested variant codebases back into production |

## Recommended Intake Order

1. Small feature slices from `pbigstop/advancia-pay-ledger` that strengthen ledger, withdrawal, or monitoring capabilities.
2. Mobile and information-architecture ideas from `advanciapayledger-new1`.
3. Select smart-wallet concepts from `advancia-healthcare1` only if they fit a clearly scoped roadmap.

## Intake Checklist

1. Define the feature in `modullar-advancia` terms first.
2. Copy only the minimum code or UX pattern required.
3. Rework it to the current Express + Vite + Supabase + Stripe architecture.
4. Add tests in the canonical repo.
5. Do not preserve domain or deployment assumptions from donor repos.