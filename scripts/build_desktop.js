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
  console.log('Building web assets for desktop wrapper...');
  execSync('npm --prefix web run build', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
}

function stageDesktopBundle(projectRoot) {
  const distRoot = path.join(projectRoot, 'dist', 'desktop');
  const resourcesDir = path.join(distRoot, 'resources', 'app');
  const webDist = path.join(projectRoot, 'web', 'dist');
  const electronMain = path.join(projectRoot, 'electron', 'main.js');

  // Safety check: Only remove distRoot if it matches the expected pattern
  if (
    distRoot.endsWith(path.join('dist', 'desktop')) &&
    distRoot.startsWith(projectRoot)
  ) {
    fs.rmSync(distRoot, { recursive: true, force: true });
  } else {
    throw new Error(`Refusing to remove unexpected distRoot: ${distRoot}`);
  }
  fs.mkdirSync(resourcesDir, { recursive: true });

  console.log(`Copying web build from ${webDist} to ${path.join(resourcesDir, 'web')}`);
  copyDir(webDist, path.join(resourcesDir, 'web'));

  fs.copyFileSync(electronMain, path.join(distRoot, 'main.js'));

  const pkgJson = {
    name: 'agent-spark-desktop',
    version: '1.0.0',
    main: 'main.js',
    description: 'Prebuilt desktop wrapper for Agent Spark',
    scripts: {
      start: 'electron .'
    }
  };
  fs.writeFileSync(path.join(distRoot, 'package.json'), JSON.stringify(pkgJson, null, 2));

  const buildInfo = {
    generatedAt: new Date().toISOString(),
    source: 'scripts/build_desktop.js',
    note: 'Bundle ready for electron-builder or npm start within dist/desktop.',
  };
  fs.writeFileSync(path.join(distRoot, 'BUILD_INFO.json'), JSON.stringify(buildInfo, null, 2));

  console.log(`Desktop bundle staged at ${distRoot}`);
  console.log('Run `npm install` then `npm start` inside that directory to preview the shell.');
}

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  ensureWebBuild(projectRoot);
  stageDesktopBundle(projectRoot);
}

main();
