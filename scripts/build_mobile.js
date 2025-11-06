#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory not found: ${src}`);
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(srcPath);
      fs.symlinkSync(target, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function ensureWebBuild(projectRoot) {
  console.log('Building web assets for mobile wrapper...');
  execSync('npm --prefix web run build', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
}

function stageMobileBundle(projectRoot) {
  const distRoot = path.join(projectRoot, 'dist', 'mobile');
  const webDist = path.join(projectRoot, 'web', 'dist');
  const stagedWeb = path.join(distRoot, 'www');

  fs.rmSync(distRoot, { recursive: true, force: true });
  fs.mkdirSync(distRoot, { recursive: true });

  console.log(`Copying web build from ${webDist} to ${stagedWeb}...`);
  copyDir(webDist, stagedWeb);

  const buildInfo = {
    generatedAt: new Date().toISOString(),
    source: 'scripts/build_mobile.js',
    note: 'Assets ready for Capacitor/Android wrapper ingestion.',
  };
  fs.writeFileSync(path.join(distRoot, 'BUILD_INFO.json'), JSON.stringify(buildInfo, null, 2));

  console.log(`Mobile web assets staged at ${distRoot}`);
  console.log('Use `npx cap sync android` inside the mobile shell to finish the native build.');
}

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  ensureWebBuild(projectRoot);
  stageMobileBundle(projectRoot);
}

main();
