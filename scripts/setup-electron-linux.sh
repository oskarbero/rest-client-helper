#!/usr/bin/env bash
set -euo pipefail

# Downloads Electron for Linux and wires it into node_modules/electron/dist
# so `npm start` uses the local binary without hitting the network.

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ELECTRON_VERSION=$(jq -r '.devDependencies.electron' "$PROJECT_ROOT/package.json" | sed 's/^[^0-9]*//')
ELECTRON_DIR="$PROJECT_ROOT/node_modules/electron"
DIST_DIR="$ELECTRON_DIR/dist"
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) ZIP_ARCH="x64" ;;
  aarch64) ZIP_ARCH="arm64" ;;
  armv7l) ZIP_ARCH="armv7l" ;;
  *) ZIP_ARCH="x64" ;;
esac
ZIP_NAME="electron-v${ELECTRON_VERSION}-linux-${ZIP_ARCH}.zip"
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
  rm -rf "$DIST_DIR/electron"
  echo "Unzipping to $DIST_DIR"
  unzip -q -o "$ZIP_PATH" -d "$DIST_DIR"
}

write_path_txt() {
  printf "electron" > "$ELECTRON_DIR/path.txt"
}

main "$@"
