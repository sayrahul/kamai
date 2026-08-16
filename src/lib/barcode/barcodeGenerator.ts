// Lightweight Pure TypeScript Code-128 (Subset B) Vector SVG & Pattern Generator
// Supports high-density 1D laser barcode scanning on paper, A4 sheets, and thermal label rolls.

const CODE128_PATTERNS: { [char: string]: string } = {
  ' ': '212222', '!': '222122', '"': '222221', '#': '121223', '$': '121322', '%': '131222',
  '&': '122213', '\'': '122312', '(': '132212', ')': '221213', '*': '221312', '+': '231212',
  ',': '112232', '-': '122132', '.': '122231', '/': '113222', '0': '123122', '1': '123221',
  '2': '223211', '3': '221132', '4': '221231', '5': '213212', '6': '223112', '7': '312131',
  '8': '311222', '9': '321122', ':': '321221', ';': '312212', '<': '322112', '=': '322211',
  '>': '212123', '?': '212321', '@': '232121', 'A': '111323', 'B': '131123', 'C': '131321',
  'D': '112313', 'E': '132113', 'F': '132311', 'G': '211313', 'H': '231113', 'I': '231311',
  'J': '112133', 'K': '112331', 'L': '132131', 'M': '113123', 'N': '113321', 'O': '133121',
  'P': '313121', 'Q': '211331', 'R': '231131', 'S': '213113', 'T': '213311', 'U': '213131',
  'V': '311123', 'W': '311321', 'X': '331121', 'Y': '312113', 'Z': '312311', '[': '332111',
  '\\': '314111', ']': '221411', '^': '431111', '_': '111224', '`': '111422', 'a': '121124',
  'b': '121421', 'c': '141122', 'd': '141221', 'e': '112214', 'f': '112412', 'g': '122114',
  'h': '122411', 'i': '142112', 'j': '142211', 'k': '241211', 'l': '221114', 'm': '413111',
  'n': '241112', 'o': '134111', 'p': '111242', 'q': '121142', 'r': '121241', 's': '114212',
  't': '124112', 'u': '124211', 'v': '411212', 'w': '421112', 'x': '421211', 'y': '212141',
  'z': '214121', '{': '412121', '|': '111143', '}': '111341', '~': '131141',
};

const START_B = '211214'; // Start Code B (Pattern index 104)
const STOP = '2331112';   // Stop Code (Pattern index 106)

export interface BarcodeRenderOptions {
  width?: number;       // total width in px
  height?: number;      // barcode bar height in px
  showText?: boolean;   // render human readable text below bars
  barColor?: string;
  bgColor?: string;
  fontSize?: number;
}

/**
 * Generate high-precision Code-128 SVG string for 1D laser barcode readers
 */
export function generateCode128SVG(text: string, options: BarcodeRenderOptions = {}): string {
  const {
    height = 50,
    showText = true,
    barColor = '#000000',
    bgColor = '#ffffff',
    fontSize = 11,
  } = options;

  const safeText = (text || '000000').slice(0, 40);

  // 1. Calculate Checksum
  let checksum = 104; // Start B value
  let patterns: string[] = [START_B];

  for (let i = 0; i < safeText.length; i++) {
    const char = safeText[i];
    const ascii = char.charCodeAt(0);
    const value = ascii >= 32 && ascii <= 126 ? ascii - 32 : 0;
    checksum += value * (i + 1);

    const pattern = CODE128_PATTERNS[char] || CODE128_PATTERNS['0'];
    patterns.push(pattern);
  }

  // Checksum modulo 103
  const checkCharVal = checksum % 103;
  // Convert checkCharVal to pattern
  const allAscii = Object.keys(CODE128_PATTERNS);
  const checkPattern = allAscii[checkCharVal] ? CODE128_PATTERNS[allAscii[checkCharVal]] : '212222';
  patterns.push(checkPattern);
  patterns.push(STOP);

  // 2. Build Module Width Array
  const modules: boolean[] = [];
  patterns.forEach((pattern) => {
    let isBar = true;
    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10);
      for (let w = 0; w < width; w++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    }
  });

  const moduleWidth = 2; // px per module
  const quietZone = 20;  // 10 modules on each side
  const totalWidth = modules.length * moduleWidth + quietZone * 2;
  const totalHeight = showText ? height + fontSize + 8 : height + 6;

  // 3. Generate SVG Rectangles
  let rects = '';
  let x = quietZone;
  for (let i = 0; i < modules.length; i++) {
    if (modules[i]) {
      rects += `<rect x="${x}" y="3" width="${moduleWidth}" height="${height}" fill="${barColor}"/>`;
    }
    x += moduleWidth;
  }

  const textElement = showText
    ? `<text x="${totalWidth / 2}" y="${height + fontSize + 4}" text-anchor="middle" font-family="monospace, monospace" font-weight="bold" font-size="${fontSize}" fill="${barColor}" letter-spacing="2">${safeText}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="100%" style="background-color: ${bgColor};">
    ${rects}
    ${textElement}
  </svg>`;
}

/**
 * Generate Base64 Data URL for embedding into images/HTML
 */
export function generateCode128DataURL(text: string, options: BarcodeRenderOptions = {}): string {
  const svg = generateCode128SVG(text, options);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
