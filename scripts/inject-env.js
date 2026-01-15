const fs = require('fs');
const path = require('path');

const distRoot = path.join(__dirname, '..', 'dist');

/**
 * Recursively find all 'assets' directories under a given path
 */
function getAllAssetsDirs(startPath, acc = []) {
  if (!fs.existsSync(startPath)) return acc;
  const files = fs.readdirSync(startPath);
  for (const file of files) {
    const fullPath = path.join(startPath, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      if (file === 'assets') {
        acc.push(fullPath);
      } else {
        getAllAssetsDirs(fullPath, acc);
      }
    }
  }
  return acc;
}

const assetsDirs = getAllAssetsDirs(distRoot);

if (assetsDirs.length === 0) {
  console.error("❌ No 'assets' folder found in dist! Build might have failed or path is wrong.");
  process.exit(1);
}

assetsDirs.forEach(dir => {
  const templatePath = path.join(dir, 'runtime-config.template.js');
  const outputPath = path.join(dir, 'runtime-config.js');

  if (fs.existsSync(templatePath)) {
    let content = fs.readFileSync(templatePath, 'utf8');
    content = content.replace('__BASIC_URL__', process.env.BASIC_URL || 'http://localhost:8080');
    fs.writeFileSync(outputPath, content);
    console.log(`✅ Injected config into: ${outputPath}`);
  } else {
    console.log(`⚠️ Assets folder found at ${dir} but no template inside.`);
  }
});