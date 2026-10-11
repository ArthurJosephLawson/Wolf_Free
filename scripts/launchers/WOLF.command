#!/usr/bin/env bash
# Install a Wolf launcher as a macOS .app bundle.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

APP_NAME="Wolf"
DEST_ROOT="${1:-${HOME}/Applications}"
APP_BUNDLE="${DEST_ROOT}/${APP_NAME}.app"
ICON_SRC="${PROJECT_ROOT}/src-tauri/icons/icon.png"

mkdir -p "${DEST_ROOT}"

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

rm -rf "${APP_BUNDLE}"
mkdir -p "${APP_BUNDLE}/Contents/MacOS" "${APP_BUNDLE}/Contents/Resources"

cat > "${APP_BUNDLE}/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>${APP_NAME}</string>
  <key>CFBundleDisplayName</key><string>${APP_NAME}</string>
  <key>CFBundleIdentifier</key><string>dev.wolf.desktop</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>Wolf</string>
  <key>CFBundleIconFile</key><string>icon.icns</string>
  <key>LSMinimumSystemVersion</key><string>10.15</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

cat > "${APP_BUNDLE}/Contents/MacOS/Wolf" <<RUN
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
RUN
chmod +x "${APP_BUNDLE}/Contents/MacOS/Wolf"

if [[ -f "${ICON_SRC}" ]]; then
  cp "${ICON_SRC}" "${APP_BUNDLE}/Contents/Resources/icon.png"
  if command -v sips >/dev/null 2>&1 && command -v iconutil >/dev/null 2>&1; then
    ICONSET="$(mktemp -d)/icon.iconset"
    mkdir -p "${ICONSET}"
    for size in 16 32 64 128 256 512; do
      sips -z "${size}" "${size}" "${ICON_SRC}" --out "${ICONSET}/icon_${size}x${size}.png" >/dev/null 2>&1 || true
      double=$((size * 2))
      sips -z "${double}" "${double}" "${ICON_SRC}" --out "${ICONSET}/icon_${size}x${size}@2x.png" >/dev/null 2>&1 || true
    done
    iconutil -c icns "${ICONSET}" -o "${APP_BUNDLE}/Contents/Resources/icon.icns" >/dev/null 2>&1 || true
  fi
fi

echo "Wolf installed at ${APP_BUNDLE}"
