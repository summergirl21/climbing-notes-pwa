#!/usr/bin/env bash
set -euo pipefail

log() { printf "\033[1;34m[setup]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$*"; }
error() { printf "\033[1;31m[error]\033[0m %s\n" "$*"; }

# Best effort: install Node via nvm (default) or Homebrew (--use-brew).
# After Node is available, runs `npm install`.

USE_BREW=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --use-brew) USE_BREW=1 ;;
    *) error "Unknown flag: $1"; exit 1 ;;
  esac
  shift
done

command_exists() { command -v "$1" >/dev/null 2>&1; }

report_detected_tools() {
  log "Checking existing tools..."
  if command_exists node; then
    log "Node present: $(node -v)"
  else
    warn "Node not found."
  fi

  if command_exists npm; then
    log "npm present: $(npm -v)"
  else
    warn "npm not found."
  fi

  if command_exists nvm; then
    log "nvm present: $(nvm --version 2>/dev/null || echo 'detected')"
  fi

  if command_exists brew; then
    log "Homebrew present: $(brew --version | head -n1)"
  fi

  if command_exists python3; then
    log "python3 present: $(python3 -V)"
  fi
}

ensure_command_line_tools() {
  if [[ "$(uname -s)" == "Darwin" ]] && ! xcode-select -p >/dev/null 2>&1; then
    warn "Command Line Tools not found. Install via: xcode-select --install"
  fi
}

install_node_with_nvm() {
  if ! command_exists curl; then
    error "curl is required to install nvm. Install Command Line Tools or Homebrew first."
    exit 1
  fi
  if ! command_exists nvm; then
    log "Installing nvm..."
    export NVM_DIR="${HOME}/.nvm"
    mkdir -p "${NVM_DIR}"
    # shellcheck disable=SC1090
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    # shellcheck disable=SC1091
    source "${NVM_DIR}/nvm.sh"
  else
    log "nvm already installed."
  fi
  # shellcheck disable=SC1091
  [[ -s "${HOME}/.nvm/nvm.sh" ]] && source "${HOME}/.nvm/nvm.sh"
  log "Installing latest LTS Node..."
  nvm install --lts
  nvm use --lts
}

install_node_with_brew() {
  if ! command_exists brew; then
    error "Homebrew not found. Install from https://brew.sh first."
    exit 1
  fi
  ensure_command_line_tools
  log "Installing Node via Homebrew..."
  brew install node
}

ensure_node() {
  if command_exists node && command_exists npm; then
    log "Node $(node -v) already installed."
    return
  fi
  if [[ "${USE_BREW}" -eq 1 ]]; then
    install_node_with_brew
  else
    install_node_with_nvm
  fi
}

main() {
  ensure_command_line_tools
  report_detected_tools
  ensure_node
  log "Installing project dependencies..."
  npm install
  if [[ ! -x "node_modules/.bin/convex" ]]; then
    log "Installing Convex CLI dependency..."
    npm install --save-dev convex
  else
    log "Convex CLI already installed."
  fi
  log "Done. Build with: npm run build"
}

main "$@"
