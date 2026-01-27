#!/usr/bin/env bash
set -euo pipefail

# Downloads Electron for macOS and wires it into node_modules/electron/dist
# so `npm start` uses the local binary without hitting the network.

# ELECTRON_VERSION="28.3.3"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ELECTRON_VERSION=$(jq -r '.devDependencies.electron' "$PROJECT_ROOT/package.json" | sed 's/^[^0-9]*//')
ELECTRON_DIR="$PROJECT_ROOT/node_modules/electron"
DIST_DIR="$ELECTRON_DIR/dist"
ZIP_NAME="electron-v${ELECTRON_VERSION}-darwin-${ARCH:-$(uname -m)}.zip"
MIRROR_URL="https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/${ZIP_NAME}"
ZIP_PATH="$PROJECT_ROOT/${ZIP_NAME}"

main() {
  ensure_electron_package
  download_zip
  unpack_zip
  write_path_txt
  echo "Electron ${ELECTRON_VERSION} is installed locally at $DIST_DIR"
  echo "Try: cd \"$PROJECT_ROOT\" && npx electron --version"
}

ensure_electron_package() {
  if [ ! -d "$ELECTRON_DIR" ]; then
    echo "electron package not installed. Run 'npm install' first." >&2
    exit 1
  fi
}

download_zip() {
  if [ -f "$ZIP_PATH" ]; then
    echo "Reusing existing $ZIP_NAME"
    return
  fi
  echo "Downloading $ZIP_NAME from $MIRROR_URL"
  curl -fL "$MIRROR_URL" -o "$ZIP_PATH"
}

unpack_zip() {
  mkdir -p "$DIST_DIR"
  rm -rf "$DIST_DIR/Electron.app"
  echo "Unzipping to $DIST_DIR"
  unzip -q -o "$ZIP_PATH" -d "$DIST_DIR"
}

write_path_txt() {
  printf "Electron.app/Contents/MacOS/Electron" > "$ELECTRON_DIR/path.txt"
}

main "$@"
