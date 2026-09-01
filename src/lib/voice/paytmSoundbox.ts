import { SupportedLanguage } from '@/types';

/**
 * Paytm-Style Soundbox Audio Engine
 * Plays a signature POS chime followed by natural voice payment confirmation.
 */

export function isSoundboxEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem('kamai_soundbox_enabled');
  return val === null ? true : val === 'true';
}

export function setSoundboxEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('kamai_soundbox_enabled', String(enabled));
}

/**
 * Plays a double-tone chime synthesized via Web Audio API
 */
export function playSoundboxChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }

      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: 587Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Note 2: 880Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.35, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);

      setTimeout(() => {
        resolve();
      }, 350);
    } catch (e) {
      resolve();
    }
  });
}

/**
 * Speaks the Paytm Soundbox payment confirmation message
 * @param amountPaise Integer paise amount (e.g. 15000 = ₹150)
 * @param lang SupportedLanguage ('hi' | 'mr' | 'en')
 */
export async function announcePayment(
  amountPaise: number,
  lang: SupportedLanguage = 'hi',
  storeName = 'कमाई प्लस'
): Promise<void> {
  if (typeof window === 'undefined' || !isSoundboxEnabled()) return;

  const rupees = Math.round(amountPaise / 100);

  // Play iconic chime first
  await playSoundboxChime();

  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // Clear any ongoing speech

    let text = '';
    let speechLang = 'hi-IN';

    if (lang === 'hi') {
      text = `${storeName} पर ₹${rupees} प्राप्त हुए`;
      speechLang = 'hi-IN';
    } else if (lang === 'mr') {
      text = `${storeName} वर ₹${rupees} मिळाले`;
      speechLang = 'mr-IN';
    } else {
      text = `Received ₹${rupees} on ${storeName}`;
      speechLang = 'en-IN';
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLang;
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // Try to find a high-quality Indian regional voice
    const voices = window.speechSynthesis.getVoices();
    const indianVoice = voices.find(
      (v) =>
        v.lang.startsWith(speechLang.slice(0, 2)) ||
        v.lang.includes('IN') ||
        v.name.includes('India')
    );
    if (indianVoice) {
      utterance.voice = indianVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Voice announcement playback notice:', err);
  }
}
