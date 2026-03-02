# SSH key setup — one key for all repos

Use one SSH key so you can push/pull to all GitHub repos (modullar-advancia, advancia-get-together, etc.) without re-entering credentials.

---

## 1. Current setup in this repo

Remotes are configured to use SSH:

| Remote   | URL (SSH) |
|----------|-----------|
| `origin` | `git@github.com:pdtribe181-prog/modullar-advancia.git` |
| `together` | `git@github.com:pdtribe181-prog/advancia-get-together.git` |

- **Push to main repo:** `git push origin main`
- **Push to together:** `git push together <branch>`
- **Pull:** `git pull origin main` or `git pull together <branch>`

---

## 2. Use the same key for all repos

Your SSH key is in `~/.ssh/` (e.g. `id_ed25519` / `id_ed25519.pub`). GitHub uses the **public key** you add to your account; it works for every repo you can access.

### Add the key to GitHub (once)

1. Copy your **public** key to the clipboard:
   - **Windows (PowerShell):**  
     `Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard`
   - Or open `%USERPROFILE%\.ssh\id_ed25519.pub` and copy the full line.
2. On GitHub: **Settings → SSH and GPG keys → New SSH key**.
3. Paste the key, give it a name (e.g. "Advancia dev"), save.

After that, **all** repos under `pdtribe181-prog` (and any org you use this key for) will use this key over SSH.

---

## 3. Test connection

From any folder:

```bash
ssh -T git@github.com
```

You should see something like: `Hi pdtribe181-prog! You've successfully authenticated...`

---

## 4. Use SSH in other clones

For any other repo you want to connect with the same key:

- **When cloning:**  
  `git clone git@github.com:pdtribe181-prog/REPO_NAME.git`
- **Existing clone with HTTPS:** switch to SSH:
  ```bash
  git remote set-url origin git@github.com:pdtribe181-prog/REPO_NAME.git
  ```

No need for a different key per repo; one key per machine (or per purpose) is enough.

---

## 5. Optional: multiple keys (e.g. work vs personal)

If you later use a second key (e.g. `id_ed25519_work`), configure `~/.ssh/config`:

```
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
```

Use a different `Host` (e.g. `github-work`) and `IdentityFile` for the other key, and clone with `git clone git@github-work:pdtribe181-prog/REPO.git` when you want that key.

---

## 6. Troubleshooting

| Issue | What to do |
|-------|------------|
| `Permission denied (publickey)` | Add the **public** key to GitHub (Settings → SSH and GPG keys). |
| `Could not resolve hostname` | Check internet; on VPN, try without or adjust DNS. |
| Wrong key used | Use `ssh -vT git@github.com` to see which key is offered; set `IdentityFile` in `~/.ssh/config` if needed. |
| Remotes still HTTPS | Run `git remote -v` and change URLs to `git@github.com:USER/REPO.git`. |
