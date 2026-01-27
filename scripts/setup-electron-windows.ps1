# Downloads Electron for Windows and wires it into node_modules/electron/dist
# so `npm start` uses the local binary without hitting the network.

$ErrorActionPreference = "Stop"

$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$PACKAGE_JSON = Join-Path $PROJECT_ROOT "package.json"
$ELECTRON_VERSION = (Get-Content $PACKAGE_JSON | ConvertFrom-Json).devDependencies.electron -replace '[^0-9.]', ''
$ELECTRON_DIR = Join-Path $PROJECT_ROOT "node_modules\electron"
$DIST_DIR = Join-Path $ELECTRON_DIR "dist"
$ARCH = if ($env:PROCESSOR_ARCHITECTURE -eq "AMD64") { "x64" } else { "ia32" }
$ZIP_NAME = "electron-v${ELECTRON_VERSION}-win32-${ARCH}.zip"
$MIRROR_URL = "https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/${ZIP_NAME}"
$ZIP_PATH = Join-Path $PROJECT_ROOT $ZIP_NAME

function Ensure-ElectronPackage {
    if (-not (Test-Path $ELECTRON_DIR)) {
        Write-Error "electron package not installed. Run 'npm install' first."
        exit 1
    }
}

function Download-Zip {
    if (Test-Path $ZIP_PATH) {
        Write-Host "Reusing existing $ZIP_NAME"
        return
    }
    Write-Host "Downloading $ZIP_NAME from $MIRROR_URL"
    try {
        Invoke-WebRequest -Uri $MIRROR_URL -OutFile $ZIP_PATH -UseBasicParsing
    } catch {
        Write-Error "Failed to download Electron: $_"
        exit 1
    }
}

function Unpack-Zip {
    New-Item -ItemType Directory -Force -Path $DIST_DIR | Out-Null
    Remove-Item -Path "$DIST_DIR\*" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Unzipping to $DIST_DIR"
    Expand-Archive -Path $ZIP_PATH -DestinationPath $DIST_DIR -Force
}

function Write-PathTxt {
    "electron.exe" | Out-File -FilePath (Join-Path $ELECTRON_DIR "path.txt") -Encoding ASCII -NoNewline
}

# Main execution
Ensure-ElectronPackage
Download-Zip
Unpack-Zip
Write-PathTxt
Write-Host "Electron ${ELECTRON_VERSION} is installed locally at $DIST_DIR"
Write-Host "Try: cd `"$PROJECT_ROOT`" && npx electron --version"
