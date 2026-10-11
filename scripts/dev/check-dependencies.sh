#!/usr/bin/env bash

set -uo pipefail

fail=0
warn=0

ok()   { printf '  \033[32mok\033[0m    %s\n' "$1"; }
bad()  { printf '  \033[31mMISS\033[0m  %s\n' "$1"; fail=$((fail + 1)); }
soft() { printf '  \033[33mwarn\033[0m  %s\n' "$1"; warn=$((warn + 1)); }

have() { command -v "$1" >/dev/null 2>&1; }

echo "Wolf dependency check"
echo
echo "Toolchain"
if have node;  then ok "node $(node --version)";  else bad "node (Node.js 20+)"; fi
if have npm;   then ok "npm $(npm --version)";    else bad "npm"; fi
if have cargo; then ok "cargo $(cargo --version | cut -d' ' -f2)"; else bad "cargo (rustup)"; fi
if have pkg-config; then ok "pkg-config"; else bad "pkg-config"; fi

echo
echo "Native libraries (Tauri v2 on Linux)"
check_lib() {

  local name="$1"; shift
  local mod
  for mod in "$@"; do
    if pkg-config --exists "$mod" 2>/dev/null; then
      ok "$name ($mod $(pkg-config --modversion "$mod"))"
      return 0
    fi
  done
  bad "$name (tried: $*)"
}

check_lib "WebKitGTK" webkit2gtk-4.1 webkit2gtk-4.0
check_lib "GTK 3" gtk+-3.0 gtk4
check_lib "OpenSSL" openssl
check_lib "libsoup" libsoup-3.0 libsoup-2.4

echo
echo "Optional (nice to have)"
if [ -n "${WAYLAND_DISPLAY:-}" ]; then
  ok "Wayland session (${XDG_CURRENT_DESKTOP:-unknown})"
else
  soft "no Wayland display detected - the tray icon needs a StatusNotifier host"
fi

echo
if [ "$fail" -gt 0 ]; then
  printf '\033[31m%d missing requirement(s).\033[0m Run: bash scripts/dev/setup-arch.sh\n' "$fail"
  exit 1
fi
if [ "$warn" -gt 0 ]; then
  echo "All hard requirements are present ($warn optional note(s) above)."
else
  echo "All requirements are present."
fi
