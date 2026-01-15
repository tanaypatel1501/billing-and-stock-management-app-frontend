const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const appDir = fs.readdirSync(distDir)[0]; // Angular app folder
const targetFile = path.join(distDir, appDir, 'assets', 'runtime-config.js');

const template = `
(function (window) {
  window.runtimeConfig = {
    BASIC_URL: "${process.env.BASIC_URL || ''}"
  };
})(this);
`;

fs.writeFileSync(targetFile, template);

console.log('runtime-config.js injected');
