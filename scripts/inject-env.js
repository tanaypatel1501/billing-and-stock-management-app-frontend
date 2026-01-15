const fs = require('fs');
const path = require('path');

const distRoot = path.join(__dirname, '..', 'dist');
const appDir = fs.readdirSync(distRoot)[0];

const assetsDir = path.join(distRoot, appDir, 'assets');

const templatePath = path.join(assetsDir, 'runtime-config.template.js');
const outputPath = path.join(assetsDir, 'runtime-config.js');

let content = fs.readFileSync(templatePath, 'utf8');

content = content.replace(
  '__BASIC_URL__',
  process.env.BASIC_URL || ''
);

fs.writeFileSync(outputPath, content);

console.log('runtime-config.js injected successfully');