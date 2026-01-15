const fs = require('fs');
const path = require('path');

// 1. Find the base dist directory
const distBase = path.join(__dirname, '..', 'dist');

// 2. Helper to find the assets folder deep inside dist
function findAssetsDir(startPath) {
    if (!fs.existsSync(startPath)) return null;
    const files = fs.readdirSync(startPath);
    for (const file of files) {
        const fullPath = path.join(startPath, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            if (file === 'assets') return fullPath;
            const found = findAssetsDir(fullPath);
            if (found) return found;
        }
    }
    return null;
}

const assetsDir = findAssetsDir(distBase);

if (!assetsDir) {
    console.error("❌ Could not find 'assets' folder in dist. Did the build fail?");
    process.exit(1);
}

const templatePath = path.join(assetsDir, 'runtime-config.template.js');
const outputPath = path.join(assetsDir, 'runtime-config.js');

if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template missing at: ${templatePath}`);
    process.exit(1);
}

let content = fs.readFileSync(templatePath, 'utf8');
content = content.replace('__BASIC_URL__', process.env.BASIC_URL || 'http://localhost:8080');

fs.writeFileSync(outputPath, content);

console.log('✅ runtime-config.js injected successfully!');
console.log('📍 Path:', outputPath);