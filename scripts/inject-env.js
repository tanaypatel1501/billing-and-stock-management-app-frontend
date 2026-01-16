const fs = require('fs');
const path = require('path');

// Based on your 'ls' output, the path is exactly here:
const assetsDir = path.join(__dirname, '..', 'dist', 'billing-and-stock-management-app', 'assets');

const templatePath = path.join(assetsDir, 'runtime-config.template.js');
const outputPath = path.join(assetsDir, 'runtime-config.js');

console.log('Checking for template at:', templatePath);

if (fs.existsSync(templatePath)) {
    let content = fs.readFileSync(templatePath, 'utf8');
    
    // Fallback for local testing if BASIC_URL isn't set
    const url = process.env.BASIC_URL || 'http://localhost:8080';
    
    content = content.replace('__BASIC_URL__', url);
    fs.writeFileSync(outputPath, content);
    
    console.log('✅ Success! runtime-config.js created with URL:', url);
} else {
    console.error('❌ Error: Could not find template file at ' + templatePath);
    // Log the contents of the assets folder to see what actually exists
    if (fs.existsSync(assetsDir)) {
        console.log('Assets folder contents:', fs.readdirSync(assetsDir));
    }
    process.exit(1);
}