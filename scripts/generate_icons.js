const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/sayra/.gemini/antigravity-ide/brain/87843241-f2b9-48df-8cbb-46ba7c189fb3/.user_uploaded/media_1787278837034.png';
const publicDir = path.join(__dirname, '../public');

async function generate() {
  const image = sharp(srcPath);
  const metadata = await image.metadata();
  console.log('Source Image Metadata:', metadata.width, 'x', metadata.height, 'format:', metadata.format);

  // Extract pixel color at (500, 100) to get exact golden yellow background hex
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  const x = 500, y = 100;
  const idx = (y * info.width + x) * info.channels;
  const r = data[idx], g = data[idx+1], b = data[idx+2];
  const yellowHex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  console.log('Detected Yellow Color:', yellowHex, `rgb(${r}, ${g}, ${b})`);

  // 1. Copy exact original to public/logo.png
  fs.copyFileSync(srcPath, path.join(publicDir, 'logo.png'));
  console.log('✓ Saved public/logo.png');

  // 2. Generate standard uncropped 512x512 and 192x192
  await sharp(srcPath).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(srcPath).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(srcPath).resize(512, 512).png().toFile(path.join(publicDir, 'icon.png'));
  await sharp(srcPath).resize(512, 512).png().toFile(path.join(publicDir, 'app-icon.png'));
  await sharp(srcPath).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(srcPath).resize(48, 48).png().toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ Saved uncropped 512x512, 192x192, apple-touch-icon, favicon');

  // 3. Generate Android Maskable Icons (safe zone: icon scaled to ~75% centered on edge-to-edge matching yellow background)
  // 512x512 maskable (inner logo 390x390, offset (61, 61))
  const innerLogo512 = await sharp(srcPath).resize(390, 390, { fit: 'contain' }).toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r, g, b, alpha: 1 }
    }
  })
  .composite([{ input: innerLogo512, top: 61, left: 61 }])
  .png()
  .toFile(path.join(publicDir, 'icon-maskable-512.png'));

  // 192x192 maskable (inner logo 146x146, offset (23, 23))
  const innerLogo192 = await sharp(srcPath).resize(146, 146, { fit: 'contain' }).toBuffer();
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r, g, b, alpha: 1 }
    }
  })
  .composite([{ input: innerLogo192, top: 23, left: 23 }])
  .png()
  .toFile(path.join(publicDir, 'icon-maskable-192.png'));

  console.log('✓ Saved Android Maskable icons (icon-maskable-512.png & icon-maskable-192.png)');
  console.log('🎉 All icons successfully generated and saved!');
}

generate().catch(console.error);
