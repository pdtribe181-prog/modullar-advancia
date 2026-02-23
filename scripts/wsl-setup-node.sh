#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID:-$(id -u)}" -eq 0 ]; then
  echo "ERROR: Do not run this script as root. Run it as your normal WSL user." >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

echo "WSL Node setup (nvm)"
echo "- Repo: ${REPO_DIR}"

need_cmd() { command -v "$1" >/dev/null 2>&1; }

if need_cmd apt-get; then
  missing_cmds=()
  for c in curl git make gcc g++; do
    if ! need_cmd "$c"; then
      missing_cmds+=("$c")
    fi
  done

  if [ "${#missing_cmds[@]}" -gt 0 ]; then
    echo "Missing prerequisites: ${missing_cmds[*]}"
    if need_cmd sudo && sudo -n true 2>/dev/null; then
      echo "Installing base packages via sudo (non-interactive)..."
      sudo apt-get update -y >/dev/null
      sudo apt-get install -y curl ca-certificates git build-essential >/dev/null
    elif [ -t 1 ] && need_cmd sudo; then
      echo "Installing base packages via sudo (interactive)..."
      sudo apt-get update -y
      sudo apt-get install -y curl ca-certificates git build-essential
    else
      echo "ERROR: Can't install missing packages non-interactively (sudo password required)." >&2
      echo "Open an Ubuntu WSL terminal and run:" >&2
      echo "  sudo apt-get update -y && sudo apt-get install -y curl ca-certificates git build-essential" >&2
      exit 1
    fi
  fi
fi

NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [ ! -s "${NVM_DIR}/nvm.sh" ]; then
  echo "Installing nvm into ${NVM_DIR}..."
  mkdir -p "${NVM_DIR}"
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

# shellcheck disable=SC1090
source "${NVM_DIR}/nvm.sh"

NODE_VERSION="20"
if [ -f "${REPO_DIR}/.nvmrc" ]; then
  NODE_VERSION="$(tr -d ' \t\r\n' < "${REPO_DIR}/.nvmrc")"
fi

echo "Installing/using Node ${NODE_VERSION}..."
nvm install "${NODE_VERSION}" >/dev/null
nvm alias default "${NODE_VERSION}" >/dev/null
nvm use "${NODE_VERSION}" >/dev/null

echo "Node: $(node -v)"
echo "npm:  $(npm -v)"

# Ensure nvm loads in interactive shells.
NVM_INIT_BLOCK=$'export NVM_DIR="$HOME/.nvm"\n[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"\n'

append_once() {
  local file="$1"
  local marker="$2"
  if [ ! -f "$file" ]; then
    touch "$file"
  fi
  if ! grep -Fq "$marker" "$file"; then
    {
      echo
      echo "# nvm"
      echo "$NVM_INIT_BLOCK"
    } >> "$file"
  fi
}

append_once "$HOME/.bashrc" 'export NVM_DIR="$HOME/.nvm"'
append_once "$HOME/.profile" 'export NVM_DIR="$HOME/.nvm"'

echo "Done. Open a new WSL terminal to pick up shell init changes."

