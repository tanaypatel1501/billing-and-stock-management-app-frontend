const sharp = require('sharp');
const fs = require('fs');

const SCALE = 0.70;
const densities = ['ldpi', 'mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

(async () => {
  for (const density of densities) {
    const filePath = `android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`;
    const meta = await sharp(filePath).metadata();
    const size = meta.width;
    const logoSize = Math.round(size * SCALE);
    const pad = Math.round((size - logoSize) / 2);

    const buffer = await sharp(filePath).toBuffer();

    await sharp(buffer)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: pad,
        bottom: size - logoSize - pad,
        left: pad,
        right: size - logoSize - pad,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(filePath + '.tmp');

    fs.renameSync(filePath + '.tmp', filePath);
    console.log('Padded:', filePath);
  }
})();
