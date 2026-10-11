#!/usr/bin/env bash
# Install a Wolf launcher into the Linux application bar.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

APP_ID="wolf"
APP_NAME="Wolf"
BIN_DIR="${HOME}/.local/bin"
APP_DIR="${HOME}/.local/share/applications"
ICON_SRC="${PROJECT_ROOT}/src-tauri/icons/icon.png"
ICON_DST="${HOME}/.local/share/icons/wolf.png"
WRAPPER="${BIN_DIR}/wolf"

mkdir -p "${BIN_DIR}" "${APP_DIR}" "${HOME}/.local/share/icons"

find_launch() {
  local candidates=(
    "${PROJECT_ROOT}/src-tauri/target/release/wolf"
    "${PROJECT_ROOT}/src-tauri/target/debug/wolf"
    "$(command -v wolf || true)"
  )
  for candidate in "${candidates[@]}"; do
    if [[ -n "${candidate}" && -x "${candidate}" ]]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done
  return 1
}

LAUNCH_TARGET="$(find_launch || true)"

cat > "${WRAPPER}" <<WRAP
#!/usr/bin/env bash
set -euo pipefail
TARGET="${LAUNCH_TARGET}"
if [[ -n "\${TARGET}" && -x "\${TARGET}" ]]; then
  exec "\${TARGET}" "\$@"
fi
if command -v npm >/dev/null 2>&1; then
  cd "${PROJECT_ROOT}"
  exec npm run tauri -- dev
fi
echo "Wolf is not built yet. Run: cd ${PROJECT_ROOT} && npm run tauri -- build" >&2
exit 1
WRAP
chmod +x "${WRAPPER}"

if [[ -f "${ICON_SRC}" ]]; then
  cp "${ICON_SRC}" "${ICON_DST}"
  ICON_VALUE="${ICON_DST}"
else
  ICON_VALUE="${APP_ID}"
fi

cat > "${APP_DIR}/${APP_ID}.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=${APP_NAME}
Comment=Local-first productivity companion
Exec=${WRAPPER}
Icon=${ICON_VALUE}
Terminal=false
Categories=Utility;Office;
StartupWMClass=${APP_NAME}
DESKTOP

chmod +x "${APP_DIR}/${APP_ID}.desktop"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${APP_DIR}" >/dev/null 2>&1 || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1 && [[ -f "${ICON_DST}" ]]; then
  gtk-update-icon-cache "${HOME}/.local/share/icons" >/dev/null 2>&1 || true
fi

echo "Wolf launcher installed."
echo "  Executable: ${WRAPPER}"
echo "  Shortcut:   ${APP_DIR}/${APP_ID}.desktop"
echo "Make sure ${BIN_DIR} is on your PATH."
