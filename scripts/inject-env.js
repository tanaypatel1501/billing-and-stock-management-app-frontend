const fs = require('fs');
const path = require('path');

// Target the exact path we saw in your 'ls' output
const distPath = path.resolve(__dirname, '../dist/billing-and-stock-management-app/assets');
const templatePath = path.join(distPath, 'runtime-config.template.js');
const outputPath = path.join(distPath, 'runtime-config.js');

console.log('--- Environment Injection Start ---');
console.log('Looking for assets in:', distPath);

if (!fs.existsSync(distPath)) {
    console.error('❌ ERROR: Assets directory not found at:', distPath);
    process.exit(1);
}

if (fs.existsSync(templatePath)) {
    const url = process.env.BASIC_URL || 'http://localhost:8080';
    let content = fs.readFileSync(templatePath, 'utf8');
    content = content.replace('__BASIC_URL__', url);
    
    fs.writeFileSync(outputPath, content);
    
    console.log('✅ SUCCESS: Created runtime-config.js');
    console.log('🔗 Injected URL:', url);
} else {
    console.error('❌ ERROR: Template file missing at:', templatePath);
    console.log('Folder contents:', fs.readdirSync(distPath));
    process.exit(1);
}
console.log('--- Environment Injection End ---');