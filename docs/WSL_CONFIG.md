# WSL config — repo and system

## Repo-side (this project)

| Item | Location | Purpose |
|------|----------|---------|
| **Node setup script** | `scripts/wsl-setup-node.sh` | Installs nvm, Node from `.nvmrc` (20), adds init to `~/.bashrc` / `~/.profile` |
| **Node version** | `.nvmrc` | `20` (used by script and some tools) |
| **VS Code terminal** | `.vscode/settings.json` | Profile `"WSL: Ubuntu"` with `distribution: "Ubuntu"` so you can open a WSL terminal in VS Code |
| **VS Code extension** | `.vscode/extensions.json` | Recommends `ms-vscode-remote.remote-wsl` for opening the repo in WSL |

## Your WSL distros (from `wsl -l -v`)

- **Ubuntu** (default) — WSL2 — use this for dev; run the setup script from your repo path.
- **docker-desktop** — WSL2 — used by Docker Desktop; no action needed for this repo.

## Recommended Ubuntu setup (WSL2)

### Keep the repo inside the WSL filesystem (recommended)

For best performance and reliable file watching (Vite/Jest/Playwright), **clone and work inside WSL’s Linux filesystem** (ext4), e.g. `~/src/...`.

- **Recommended**: `\\wsl$\Ubuntu\home\<you>\src\modullar-advancia`
- **Avoid for heavy dev**: `/mnt/c/...` (Windows filesystem mount) — often slower and can cause flaky watchers.

Example inside Ubuntu:

```bash
mkdir -p ~/src
cd ~/src
git clone https://github.com/pdtribe181-prog/modullar-advancia.git
cd modullar-advancia
```

Then run the repo setup script from that WSL path:

```bash
bash ./scripts/wsl-setup-node.sh
```

### Ubuntu packages you should have

The script installs the basics (`curl`, `ca-certificates`, `git`, `build-essential`). For E2E/UI testing you’ll also want Playwright’s system deps.

- **Playwright deps (recommended)**:

```bash
cd ~/src/modullar-advancia
npx playwright install --with-deps
```

### Increase file watcher limits (recommended for Vite/Jest)

If you see watcher errors like “ENOSPC” or file changes not being picked up:

```bash
echo 'fs.inotify.max_user_watches=524288' | sudo tee /etc/sysctl.d/99-inotify.conf
sudo sysctl --system
```

### Git line endings (recommended)

Inside WSL, use Linux line endings:

```bash
git config --global core.autocrlf input
```

### When the repo is on Windows (e.g. /mnt/c)

If you keep the repo on the Windows drive, from PowerShell run (replace `<YOU>` with your Windows username):

```powershell
wsl.exe -d Ubuntu -- bash -lc "bash /mnt/c/Users/<YOU>/modullar-advancia/modullar-advancia/scripts/wsl-setup-node.sh"
```

Then open the folder in VS Code via **Remote-WSL** (or use the integrated terminal profile **WSL: Ubuntu**). Prefer cloning into WSL (e.g. `~/src`) for better performance.

## System WSL config (optional)

To change memory, processors, or swap for all WSL2 distros:

1. Create or edit **`C:\Users\<YOU>\.wslconfig`** (Windows side).
2. Example:

   ```ini
   [wsl2]
   memory=8GB
   processors=4
   swap=4GB
   ```

3. Run in PowerShell (admin): `wsl --shutdown`, then start WSL again.

Repo does not ship `.wslconfig`; it is per-machine.
