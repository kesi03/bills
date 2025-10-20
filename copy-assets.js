const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'assets');
const outDir = path.join(__dirname, 'dist/assets');

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(entry => {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      copyRecursive(srcPath, destPath);
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(srcDir, outDir);
console.log('Assets copied successfully.');