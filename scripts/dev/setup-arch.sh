#!/usr/bin/env bash

set -euo pipefail

PACKAGES=(

  nodejs npm
  rustup

  webkit2gtk-4.1
  gtk3
  openssl
  sqlite
  pkgconf

  libayatana-appindicator
  libappindicator-gtk3

  linux-headers
  base-devel
  curl
  file
  wget
  appmenu-gtk-module
  librsvg
  imagemagick
)

missing=()
for pkg in "${PACKAGES[@]}"; do
  if pacman -Qi "$pkg" >/dev/null 2>&1; then
    printf '  ok    %s\n' "$pkg"
  else
    missing+=("$pkg")
    printf '  MISS  %s\n' "$pkg"
  fi
done

if [ ${#missing[@]} -eq 0 ]; then
  echo "All system dependencies are installed."
  exit 0
fi

echo
echo "Installing ${#missing[@]} missing package(s): ${missing[*]}"
echo "This needs sudo. Continuing..."
sudo pacman -S --needed --noconfirm "${missing[@]}"
echo
echo "Done. Next: npm install && npm run dev"
