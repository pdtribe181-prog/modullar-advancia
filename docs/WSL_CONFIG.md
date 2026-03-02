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

## One-time setup (WSL2 Ubuntu)

From PowerShell, replace `<YOU>` with your Windows username (e.g. `mucha.DESKTOP-H7T9NPM`):

```powershell
wsl.exe -d Ubuntu -- bash -lc "bash /mnt/c/Users/<YOU>/modullar-advancia/modullar-advancia/scripts/wsl-setup-node.sh"
```

If your repo is at `C:\Users\mucha.DESKTOP-H7T9NPM\modullar-advancia\modullar-advancia`:

```powershell
wsl.exe -d Ubuntu -- bash -lc "bash /mnt/c/Users/mucha.DESKTOP-H7T9NPM/modullar-advancia/modullar-advancia/scripts/wsl-setup-node.sh"
```

Then open the folder in VS Code via **Remote-WSL** (or use the integrated terminal profile **WSL: Ubuntu**).

## System WSL config (optional)

To change memory, processors, or swap for all WSL2 distros:

1. Create or edit **`C:\Users\<YOU>\.wslconfig`** (Windows side).
2. Example:

   ```ini
   [wsl2]
   memory=4GB
   processors=2
   swap=2GB
   ```

3. Run in PowerShell (admin): `wsl --shutdown`, then start WSL again.

Repo does not ship `.wslconfig`; it is per-machine.
