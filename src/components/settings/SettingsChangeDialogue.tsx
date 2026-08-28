'use client';

import React, { useState } from 'react';
import { 
  AlertCircle, 
  Check, 
  RotateCcw, 
  Eye, 
  X, 
  Save, 
  ArrowRight, 
  Sparkles, 
  Store, 
  QrCode, 
  Receipt, 
  Volume2, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ChangedField {
  key: string;
  label: string;
  category: 'profile' | 'upi' | 'invoicing' | 'soundbox';
  categoryLabel: string;
  oldValue: string;
  newValue: string;
}

interface SettingsChangeBarProps {
  changedFields: ChangedField[];
  isSaving: boolean;
  onSave: () => Promise<void> | void;
  onDiscard: () => void;
  onOpenReview: () => void;
}

/**
 * ⚡ Floating Interactive Dialogue Bar
 * Appears smoothly at the bottom of the screen when any setting is modified.
 */
export function SettingsChangeBar({
  changedFields,
  isSaving,
  onSave,
  onDiscard,
  onOpenReview,
}: SettingsChangeBarProps) {
  const count = changedFields.length;
  if (count === 0) return null;

  // Collect unique category labels modified
  const modifiedCategories = Array.from(
    new Set(changedFields.map((f) => f.categoryLabel))
  );

  return (
    <div 
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[94vw] sm:w-auto animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
      role="region"
      aria-label="Unsaved settings changes toolbar"
    >
      <div className="bg-slate-950/95 backdrop-blur-xl border-2 border-amber-500/70 text-white rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-slate-950/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status indicator & Summary */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4 animate-spin text-amber-300" style={{ animationDuration: '4s' }} />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-950 animate-ping" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black tracking-tight text-white flex items-center gap-1">
                <span>Unsaved Changes</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  {count} {count === 1 ? 'field' : 'fields'}
                </span>
              </span>
              <span className="hidden md:inline-block text-[10px] text-slate-400 font-mono">
                (Press <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">Ctrl+S</kbd> to save)
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate max-w-[280px] sm:max-w-xs">
              Modified in: <span className="text-amber-200 font-semibold">{modifiedCategories.join(', ')}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 justify-end">
          {/* Review Changes Button */}
          <button
            type="button"
            onClick={onOpenReview}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer active:scale-95"
            title="Review all modified settings before saving"
          >
            <Eye className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden xs:inline">Review</span>
          </button>

          {/* Discard Changes Button */}
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/50 transition cursor-pointer active:scale-95 disabled:opacity-50"
            title="Revert all changes back to saved database state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Discard</span>
          </button>

          {/* Save All Changes Button */}
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-slate-950" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SettingsReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  changedFields: ChangedField[];
  isSaving: boolean;
  onSave: () => Promise<void> | void;
  onDiscard: () => void;
}

/**
 * 🔍 Interactive Dialogue Modal: Review & Compare Changes
 * Displays detailed side-by-side diff of every modified setting before committing to database.
 */
export function SettingsReviewModal({
  isOpen,
  onClose,
  changedFields,
  isSaving,
  onSave,
  onDiscard,
}: SettingsReviewModalProps) {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: `All (${changedFields.length})` },
    ...Array.from(new Set(changedFields.map((f) => f.category))).map((cat) => {
      const field = changedFields.find((f) => f.category === cat);
      const catCount = changedFields.filter((f) => f.category === cat).length;
      return { id: cat, label: `${field?.categoryLabel || cat} (${catCount})` };
    }),
  ];

  const filteredFields = activeCategoryFilter === 'all'
    ? changedFields
    : changedFields.filter((f) => f.category === activeCategoryFilter);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'profile': return <Store className="w-3.5 h-3.5 text-blue-500" />;
      case 'upi': return <QrCode className="w-3.5 h-3.5 text-amber-500" />;
      case 'invoicing': return <Receipt className="w-3.5 h-3.5 text-purple-500" />;
      case 'soundbox': return <Volume2 className="w-3.5 h-3.5 text-emerald-500" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">Review Settings Changes</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                  {changedFields.length} Modified
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Compare your changes before saving to local database and syncing POS counters.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Chips */}
        {categories.length > 2 && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategoryFilter(c.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeCategoryFilter === c.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* Body: Modified Fields List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {filteredFields.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Check className="w-8 h-8 mx-auto mb-1 text-emerald-500" />
              <p className="text-xs font-bold text-slate-600">No modifications in this category</p>
            </div>
          ) : (
            filteredFields.map((field) => (
              <div 
                key={field.key} 
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getCategoryIcon(field.category)}
                    <span className="text-xs font-black text-slate-900 truncate">
                      {field.label}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 uppercase tracking-wider">
                    {field.categoryLabel}
                  </span>
                </div>

                {/* Diff View */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {/* Previous Value */}
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 space-y-0.5">
                    <span className="text-[9.5px] uppercase font-bold text-rose-600 block tracking-wider font-sans">
                      Previous Value
                    </span>
                    <div className="truncate font-semibold line-through opacity-80" title={field.oldValue || '(Empty)'}>
                      {field.oldValue ? field.oldValue : <span className="italic font-normal text-rose-400">(Empty / Unset)</span>}
                    </div>
                  </div>

                  {/* New Value */}
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-0.5">
                    <span className="text-[9.5px] uppercase font-bold text-emerald-700 block tracking-wider font-sans">
                      New Value (Pending)
                    </span>
                    <div className="truncate font-bold text-emerald-800" title={field.newValue || '(Empty)'}>
                      {field.newValue ? field.newValue : <span className="italic font-normal text-emerald-600">(Empty / Removed)</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (confirm('Discard all pending changes and restore previous settings?')) {
                onDiscard();
                onClose();
              }
            }}
            disabled={isSaving}
            className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Discard All Changes</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full sm:w-auto text-xs font-bold cursor-pointer"
            >
              Keep Editing
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={async () => {
                await onSave();
                onClose();
              }}
              disabled={isSaving}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Apply &amp; Save All Changes</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SettingsUnsavedTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTabName: string;
  onSaveAndSwitch: () => Promise<void> | void;
  onDiscardAndSwitch: () => void;
  changedCount: number;
}

/**
 * 🛡️ Interactive Navigation & Tab Switch Guard Dialogue
 * Prompts user when attempting to switch tabs with unsaved edits.
 */
export function SettingsUnsavedTabModal({
  isOpen,
  onClose,
  targetTabName,
  onSaveAndSwitch,
  onDiscardAndSwitch,
  changedCount,
}: SettingsUnsavedTabModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 bg-amber-500/10 border-b border-amber-200 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-700 shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Unsaved Changes Detected</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              You have <span className="font-bold text-amber-700">{changedCount} unsaved {changedCount === 1 ? 'change' : 'changes'}</span>.
              Do you want to save them before switching to <b>{targetTabName}</b>?
            </p>
          </div>
        </div>

        <div className="p-4 space-y-2">
          {/* Option 1: Save & Switch */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={async () => {
              setIsProcessing(true);
              await onSaveAndSwitch();
              setIsProcessing(false);
            }}
            className="w-full p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-500/60 text-emerald-950 flex items-center justify-between transition cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-950">Save &amp; Continue</div>
                <div className="text-[10.5px] text-emerald-700">Save all changes to database and switch tab</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Option 2: Discard & Switch */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => {
              onDiscardAndSwitch();
            }}
            className="w-full p-3 rounded-xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 text-rose-950 flex items-center justify-between transition cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                <RotateCcw className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-rose-950">Discard &amp; Switch</div>
                <div className="text-[10.5px] text-rose-700">Revert changes and switch tab without saving</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-rose-700 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Stay on Current Tab
          </Button>
        </div>
      </div>
    </div>
  );
}
