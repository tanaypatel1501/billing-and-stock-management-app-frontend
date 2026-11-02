
const sharp = require('sharp');

const SIZE = 512;

const SCALE = 0.70; 

const logoSize = Math.round(SIZE * SCALE);

sharp('resources/icon-master.png')

  .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })

  .extend({

    top: Math.floor((SIZE - logoSize) / 2),

    bottom: Math.ceil((SIZE - logoSize) / 2),

    left: Math.floor((SIZE - logoSize) / 2),

    right: Math.ceil((SIZE - logoSize) / 2),

    background: { r: 0, g: 0, b: 0, alpha: 0 }

  })

  .png()

  .toFile('resources/icon.png')

  .then(() => console.log('✅ Padded icon created at resources/icon.png'))

  .catch(err => console.error('❌ Error:', err));

