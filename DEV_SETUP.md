# Dev Setup

This repo supports both Windows-native and WSL2 development. For best reliability (especially with Node + Playwright), WSL2 Ubuntu is preferred.

## Prereqs

- Node.js **20.x**
- Git

Optional but recommended:

- WSL2 Ubuntu (Windows)

## Option A: Windows (native)

```bash
git clone https://github.com/pdtribe181-prog/modullar-advancia.git
cd modullar-advancia
npm install

copy .env.example .env
```

Backend:

```bash
npm run dev
# http://127.0.0.1:3000
```

Frontend:

```bash
cd frontend
npm install

# Local dev defaults bind to 127.0.0.1:5173
npm run dev
# http://127.0.0.1:5173
```

Frontend API base (Vite):

- `frontend/.env` is ignored by git (do not commit it)
- Use `VITE_API_URL=http://127.0.0.1:3000/api/v1`

## Option B: WSL2 Ubuntu (recommended)

From PowerShell (Windows), run the helper script inside WSL. Replace `<YOU>` with your Windows username (e.g. `mucha.DESKTOP-H7T9NPM`). If the repo is in a nested folder `modullar-advancia/modullar-advancia`, use that in the path:

```powershell
wsl.exe -d Ubuntu -- bash -lc "bash /mnt/c/Users/<YOU>/modullar-advancia/modullar-advancia/scripts/wsl-setup-node.sh"
```

**WSL config summary:** See [docs/WSL_CONFIG.md](docs/WSL_CONFIG.md) for repo vs system settings and optional `.wslconfig`.

What it does:

- Installs/loads `nvm`
- Installs Node based on `.nvmrc` (defaults to 20)
- Adds an `nvm` init block to `~/.bashrc` / `~/.profile`

Then open the repo in VS Code using Remote-WSL and run the same `npm` commands as above.

## Testing

Backend unit tests:

```bash
npm test
```

Playwright:

```bash
npm run test:e2e:api   # API-only (fast, good for PRs)
npm run test:e2e       # Full UI + API
```

## Maintainers: Required checks (GitHub)

Branch protection can’t be set from this repo. In GitHub:

1. Settings → Branches → Add rule for `main`
2. Enable **Require status checks to pass before merging**
3. Select the checks you want to require (typically the `ci.yml` workflow + Security Scan)
