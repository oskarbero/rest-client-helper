#!/usr/bin/env node
/**
 * Universal Electron setup script that works on Windows, macOS, and Linux
 * Downloads Electron for the current platform and wires it into node_modules/electron/dist
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON = path.join(PROJECT_ROOT, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
const ELECTRON_VERSION = packageJson.devDependencies.electron.replace(/[^0-9.]/g, '');
const ELECTRON_DIR = path.join(PROJECT_ROOT, 'node_modules', 'electron');
const DIST_DIR = path.join(ELECTRON_DIR, 'dist');

const platform = os.platform();
const arch = os.arch();

function getPlatformInfo() {
  if (platform === 'win32') {
    const zipArch = arch === 'x64' ? 'x64' : 'ia32';
    return {
      zipName: `electron-v${ELECTRON_VERSION}-win32-${zipArch}.zip`,
      pathTxt: 'electron.exe',
      script: path.join(__dirname, 'setup-electron-windows.ps1')
    };
  } else if (platform === 'darwin') {
    const zipArch = arch === 'arm64' ? 'arm64' : 'x64';
    return {
      zipName: `electron-v${ELECTRON_VERSION}-darwin-${zipArch}.zip`,
      pathTxt: 'Electron.app/Contents/MacOS/Electron',
      script: path.join(__dirname, 'setup-electron-mac.sh')
    };
  } else if (platform === 'linux') {
    const zipArch = arch === 'arm64' ? 'arm64' : arch === 'arm' ? 'armv7l' : 'x64';
    return {
      zipName: `electron-v${ELECTRON_VERSION}-linux-${zipArch}.zip`,
      pathTxt: 'electron',
      script: path.join(__dirname, 'setup-electron-linux.sh')
    };
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

function main() {
  // Check if electron package exists
  if (!fs.existsSync(ELECTRON_DIR)) {
    console.error('electron package not installed. Run \'npm install\' first.');
    process.exit(1);
  }

  const platformInfo = getPlatformInfo();
  console.log(`Detected platform: ${platform} (${arch})`);
  console.log(`Using script: ${path.basename(platformInfo.script)}`);

  // Run the platform-specific script
  try {
    if (platform === 'win32') {
      // On Windows, use PowerShell
      execSync(`powershell.exe -ExecutionPolicy Bypass -File "${platformInfo.script}"`, {
        stdio: 'inherit',
        cwd: PROJECT_ROOT
      });
    } else {
      // On Unix-like systems, use bash
      execSync(`bash "${platformInfo.script}"`, {
        stdio: 'inherit',
        cwd: PROJECT_ROOT
      });
    }
  } catch (error) {
    console.error(`Failed to run setup script: ${error.message}`);
    process.exit(1);
  }
}

main();
