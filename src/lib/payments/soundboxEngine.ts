/**
 * Multilingual Smart Soundbox Audio & Voice Engine
 * Replicates Paytm / PhonePe Soundbox voice announcements in Hindi, Marathi, English, and Gujarati.
 */

export type SoundboxLanguage = 'hi-IN' | 'mr-IN' | 'en-IN' | 'gu-IN';

// Hindi number words up to 999
const HINDI_ONES = [
  '', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ',
  'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस',
  'बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस',
  'तीस', 'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस',
  'चालीस', 'इकतालीस', 'बयालीस', 'तैंतालीस', 'चवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास',
  'पचास', 'इक्यावन', 'बावन', 'तिरेपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ',
  'साठ', 'इकसठ', 'बासठ', 'तिरसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सड़सठ', 'अड़सठ', 'उनहत्तर',
  'सत्तर', 'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उन्नासी',
  'अस्सी', 'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी',
  'नब्बे', 'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पंचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे'
];

// Marathi number words up to 99
const MARATHI_ONES = [
  '', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ',
  'दहा', 'अकरा', 'बारा', 'तेरा', 'चौदा', 'पंधरा', 'सोळा', 'सतरा', 'अठरा', 'एकोणीस',
  'वीस', 'एकवीस', 'बावीस', 'तेवीस', 'चोवीस', 'पंचवीस', 'सव्वीस', 'सत्तावीस', 'अठ्ठावीस', 'एकोणतीस',
  'तीस', 'एकतीस', 'बत्तीस', 'तेहेतीस', 'चौतीस', 'पस्तीस', 'छत्तीस', 'सदतीस', 'अडतीस', 'एकोणचाळीस',
  'चाळीस', 'एक्केचाळीस', 'बेचाळीस', 'त्रेचाळीस', 'चव्वेचाळीस', 'पंचेचाळीस', 'शेहेचाळीस', 'सत्तेचाळीस', 'अठ्ठेचाळीस', 'एकोणपन्नास',
  'पन्नास'
];

/**
 * Converts integer rupees to Hindi spoken text
 */
export function numberToHindiWords(num: number): string {
  if (num === 0) return 'शून्य';
  if (num < 0) return `माइनस ${numberToHindiWords(Math.abs(num))}`;

  let words = '';

  if (num >= 10000000) {
    const crores = Math.floor(num / 10000000);
    words += `${numberToHindiWords(crores)} करोड़ `;
    num %= 10000000;
  }
  if (num >= 100000) {
    const lakhs = Math.floor(num / 100000);
    words += `${HINDI_ONES[lakhs] || lakhs} लाख `;
    num %= 100000;
  }
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    words += `${HINDI_ONES[thousands] || thousands} हज़ार `;
    num %= 1000;
  }
  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    words += `${HINDI_ONES[hundreds]} सौ `;
    num %= 100;
  }
  if (num > 0) {
    words += HINDI_ONES[num] || num.toString();
  }

  return words.trim();
}

/**
 * Converts integer rupees to English spoken words
 */
export function numberToEnglishWords(num: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num < 0) return `Minus ${numberToEnglishWords(Math.abs(num))}`;

  let str = '';
  if (num >= 10000000) {
    str += `${numberToEnglishWords(Math.floor(num / 10000000))} Crore `;
    num %= 10000000;
  }
  if (num >= 100000) {
    str += `${numberToEnglishWords(Math.floor(num / 100000))} Lakh `;
    num %= 100000;
  }
  if (num >= 1000) {
    str += `${numberToEnglishWords(Math.floor(num / 1000))} Thousand `;
    num %= 1000;
  }
  if (num >= 100) {
    str += `${a[Math.floor(num / 100)]} Hundred `;
    num %= 100;
  }
  if (num > 0) {
    if (num < 20) str += a[num];
    else str += `${b[Math.floor(num / 10)]}${a[num % 10] ? '-' + a[num % 10] : ''}`;
  }

  return str.trim();
}

class SoundboxService {
  private language: SoundboxLanguage = 'hi-IN';
  private volume = 1.0;
  private isMuted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('kamai_soundbox_lang') as SoundboxLanguage;
      if (savedLang) this.language = savedLang;

      const savedVol = localStorage.getItem('kamai_soundbox_vol');
      if (savedVol) this.volume = parseFloat(savedVol);
    }
  }

  public setLanguage(lang: SoundboxLanguage) {
    this.language = lang;
    if (typeof window !== 'undefined') {
      localStorage.setItem('kamai_soundbox_lang', lang);
    }
  }

  public getLanguage(): SoundboxLanguage {
    return this.language;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('kamai_soundbox_vol', this.volume.toString());
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Plays a crisp high-frequency acoustic chime before the voice announcement
   */
  public playChime(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return resolve();

        const ctx = new AudioContext();
        const now = ctx.currentTime;

        // Tone 1: 880Hz (A5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.2 * this.volume, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.15);

        // Tone 2: 1320Hz (E6) - Instant rising harmonic
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.frequency.setValueAtTime(1320, now + 0.08);
        gain2.gain.setValueAtTime(0.3 * this.volume, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.35);

        setTimeout(resolve, 320);
      } catch (e) {
        resolve();
      }
    });
  }

  /**
   * Formats the voice announcement sentence based on active language
   */
  public formatAnnouncementText(amountRupees: number, storeName = 'कमाई प्लस'): string {
    const wholeRupees = Math.round(amountRupees);

    switch (this.language) {
      case 'hi-IN': {
        const hindiNum = numberToHindiWords(wholeRupees);
        return `${storeName} पर ${hindiNum} रुपये प्राप्त हुए!`;
      }
      case 'mr-IN': {
        const hindiNum = numberToHindiWords(wholeRupees);
        return `${storeName} वर ${hindiNum} रुपये मिळाले!`;
      }
      case 'gu-IN': {
        const hindiNum = numberToHindiWords(wholeRupees);
        return `${storeName} પર ${hindiNum} રૂપિયા મળ્યા!`;
      }
      case 'en-IN':
      default: {
        const engNum = numberToEnglishWords(wholeRupees);
        return `Payment of ${engNum} Rupees received on ${storeName}!`;
      }
    }
  }

  /**
   * Triggers the full Soundbox Voice sequence: Chime -> Speech synthesis
   */
  public async announcePayment(amountRupees: number, storeName = 'कमाई प्लस'): Promise<void> {
    if (this.isMuted || this.volume <= 0) return;

    // 1. Play rising acoustic chime
    await this.playChime();

    // 2. Synthesize multilingual speech
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech

      const text = this.formatAnnouncementText(amountRupees, storeName);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.language;
      utterance.rate = 0.95; // Natural clear cadence
      utterance.pitch = 1.05; // Bright friendly tone
      utterance.volume = this.volume;

      // Select matching regional voice if available
      const voices = window.speechSynthesis.getVoices();
      const regionalVoice = voices.find((v) => v.lang === this.language || v.lang.startsWith(this.language.split('-')[0]));
      if (regionalVoice) {
        utterance.voice = regionalVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis playback notice:', err);
    }
  }
}

export const soundboxEngine = new SoundboxService();
