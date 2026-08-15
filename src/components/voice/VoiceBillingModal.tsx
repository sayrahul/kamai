'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/lib/i18n';
import { Product } from '@/types';
import { formatINR } from '@/lib/utils';
import { 
  splitSpeechIntoPhrases, 
  parseVoicePhrase, 
  ParsedVoiceItem, 
  playBeepSound 
} from '@/lib/voice/speechParser';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Volume2, 
  Plus, 
  Trash2,
  HelpCircle
} from 'lucide-react';

interface VoiceBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: Product[];
  onAddItemsToCart: (items: Array<{ product: Product; quantity: number }>) => void;
}

export const VoiceBillingModal: React.FC<VoiceBillingModalProps> = ({
  isOpen,
  onClose,
  catalog,
  onAddItemsToCart,
}) => {
  const { language, t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedVoiceItem[]>([]);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const langCode = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setParsedItems([]);
      setSpeechError(null);
      return;
    }

    startListening();
    return () => {
      stopListening();
    };
  }, [isOpen]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Web Speech API is not supported in this browser. Please use Chrome, Edge or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = langCode;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        playBeepSound('success');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          finalTranscript += text;
        }

        setTranscript(finalTranscript);
        parseLiveTranscript(finalTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. Please allow microphone access in browser settings.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Voice error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error(err);
      setSpeechError('Failed to start microphone.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const parseLiveTranscript = (text: string) => {
    if (!text.trim()) return;
    const phrases = splitSpeechIntoPhrases(text);
    const results = phrases.map((phrase) => parseVoicePhrase(phrase, catalog));
    setParsedItems(results);
  };

  const handleConfirmAndAddToCart = () => {
    const validItems = parsedItems
      .filter((item) => item.matchedProduct)
      .map((item) => ({
        product: item.matchedProduct!,
        quantity: item.quantity,
      }));

    if (validItems.length > 0) {
      playBeepSound('success');
      onAddItemsToCart(validItems);
      onClose();
    }
  };

  const samplePhrases = {
    hi: 'उदा: "दो पैकेट दूध और एक पैकेट ब्रेड"',
    mr: 'उदा: "दोन पॅकेट दूध आणि एक किलो साखर"',
    en: 'e.g. "Two packets of milk and one packet of bread"',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-vyapar-500" />
          <span>Voice Bill Entry (बोलकर बिल बनाएं)</span>
        </span>
      }
      description="Speak naturally in Hindi, Marathi, or English to add multiple items to the cart."
      size="lg"
    >
      <div className="space-y-5">
        {/* Active Microphone Radar & Visualizer */}
        <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-vyapar-50/80 to-amber-50/40 dark:from-slate-950 dark:to-slate-900 border border-vyapar-200/80 dark:border-slate-800 text-center relative overflow-hidden">
          <div className="relative mb-3">
            {isListening && (
              <span className="absolute -inset-3 rounded-full bg-vyapar-400/30 animate-ping pointer-events-none" />
            )}
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg select-none ${
                isListening
                  ? 'bg-vyapar-500 text-white shadow-vyapar-500/40 ring-4 ring-vyapar-500/20'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {isListening ? <Mic className="w-8 h-8 animate-pulse" /> : <MicOff className="w-8 h-8" />}
            </button>
          </div>

          <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>{isListening ? 'Listening... Speak your items' : 'Microphone Paused (Tap to Listen)'}</span>
            <Badge variant="saffron" size="sm" className="text-[10px]">
              {langCode}
            </Badge>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            {samplePhrases[language] || samplePhrases.en}
          </p>

          {speechError && (
            <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{speechError}</span>
            </div>
          )}
        </div>

        {/* Live Spoken Transcript */}
        {transcript && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Live Transcript
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 italic">
              "{transcript}"
            </p>
          </div>
        )}

        {/* Parsed Items List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Recognized Items ({parsedItems.length})
            </span>
            <span className="text-[11px] text-slate-400">
              {parsedItems.filter((i) => i.matchedProduct).length} matched from your catalog
            </span>
          </div>

          {parsedItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-2xl">
              Start speaking to see detected items and quantities appear here in real-time.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {parsedItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                    item.matchedProduct
                      ? 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/50'
                      : 'border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        item.matchedProduct
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {item.quantity}x
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {item.matchedProduct ? item.matchedProduct.name : item.productNameQuery}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Spoken: "{item.rawText}" • {item.matchedProduct ? `${formatINR(item.matchedProduct.selling_price)} / ${item.matchedProduct.unit}` : 'Not in catalog'}
                      </div>
                    </div>
                  </div>

                  <div>
                    {item.matchedProduct ? (
                      <Badge variant="success" size="sm">
                        <CheckCircle2 className="w-3 h-3 mr-0.5" />
                        Matched
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="sm">
                        Not Found
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="success"
            size="md"
            disabled={parsedItems.filter((i) => i.matchedProduct).length === 0}
            onClick={handleConfirmAndAddToCart}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Add {parsedItems.filter((i) => i.matchedProduct).length} Items to Cart</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
