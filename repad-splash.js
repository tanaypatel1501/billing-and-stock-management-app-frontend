const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const glob = require('path'); // not used, just placeholder

const SCALE = 0.70;

async function repad(filePath) {
  const meta = await sharp(filePath).metadata();
  const size = meta.width; // splash.pngs are square canvases
  const logoSize = Math.round(size * SCALE);
  const offset = Math.round((size - logoSize) / 2);

  const buffer = await sharp(filePath).toBuffer();

  await sharp(buffer)
    .resize(logoSize, logoSize, { fit: 'contain' })
    .extend({
      top: offset,
      bottom: size - logoSize - offset,
      left: offset,
      right: size - logoSize - offset,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toFile(filePath + '.tmp');

  fs.renameSync(filePath + '.tmp', filePath);
  console.log('Repadded:', filePath);
}

const root = 'android/app/src/main/res';
const dirs = fs.readdirSync(root).filter(d => d.includes('drawable'));

(async () => {
  for (const dir of dirs) {
    const splashPath = path.join(root, dir, 'splash.png');
    if (fs.existsSync(splashPath)) {
      await repad(splashPath);
    }
  }
})();
