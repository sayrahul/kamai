'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Product, SupportedLanguage } from '@/types';
import { formatINR } from '@/lib/utils';
import { parseSpokenBillingText, ParsedSpokenItem, playBeepSound } from '@/lib/voice/speechParser';
import { 
  Mic, 
  MicOff, 
  Plus, 
  CheckCircle2, 
  Trash2, 
  Sparkles, 
  Volume2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface VoiceBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  products?: Product[];
  catalog?: Product[];
  language?: SupportedLanguage;
  onAddItemsToCart: (items: Array<{ product: Product; quantity: number }>) => void;
}

export const VoiceBillingModal: React.FC<VoiceBillingModalProps> = ({
  isOpen,
  onClose,
  products = [],
  catalog,
  language = 'hi',
  onAddItemsToCart,
}) => {
  const activeProducts = catalog || products;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedSpokenItem[]>([]);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  const langMap: Record<SupportedLanguage, string> = {
    hi: 'hi-IN',
    mr: 'mr-IN',
    en: 'en-IN',
  };

  const langCode = langMap[language] || 'hi-IN';

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setParsedItems([]);
      setSpeechError(null);
      return;
    }

    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setSpeechError('Speech recognition is not supported in this browser. Please use Chrome on Android / PC.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = langCode;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }

        if (currentTranscript.trim()) {
          setTranscript(currentTranscript);
          const parsed = parseSpokenBillingText(currentTranscript, activeProducts, language);
          setParsedItems(parsed);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Voice input issue (${event.error}). Please try again.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      startListening();
    }

    return () => {
      stopListening();
    };
  }, [isOpen, language, activeProducts]);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setSpeechError(null);
      } catch (e) {
        // already started
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }
  };

  const handleApplyToCart = () => {
    const matched = parsedItems
      .filter((i) => i.matchedProduct)
      .map((i) => ({
        product: i.matchedProduct!,
        quantity: i.quantity,
      }));

    if (matched.length > 0) {
      playBeepSound();
      onAddItemsToCart(matched);
      onClose();
    }
  };

  const handleRemoveParsedItem = (idx: number) => {
    setParsedItems(parsedItems.filter((_, i) => i !== idx));
  };

  const samplePhrases = {
    hi: 'उदा: "दो पैकेट आटा, एक तेल और तीन साबुन"',
    mr: 'उदा: "दोन किलो साखर, एक तेल आणि तीन साबण"',
    en: 'e.g. "two packs atta, one oil and three soaps"',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-slate-800" />
          <span>Voice POS Billing Assistant</span>
        </div>
      }
      description="Speak item names and quantities in Hindi, Marathi, or English. Products are automatically recognized."
      size="lg"
    >
      <div className="space-y-4">
        {/* Active Microphone Radar */}
        <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-slate-50 border border-slate-200 text-center relative">
          <div className="relative mb-2">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-14 h-14 rounded-full flex items-center justify-center select-none ${
                isListening
                  ? 'bg-slate-900 text-white ring-4 ring-slate-200'
                  : 'bg-white border border-slate-300 text-slate-700'
              }`}
            >
              {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
          </div>

          <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
            <span>{isListening ? 'Listening... Speak your items' : 'Microphone Paused (Tap to Listen)'}</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-200 text-slate-900 text-[10px] font-bold">
              {langCode}
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {samplePhrases[language] || samplePhrases.en}
          </p>

          {speechError && (
            <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{speechError}</span>
            </div>
          )}
        </div>

        {/* Live Spoken Transcript */}
        {transcript && (
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Live Transcript
            </span>
            <p className="text-xs font-semibold text-slate-900 italic">
              "{transcript}"
            </p>
          </div>
        )}

        {/* Parsed Items List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-700">
              Recognized Items ({parsedItems.length})
            </span>
            <span className="text-[11px] text-slate-500">
              {parsedItems.filter((i) => i.matchedProduct).length} matched from your catalog
            </span>
          </div>

          {parsedItems.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-xl bg-white">
              Start speaking to see detected items and quantities appear here in real-time.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {parsedItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                    item.matchedProduct
                      ? 'border-emerald-300 bg-emerald-50 text-slate-900'
                      : 'border-amber-300 bg-amber-50 text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        item.matchedProduct
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-amber-200 text-amber-900'
                      }`}
                    >
                      {item.quantity}x
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {item.matchedProduct ? item.matchedProduct.name : item.productNameQuery}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.matchedProduct
                          ? `₹${(item.matchedProduct.selling_price / 100).toFixed(2)}/${item.matchedProduct.unit} • Total: ₹${(
                              (item.matchedProduct.selling_price * item.quantity) /
                              100
                            ).toFixed(2)}`
                          : 'Item not found in catalog'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveParsedItem(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <Button
            onClick={handleApplyToCart}
            disabled={parsedItems.filter((i) => i.matchedProduct).length === 0}
            size="sm"
            className="text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            <span>
              Add {parsedItems.filter((i) => i.matchedProduct).length} Items to Cart (₹
              {(
                parsedItems
                  .filter((i) => i.matchedProduct)
                  .reduce((acc, i) => acc + i.matchedProduct!.selling_price * i.quantity, 0) / 100
              ).toFixed(2)}
              )
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
