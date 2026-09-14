const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');

if (!fs.existsSync(outDir)) {
  console.log('out directory not found');
  process.exit(0);
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // If directory is like '__next.manifest' or '__next.icon'
      if (entry.name.startsWith('__next.')) {
        const subFiles = fs.readdirSync(fullPath);
        for (const sf of subFiles) {
          const srcFile = path.join(fullPath, sf);
          // Create sibling file with '.' separator: e.g. __next.manifest.__PAGE__.txt
          const targetFile = path.join(dir, `${entry.name}.${sf}`);
          fs.copyFileSync(srcFile, targetFile);
          console.log(`[fix-export] Created RSC alias: ${path.relative(outDir, targetFile)}`);
        }
      }
      walkDir(fullPath);
    }
  }
}

walkDir(outDir);
console.log('[fix-export] Export post-processing complete.');
