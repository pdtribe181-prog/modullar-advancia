# Cursor: skills and subagents — do you need them?

Short answer: **Skills are optional but useful** for this repo. **Subagents you don’t create** — they’re built into Cursor.

---

## 1. What are “skills”?

**Skills** are markdown instructions (e.g. in `.cursor/skills/` or `~/.cursor/skills/`) that tell the AI how to do specific tasks in a consistent way: commit format, code review, API patterns, or “when working in this repo, follow these conventions.”

- **Project skill** (`.cursor/skills/` in this repo): shared with everyone who clones the repo; good for repo-specific rules.
- **Personal skill** (`~/.cursor/skills/`): only on your machine; good for your own workflows across projects.

**Are they needed?** No. They’re **optional**. Use them when you want the agent to:
- Always follow the same conventions (e.g. use `docs/` for infra/domains, Supabase not Prisma, Vite not webpack).
- Do a repeated workflow the same way (e.g. “before merging, check X and Y”).
- Stick to your commit message or PR format.

---

## 2. What are “subagents”?

**Subagents** here means Cursor’s built-in task agents (e.g. “explore” for codebase search, “shell” for commands, “general” for multi-step tasks). They are **invoked by the AI when needed**; you don’t create or configure them in this repo.

- You don’t add “subagent” files to the project.
- You don’t need to “create” subagents for modullar-advancia.
- If the AI decides a task needs a deeper search or a shell run, it can use those tools; no repo setup required.

So: **you don’t need to create or configure subagents** — they’re part of Cursor, not your codebase.

---

## 3. Recommendation for this repo

| Thing            | Needed? | Suggestion |
|------------------|--------|------------|
| **Skills**       | Optional | **Useful.** One small project skill that points the agent at `docs/` and key stack facts (Supabase, Vite, domains) keeps behavior consistent. We added `.cursor/skills/advancia-conventions/` for that. |
| **Subagents**    | No setup | Don’t create anything. Cursor’s agents are built-in. |
| **Cursor rules** | Optional | If you want strict rules (e.g. “never use Prisma”), you can add `.cursor/rules` or a RULE.md; the skill can reference that. |

---

## 4. What we added (optional skill)

- **Path:** `.cursor/skills/advancia-conventions/`
- **Role:** When working in this repo, the agent is reminded to use `docs/` for infra, domains, payments, and to assume Supabase (no Prisma/Neon), Vite (no webpack), and the three app domains.
- **Scope:** Project-only; anyone cloning the repo gets the same behavior if they use Cursor with skills enabled.

You can delete `.cursor/skills/advancia-conventions/` anytime if you don’t want it; the app doesn’t depend on it.

---

## 5. Summary

- **Skills:** Optional; we added one lightweight project skill for conventions and docs.
- **Subagents:** No need to create or configure; they’re part of Cursor.
- To add more skills later (e.g. “code review” or “release checklist”), use the structure in Cursor’s “create skill” guidance and put them under `.cursor/skills/<skill-name>/SKILL.md`.
