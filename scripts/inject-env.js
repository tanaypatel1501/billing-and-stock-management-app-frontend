const fs = require('fs');
const path = require('path');

const distPath = path.resolve(__dirname, '../dist/billing-and-stock-management-app/assets');
const templatePath = path.join(distPath, 'runtime-config.template.js');
const outputPath = path.join(distPath, 'runtime-config.js');

// Verify the assets directory exists
if (!fs.existsSync(distPath)) {
    console.error('❌ Assets directory not found:', distPath);
    process.exit(1);
}

// Verify the template file exists
if (!fs.existsSync(templatePath)) {
    console.error('❌ runtime-config.template.js not found:', templatePath);
    console.error('Folder contents:', fs.readdirSync(distPath));
    process.exit(1);
}

// Read environment variables
const url = process.env.BASIC_URL || 'http://localhost:8080';
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';

// Read template and replace placeholders
let content = fs.readFileSync(templatePath, 'utf8');
content = content.replace('__BASIC_URL__', url);
content = content.replace('__GOOGLE_CLIENT_ID__', googleClientId);

// Write runtime config
fs.writeFileSync(outputPath, content);

console.log('✅ runtime-config.js generated successfully.');