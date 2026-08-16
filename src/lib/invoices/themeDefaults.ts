import { InvoiceThemeConfig, InvoiceThemeId } from '@/types';

export interface ThemePreset {
  id: InvoiceThemeId;
  name: string;
  hindiName: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  badge: string;
  previewClass: string;
}

export const INVOICE_THEME_PRESETS: ThemePreset[] = [
  {
    id: 'vyapar_classic',
    name: 'Vyapar Classic GST',
    hindiName: 'क्लासिक जीएसटी',
    description: 'Formal corporate double-border layout with standard GST tax columns and signatory block.',
    primaryColor: '#0f172a', // Slate 900
    accentColor: '#f1f5f9',
    badge: 'Popular',
    previewClass: 'border-slate-900 bg-white',
  },
  {
    id: 'modern_emerald',
    name: 'Modern Emerald',
    hindiName: 'मॉडर्न एमराल्ड',
    description: 'Vibrant green header banner, rounded tax badges, and high-contrast UPI QR payment card.',
    primaryColor: '#059669', // Emerald 600
    accentColor: '#ecfdf5',
    badge: 'Recommended',
    previewClass: 'border-emerald-600 bg-white',
  },
  {
    id: 'royal_blue',
    name: 'Royal Blue Professional',
    hindiName: 'रॉयल ब्लू प्रो',
    description: 'Clean dark blue corporate header with itemized savings, HSN codes, and sleek dividers.',
    primaryColor: '#1d4ed8', // Blue 700
    accentColor: '#eff6ff',
    badge: 'Corporate',
    previewClass: 'border-blue-700 bg-white',
  },
  {
    id: 'golden_elegance',
    name: 'Golden Elegance',
    hindiName: 'गोल्डन रॉयल',
    description: 'Warm amber gold accents with luxury styling, perfect for clothing, jewellery, and gift retail.',
    primaryColor: '#b45309', // Amber 700
    accentColor: '#fffbeb',
    badge: 'Premium',
    previewClass: 'border-amber-700 bg-white',
  },
  {
    id: 'compact_kirana',
    name: 'Kirana & Supermart',
    hindiName: 'किराना एवं सुपरमार्ट',
    description: 'Bilingual Hindi/English headings, prominent Khata Udhar reminder box, and large UPI QR code.',
    primaryColor: '#7c3aed', // Violet 600
    accentColor: '#f5f3ff',
    badge: 'FMCG / Kirana',
    previewClass: 'border-violet-600 bg-white',
  },
  {
    id: 'thermal_minimal',
    name: 'Thermal POS Slip (80mm)',
    hindiName: 'थर्मल पर्ची',
    description: 'Monospace receipt slip layout optimized for thermal printers and fast WhatsApp snapshots.',
    primaryColor: '#000000', // Black
    accentColor: '#f8fafc',
    badge: 'POS Thermal',
    previewClass: 'border-slate-400 bg-white font-mono',
  },
];

export const DEFAULT_INVOICE_THEME_CONFIG: InvoiceThemeConfig = {
  theme_id: 'modern_emerald',
  primary_color: '#059669',
  header_style: 'standard',
  show_logo: true,
  show_tagline: true,
  show_owner: true,
  show_upi_qr: true,
  show_gst_breakup: true,
  show_hsn_code: true,
  show_mrp_savings: true,
  show_terms: true,
  show_signature: true,
  custom_title: 'TAX INVOICE',
  custom_footer: 'Thank you for your business! Goods once sold can be exchanged within 7 days.',
  custom_terms: '1. All disputes subject to local jurisdiction.\n2. Interest @18% p.a. will be charged if bill is unpaid after 15 days.',
};

export const COLOR_SWATCHES = [
  { label: 'Emerald Green', hex: '#059669' },
  { label: 'Slate Navy', hex: '#0f172a' },
  { label: 'Royal Blue', hex: '#1d4ed8' },
  { label: 'Amber Gold', hex: '#b45309' },
  { label: 'Vyapar Violet', hex: '#7c3aed' },
  { label: 'Ruby Red', hex: '#dc2626' },
  { label: 'Teal Cyan', hex: '#0d9488' },
  { label: 'Charcoal Black', hex: '#18181b' },
];
