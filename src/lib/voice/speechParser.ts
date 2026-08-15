import { Product } from '@/types';

export interface ParsedVoiceItem {
  rawText: string;
  quantity: number;
  unit?: string;
  matchedProduct?: Product;
  confidence: number;
  productNameQuery: string;
}

// Word to number mappings for Hindi, Marathi, and English
const NUMBER_WORDS: Record<string, number> = {
  // English
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'half': 0.5, 'quarter': 0.25,

  // Hindi
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
  'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ग्यारह': 11, 'बारह': 12, 'बीस': 20,
  'आधा': 0.5, 'डेढ़': 1.5, 'ढाई': 2.5,

  // Marathi
  'दोन': 2, 'पाच': 5, 'सहा': 6, 'नऊ': 9, 'दहा': 10,
  'अकरा': 11, 'बारा': 12, 'वीस': 20,
  'अर्धा': 0.5, 'दीड': 1.5, 'अडीच': 2.5,
};

const UNIT_WORDS: Record<string, string> = {
  'packet': 'packet', 'packets': 'packet', 'पैकेट': 'packet', 'पॅकेट': 'packet',
  'kg': 'kg', 'kilo': 'kg', 'किलो': 'kg', 'केलो': 'kg',
  'gram': 'gram', 'grams': 'gram', 'ग्राम': 'gram', 'gm': 'gram',
  'litre': 'litre', 'litres': 'litre', 'लीटर': 'litre', 'लिटर': 'litre', 'lt': 'litre',
  'piece': 'piece', 'pieces': 'piece', 'पीस': 'piece', 'नग': 'piece',
  'box': 'box', 'boxes': 'box', 'डिब्बा': 'box', 'पेटी': 'box',
  'bottle': 'bottle', 'बोतल': 'bottle', 'बाटली': 'bottle',
  'dozen': 'dozen', 'दर्जन': 'dozen',
};

/**
 * Splits spoken transcript by conjunctions like 'और', 'and', 'आणि', commas, etc.
 */
export function splitSpeechIntoPhrases(transcript: string): string[] {
  const normalized = transcript.toLowerCase();
  // Split on: और, तथा, एवं, and, &, आणि, comma, semicolon, fullstop
  const splitRegex = /\s+(?:और|तथा|एवं|and|आणि|व|\+|comma|\,)\s+|[\,\.\;\n]+/i;
  return normalized
    .split(splitRegex)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Parse a single phrase like "दो पैकेट अमूल दूध" or "2 kg basmati rice"
 */
export function parseVoicePhrase(phrase: string, catalog: Product[]): ParsedVoiceItem {
  const words = phrase.split(/\s+/).filter(Boolean);
  let quantity = 1;
  let unit: string | undefined = undefined;
  let remainingWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Check if numeric digit e.g. "2", "2.5", "10"
    if (/^\d+(\.\d+)?$/.test(word)) {
      quantity = parseFloat(word);
      continue;
    }

    // Check if number word
    if (NUMBER_WORDS[word] !== undefined) {
      quantity = NUMBER_WORDS[word];
      continue;
    }

    // Check if unit word
    if (UNIT_WORDS[word] !== undefined) {
      unit = UNIT_WORDS[word];
      continue;
    }

    // Otherwise part of product name
    remainingWords.push(word);
  }

  const queryText = remainingWords.join(' ').trim() || phrase;

  // Match against product catalog
  let bestMatch: Product | undefined = undefined;
  let highestScore = 0;

  for (const prod of catalog) {
    const prodNameLower = prod.name.toLowerCase();
    const queryLower = queryText.toLowerCase();

    // 1. Exact or substring match
    if (prodNameLower.includes(queryLower) || queryLower.includes(prodNameLower)) {
      const score = queryLower.length / Math.max(queryLower.length, prodNameLower.length);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = prod;
      }
    } else {
      // 2. Token overlap match
      const queryTokens = queryLower.split(/\s+/);
      const prodTokens = prodNameLower.split(/\s+/);
      let matches = 0;

      for (const token of queryTokens) {
        if (token.length > 1 && prodTokens.some((pt) => pt.includes(token) || token.includes(pt))) {
          matches++;
        }
      }

      const tokenScore = matches / Math.max(queryTokens.length, 1);
      if (tokenScore > 0.4 && tokenScore > highestScore) {
        highestScore = tokenScore;
        bestMatch = prod;
      }
    }
  }

  return {
    rawText: phrase,
    quantity: quantity || 1,
    unit,
    matchedProduct: bestMatch,
    confidence: highestScore,
    productNameQuery: queryText,
  };
}

/**
 * Play a gentle Web Audio API sound for voice/barcode recognition confirmation
 */
export function playBeepSound(type: 'success' | 'alert' = 'success') {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    // Web audio not permitted without user gesture or unsupported
  }
}
