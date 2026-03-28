#!/usr/bin/env node
// homunculus upgrade — Update managed files to latest version

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PKG_DIR = path.join(__dirname, '..');
const TEMPLATES_DIR = path.join(PKG_DIR, 'templates');
const CORE_DIR = path.join(PKG_DIR, 'core');
const COMMANDS_DIR = path.join(PKG_DIR, 'commands');

const pkgVersion = require(path.join(PKG_DIR, 'package.json')).version;

function sha256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function colorize(code, text) {
  return `\x1b[${code}m${text}\x1b[0m`;
}

const green = (t) => colorize(32, t);
const yellow = (t) => colorize(33, t);
const red = (t) => colorize(31, t);
const bold = (t) => colorize(1, t);
const dim = (t) => colorize(2, t);

// All managed files with their source and category
function getManagedFiles() {
  const files = [];

  // Core scripts — auto-replace on upgrade
  if (fs.existsSync(CORE_DIR)) {
    for (const entry of fs.readdirSync(CORE_DIR, { withFileTypes: true })) {
      if (entry.isFile()) {
        files.push({
          src: path.join(CORE_DIR, entry.name),
          dest: path.join('homunculus', 'scripts', entry.name),
          category: 'core',
        });
      }
    }
  }

  // Slash commands — diff-aware
  if (fs.existsSync(COMMANDS_DIR)) {
    for (const entry of fs.readdirSync(COMMANDS_DIR, { withFileTypes: true })) {
      if (entry.isFile()) {
        files.push({
          src: path.join(COMMANDS_DIR, entry.name),
          dest: path.join('.claude', 'commands', entry.name),
          category: 'command',
        });
      }
    }
  }

  // Evolution rules — diff-aware
  const rulesSrc = path.join(TEMPLATES_DIR, 'rules', 'evolution-system.md');
  if (fs.existsSync(rulesSrc)) {
    files.push({
      src: rulesSrc,
      dest: path.join('.claude', 'rules', 'evolution-system.md'),
      category: 'rule',
    });
  }

  return files;
}

function main() {
  console.log('');
  console.log(`  ${bold('Homunculus Upgrade')} — v${pkgVersion}`);
  console.log('');

  const projectDir = process.cwd();
  const manifestPath = path.join(projectDir, 'homunculus', '.manifest.json');

  // Check if initialized
  if (!fs.existsSync(path.join(projectDir, 'homunculus'))) {
    console.log(`  ${red('✗')} Not initialized. Run ${bold('npx homunculus-code init')} first.`);
    process.exit(1);
  }

  // Load or create empty manifest
  let manifest = { version: '0.0.0', files: {} };
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
      console.log(`  ${yellow('!')} Corrupt .manifest.json, treating as fresh install`);
    }
  } else {
    console.log(`  ${yellow('!')} No .manifest.json found (pre-upgrade install). Will create one.`);
  }

  // Version check
  if (manifest.version === pkgVersion) {
    console.log(`  ${green('✓')} Already at v${pkgVersion}. Nothing to upgrade.`);
    console.log('');
    return;
  }

  console.log(`  Upgrading: v${manifest.version} → v${pkgVersion}`);
  console.log('');

  const managedFiles = getManagedFiles();
  const stats = { updated: 0, added: 0, skipped: 0, conflict: 0 };
  const newManifest = {
    version: pkgVersion,
    upgraded_at: new Date().toISOString(),
    files: {},
  };

  for (const file of managedFiles) {
    const destPath = path.join(projectDir, file.dest);
    const srcHash = sha256(file.src);

    if (!fs.existsSync(destPath)) {
      // New file — copy it in
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(file.src, destPath);
      newManifest.files[file.dest] = { hash: srcHash, category: file.category };
      console.log(`  ${green('+')} ${file.dest} ${dim('(new)')}`);
      stats.added++;
      continue;
    }

    const currentHash = sha256(destPath);
    const manifestHash = manifest.files[file.dest]?.hash;

    // Source unchanged since last install — no update needed
    if (srcHash === currentHash) {
      newManifest.files[file.dest] = { hash: srcHash, category: file.category };
      continue;
    }

    if (file.category === 'core') {
      // Core scripts: always auto-replace with backup
      const backupPath = destPath + '.bak';
      fs.copyFileSync(destPath, backupPath);
      fs.copyFileSync(file.src, destPath);
      newManifest.files[file.dest] = { hash: srcHash, category: file.category };
      console.log(`  ${green('↑')} ${file.dest} ${dim('(auto-updated, backup: .bak)')}`);
      stats.updated++;
    } else {
      // Commands/Rules: check if user modified
      const userModified = manifestHash && currentHash !== manifestHash;

      if (!userModified) {
        // User hasn't modified — safe to replace
        fs.copyFileSync(file.src, destPath);
        newManifest.files[file.dest] = { hash: srcHash, category: file.category };
        console.log(`  ${green('↑')} ${file.dest} ${dim('(updated)')}`);
        stats.updated++;
      } else {
        // User has customized — don't overwrite
        newManifest.files[file.dest] = { hash: manifestHash, category: file.category };
        const newVersionPath = destPath + '.new';
        fs.copyFileSync(file.src, newVersionPath);
        console.log(`  ${yellow('!')} ${file.dest} ${dim('(modified by you — new version saved as .new)')}`);
        stats.conflict++;
      }
    }
  }

  // Write updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2) + '\n');

  // Summary
  console.log('');
  const parts = [];
  if (stats.updated > 0) parts.push(green(`${stats.updated} updated`));
  if (stats.added > 0) parts.push(green(`${stats.added} added`));
  if (stats.skipped > 0) parts.push(dim(`${stats.skipped} unchanged`));
  if (stats.conflict > 0) parts.push(yellow(`${stats.conflict} need manual merge (.new files)`));

  if (parts.length === 0) {
    console.log(`  ${green('✓')} All files are up to date.`);
  } else {
    console.log(`  ${bold('Summary:')} ${parts.join(', ')}`);
  }

  if (stats.conflict > 0) {
    console.log('');
    console.log(`  ${yellow('Tip:')} Compare .new files with your customized versions:`);
    console.log(`    diff .claude/commands/hm-night.md .claude/commands/hm-night.md.new`);
  }

  console.log('');
}

main();
