'use client';

import React, { useState, useMemo } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from '@/lib/i18n';
import { formatINR, generateWhatsAppReceiptLink } from '@/lib/utils';
import { Customer, BusinessType } from '@/types';
import { getStoreProfile } from '@/lib/constants/storeProfiles';
import { 
  TrendingUp, 
  Users, 
  Share2, 
  Sparkles, 
  AlertCircle, 
  Gift, 
  MessageSquare, 
  Copy, 
  Cake, 
  Heart, 
  Flame, 
  Moon, 
  Sun, 
  Calendar, 
  Clock, 
  Tag, 
  Percent, 
  CheckCircle2, 
  Send, 
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useProSubscription, ProFeatureBadge, ProFeatureLockedCard } from '@/components/subscription/ProFeatureGate';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

interface FestivalCampaign {
  id: string;
  name: string;
  name_hi: string;
  category: 'niche' | 'festival' | 'birthday' | 'loyalty' | 'reengage';
  businessType?: BusinessType | 'all';
  icon: string;
  defaultDiscount: string;
  defaultCoupon: string;
  defaultMinSpend: string;
  validityDays: number;
  template: string;
}

const CAMPAIGN_PRESETS: FestivalCampaign[] = [
  // ---------------- NICHE SPECIFIC CAMPAIGNS ----------------
  {
    id: 'rx_refill',
    name: 'Monthly Medicine Refill Reminder',
    name_hi: 'Monthly Medicine Refill',
    category: 'niche',
    businessType: 'pharmacy',
    icon: '💊',
    defaultDiscount: '10% OFF',
    defaultCoupon: 'CARE10',
    defaultMinSpend: '₹300',
    validityDays: 7,
    template: `💊 *Monthly Medicine Refill Reminder* 🩺\n\nDear {{customer_name}},\nThis is a gentle health reminder from *{{business_name}}*.\n\nIt is time to refill your regular monthly medicines or chronic healthcare prescription to maintain continuous wellness. 🌸\n\n🎁 *Refill Discount:* {{discount}} (Code: *{{coupon_code}}*)\n🛒 *On Orders Above:* {{min_spend}}\n⏳ *Validity:* Next {{validity_days}} Days\n\n💬 *Home Delivery Available:* Simply send your prescription photo on WhatsApp!\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'health_camp',
    name: 'Free Health & BP Checkup Camp',
    name_hi: 'Free Health Checkup Camp',
    category: 'niche',
    businessType: 'pharmacy',
    icon: '🩺',
    defaultDiscount: 'FREE Checkup',
    defaultCoupon: 'HEALTHCAMP',
    defaultMinSpend: '₹0',
    validityDays: 3,
    template: `🩺 *Free Health & BP Checkup Camp* 🏥\n\nDear {{customer_name}},\nYour health is our priority! *{{business_name}}* is organizing a Free Blood Pressure & Sugar Consultation this weekend.\n\n🎁 *Special Camp Offer:* {{discount}} + Flat 10% on First Aid & Multivitamins\n⏳ *Date / Validity:* Next {{validity_days}} Days\n\nVisit our pharmacy with your family.\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'food_weekend',
    name: "Weekend Chef's Special Food Fest",
    name_hi: 'Weekend Chef Specials',
    category: 'niche',
    businessType: 'restaurant',
    icon: '🍽️',
    defaultDiscount: 'Flat 15% OFF',
    defaultCoupon: 'TASTY15',
    defaultMinSpend: '₹400',
    validityDays: 3,
    template: `🍽️ *Weekend Food Fest & Chef Specials!* 🍕🔥\n\nHello {{customer_name}},\nTreat your family and friends to delicious flavors at *{{business_name}}* this weekend!\n\n🎁 *Weekend Discount:* {{discount}}\n🎟️ *Coupon Code:* *{{coupon_code}}*\n🛒 *Valid On:* Dine-in & Takeaway orders above {{min_spend}}\n⏳ *Validity:* Next {{validity_days}} Days\n\nReserve your table or order takeaway today!\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'food_combo',
    name: 'Free Dessert / Chai on Order',
    name_hi: 'Free Dessert Treat',
    category: 'niche',
    businessType: 'restaurant',
    icon: '🍧',
    defaultDiscount: 'FREE Dessert',
    defaultCoupon: 'SWEETTREAT',
    defaultMinSpend: '₹350',
    validityDays: 5,
    template: `🍧 *Sweet Treat from Chef!* ☕✨\n\nHello {{customer_name}},\nEnjoy a complimentary Dessert or Special Masala Chai with your meal at *{{business_name}}*!\n\n🎁 *Special Offer:* {{discount}}\n🎟️ *Coupon:* *{{coupon_code}}*\n🛒 *On Food Orders Above:* {{min_spend}}\n\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'apparel_new_arrival',
    name: 'New Season Collection & Festive Arrivals',
    name_hi: 'New Arrivals Festive Offer',
    category: 'niche',
    businessType: 'clothing',
    icon: '👗',
    defaultDiscount: 'Flat 20% OFF',
    defaultCoupon: 'FASHION20',
    defaultMinSpend: '₹999',
    validityDays: 10,
    template: `👗 *New Season Collection Has Arrived!* ✨🛍️\n\nHello {{customer_name}},\nUpgrade your wardrobe with the latest trending Shirts, Kurtis, Sarees, Jeans & Footwear at *{{business_name}}*!\n\n🎁 *New Arrival Offer:* {{discount}}\n🎟️ *Exclusive Code:* *{{coupon_code}}*\n🛒 *Min Purchase:* {{min_spend}}\n⏳ *Validity:* Next {{validity_days}} Days\n\nVisit us today to discover your new favorite look!\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'apparel_clearance',
    name: 'Garment Clearance / Buy 2 Get 1',
    name_hi: 'Garments Clearance Sale',
    category: 'niche',
    businessType: 'clothing',
    icon: '🏷️',
    defaultDiscount: 'Buy 2 Get 1 FREE',
    defaultCoupon: 'B2G1FREE',
    defaultMinSpend: '₹1200',
    validityDays: 7,
    template: `🏷️ *Mega Seasonal Clearance Sale!* 💥\n\nHello {{customer_name}},\nExclusive limited-time savings on selected apparel & footwear at *{{business_name}}*:\n\n🎁 *Offer:* {{discount}} or Flat 25% OFF\n🎟️ *Coupon:* *{{coupon_code}}*\n⏳ *Valid for:* Next {{validity_days}} Days only\n\nLimited stock available! Visit today.\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'mobile_upgrade',
    name: 'Smartphone Upgrade & Exchange Bonus',
    name_hi: 'Mobile Upgrade Exchange',
    category: 'niche',
    businessType: 'electronics',
    icon: '📱',
    defaultDiscount: '₹2,000 Exchange Bonus',
    defaultCoupon: 'UPGRADE2000',
    defaultMinSpend: '₹8,000',
    validityDays: 7,
    template: `📱 *Smartphone Upgrade & Mega Exchange Offer!* 🚀\n\nHello {{customer_name}},\nReady for a phone upgrade? Exchange your old phone and get maximum value at *{{business_name}}*!\n\n🎁 *Exchange Benefit:* {{discount}} + Free Screen Guard & Case\n🎟️ *Coupon:* *{{coupon_code}}*\n🛒 *On New 5G Smartphones Above:* {{min_spend}}\n\n100% Brand Warranty & Easy Zero-Cost EMI available.\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'electronics_accessories',
    name: 'Audio & Fast Chargers Mega Deal',
    name_hi: 'Accessories Mega Deal',
    category: 'niche',
    businessType: 'electronics',
    icon: '🎧',
    defaultDiscount: 'Flat 25% OFF',
    defaultCoupon: 'AUDIO25',
    defaultMinSpend: '₹500',
    validityDays: 7,
    template: `🎧 *Audio & Mobile Accessories Mega Sale!* ⚡\n\nHello {{customer_name}},\nGet top brand Bluetooth Neckbands, 65W Fast Chargers, Power Banks & Smart Watches at unbeatable prices from *{{business_name}}*:\n\n🎁 *Discount:* {{discount}}\n🎟️ *Coupon Code:* *{{coupon_code}}*\n🛒 *Min Purchase:* {{min_spend}}\n\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'hardware_reno',
    name: 'Home Renovation & Painting Special',
    name_hi: 'Home Renovation Special',
    category: 'niche',
    businessType: 'hardware',
    icon: '🔩',
    defaultDiscount: 'Contractor Rate (15% OFF)',
    defaultCoupon: 'RENO15',
    defaultMinSpend: '₹2,000',
    validityDays: 14,
    template: `🏡 *Home Painting & Renovation Savings!* 🎨🛠️\n\nHello {{customer_name}},\nPlanning home repairs, plumbing, or painting? Get wholesale contractor rates at *{{business_name}}*!\n\n🎁 *Special Rebate:* {{discount}}\n🎟️ *Coupon Code:* *{{coupon_code}}*\n🛒 *Applicable on:* Asian Paints, PVC Pipes, Water Taps & Hardware\n\nFree local site delivery available!\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'electrical_lights',
    name: 'LED & Smart Lighting Festival',
    name_hi: 'LED Lighting Fest',
    category: 'niche',
    businessType: 'electrical',
    icon: '⚡',
    defaultDiscount: 'Flat 15% OFF',
    defaultCoupon: 'LIGHT15',
    defaultMinSpend: '₹600',
    validityDays: 10,
    template: `⚡ *Brighten Your Home with Energy Saving LED!* 💡✨\n\nHello {{customer_name}},\nUpgrade to high-brightness LED Battens, Ceiling Fans & Modular Switches at *{{business_name}}* with 1-Year Replacement Warranty!\n\n🎁 *Discount:* {{discount}}\n🎟️ *Coupon Code:* *{{coupon_code}}*\n🛒 *Min Purchase:* {{min_spend}}\n\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'kirana_ration',
    name: 'Monthly Kirana Ration Checklist & Free Delivery',
    name_hi: 'Monthly Kirana Ration List',
    category: 'niche',
    businessType: 'grocery',
    icon: '🌾',
    defaultDiscount: 'Flat ₹100 OFF + Free Delivery',
    defaultCoupon: 'RATION100',
    defaultMinSpend: '₹1,500',
    validityDays: 7,
    template: `🌾 *Mahine Ka Kirana & Ration Delivery* 🛒✨\n\nNamaste {{customer_name}},\nIt's time for your monthly household ration! Get fresh Atta, Rice, Cooking Oil, Dal & Ghee delivered directly to your doorstep from *{{business_name}}*.\n\n🎁 *Monthly Savings:* {{discount}}\n🎟️ *Coupon:* *{{coupon_code}}*\n🛒 *On Ration Orders Above:* {{min_spend}}\n\n💬 *Easy WhatsApp Ordering:* Send your grocery list here!\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'fmcg_super_savings',
    name: 'Supermarket Weekend Savings',
    name_hi: 'Supermarket Mega Savings',
    category: 'niche',
    businessType: 'fmcg',
    icon: '🍫',
    defaultDiscount: 'Flat 12% OFF',
    defaultCoupon: 'SUPER12',
    defaultMinSpend: '₹800',
    validityDays: 5,
    template: `🛍️ *Supermarket Weekend Savings!* 🍫🧃\n\nHello {{customer_name}},\nEnjoy huge savings on packaged snacks, personal care, juices and household cleaners at *{{business_name}}* this weekend!\n\n🎁 *Super Savings:* {{discount}}\n🎟️ *Coupon Code:* *{{coupon_code}}*\n🛒 *Min Purchase:* {{min_spend}}\n\nVisit us today with your family!\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },

  // ---------------- UNIVERSAL FESTIVALS & CELEBRATIONS ----------------
  {
    id: 'diwali',
    name: 'Diwali & Festive Mega Sale',
    name_hi: 'Diwali & Festive Sale',
    category: 'festival',
    icon: '🪔',
    defaultDiscount: '15% OFF',
    defaultCoupon: 'DIWALI15',
    defaultMinSpend: '₹500',
    validityDays: 7,
    template: `✨ *Happy Diwali & Festive Greetings!* 🪔\n\nDear {{customer_name}},\nWarm festive wishes from *{{business_name}}* to you and your family! 🎉\n\nHere is your exclusive Festive Gift Voucher:\n🎁 *Offer:* {{discount}} (Code: *{{coupon_code}}*)\n🛒 *Min Purchase:* {{min_spend}}\n⏳ *Validity:* Next {{validity_days}} Days\n\nVisit us today to claim your festive savings!\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'eid',
    name: 'Eid Mubarak Festive Blessing',
    name_hi: 'Eid Mubarak Special Offer',
    category: 'festival',
    icon: '🌙',
    defaultDiscount: '₹100 OFF',
    defaultCoupon: 'EIDMUBARAK',
    defaultMinSpend: '₹600',
    validityDays: 5,
    template: `🌙 *Eid Mubarak!* ✨\n\nDear {{customer_name}},\nHeartfelt Eid greetings from *{{business_name}}* to you and your loved ones! 🕌✨\n\nCelebrate with our special festive voucher:\n🎁 *Discount:* {{discount}} (Coupon: *{{coupon_code}}*)\n🛒 *Applicable on:* Bills above {{min_spend}}\n⏳ *Validity:* {{validity_days}} Days\n\nVisit us today and celebrate with savings!\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'newyear',
    name: 'Happy New Year Celebration',
    name_hi: 'New Year Celebration',
    category: 'festival',
    icon: '🎆',
    defaultDiscount: '10% OFF',
    defaultCoupon: 'NEWYEAR2027',
    defaultMinSpend: '₹400',
    validityDays: 10,
    template: `🎆 *Happy New Year!* 🥳\n\nDear {{customer_name}},\nWishing you joy, prosperity, and good health in the New Year! 🌸\n\nStart your year with special savings at *{{business_name}}*:\n🎁 *New Year Discount:* {{discount}}\n🎟️ *Coupon Code:* *{{coupon_code}}*\n🛒 *Min Bill:* {{min_spend}}\n⏳ *Valid for:* {{validity_days}} Days\n\nVisit your favorite neighborhood store today!\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'holi',
    name: 'Holi Colors & Joy Festival',
    name_hi: 'Holi Festival Discount',
    category: 'festival',
    icon: '🎨',
    defaultDiscount: 'Flat ₹50 OFF',
    defaultCoupon: 'HOLIRANG',
    defaultMinSpend: '₹350',
    validityDays: 5,
    template: `🎨 *Happy Holi Greetings!* 🌈\n\nHello {{customer_name}},\nCelebrate the festival of colors with special discounts from *{{business_name}}*:\n\n🎁 *Special Discount:* {{discount}}\n🎟️ *Coupon:* *{{coupon_code}}*\n🛒 *Min Purchase:* {{min_spend}}\n\nFresh festive snacks and grocery essentials available now.\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'birthday',
    name: 'Happy Birthday Celebration Voucher',
    name_hi: 'Birthday Celebration Gift',
    category: 'birthday',
    icon: '🎂',
    defaultDiscount: 'Flat ₹100 Gift',
    defaultCoupon: 'BDAYSPECIAL',
    defaultMinSpend: '₹400',
    validityDays: 7,
    template: `🎂 *Happy Birthday to You!* 🎈🎁\n\nDear {{customer_name}},\nThe entire team at *{{business_name}}* wishes you a wonderful birthday filled with joy! 💐\n\nEnjoy a special Birthday Gift on us:\n🎁 *Birthday Voucher:* {{discount}}\n🎟️ *Coupon Code:* *{{coupon_code}}*\n🛒 *Valid on:* Bills above {{min_spend}} (Next {{validity_days}} Days)\n\nVisit our store to claim your birthday gift today!\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'anniversary',
    name: 'Wedding Anniversary Greetings',
    name_hi: 'Anniversary Celebration Gift',
    category: 'birthday',
    icon: '💍',
    defaultDiscount: '12% OFF',
    defaultCoupon: 'LOVEBOND',
    defaultMinSpend: '₹500',
    validityDays: 7,
    template: `💐 *Happy Wedding Anniversary!* 💍🎉\n\nDear {{customer_name}},\nWishing you both a wonderful year of togetherness, love, and good health.\n\nEnjoy an Anniversary Gift Voucher from *{{business_name}}*:\n🎁 *Discount:* {{discount}} (Code: *{{coupon_code}}*)\n🛒 *Min Purchase:* {{min_spend}}\n\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'vip_loyalty',
    name: 'VIP Loyalty Customer Appreciation',
    name_hi: 'VIP Customer Appreciation',
    category: 'loyalty',
    icon: '👑',
    defaultDiscount: '20% OFF',
    defaultCoupon: 'VIPMEMBER',
    defaultMinSpend: '₹800',
    validityDays: 14,
    template: `👑 *VIP Customer Appreciation Gift* 🌟\n\nHello {{customer_name}},\nYou are one of our most valued regular customers at *{{business_name}}*. Thank you for your continued trust! 🙏\n\nAs a token of our appreciation, here is an exclusive VIP Voucher:\n🎁 *VIP Discount:* {{discount}}\n🎟️ *Exclusive Code:* *{{coupon_code}}*\n🛒 *Min Purchase:* {{min_spend}}\n⏳ *Validity:* {{validity_days}} Days\n\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
  {
    id: 'reengage',
    name: 'We Miss You! (Comeback Special)',
    name_hi: 'We Miss You Special',
    category: 'reengage',
    icon: '❤️',
    defaultDiscount: 'Flat ₹50 OFF',
    defaultCoupon: 'COMEBACK50',
    defaultMinSpend: '₹300',
    validityDays: 7,
    template: `❤️ *We Miss You!* 🛍️\n\nHello {{customer_name}},\nIt has been a while since your last visit to *{{business_name}}*. Fresh new inventory has just arrived!\n\nEnjoy our Special Comeback Gift on your next visit:\n🎁 *Discount:* {{discount}}\n🎟️ *Coupon Code:* *{{coupon_code}}*\n🛒 *Min Purchase:* {{min_spend}}\n\nVisit us this week and enjoy great savings!\n📍 *{{business_name}}* | 📞 {{business_phone}}`,
  },
];

export default function GrowthPage() {
  const { isPro, requirePro, isUpgradeModalOpen, setIsUpgradeModalOpen } = useProSubscription();
  const { language } = useTranslation();
  const business = useLiveQuery(async () => db.businesses.toCollection().first());
  const storeProfile = getStoreProfile(business?.business_type);
  const customers = useLiveQuery(async () => db.customers.toArray()) || [];

  // Filter Tab for Campaign Presets
  const [campaignTab, setCampaignTab] = useState<'recommended' | 'niche' | 'festival' | 'birthday' | 'loyalty' | 'all'>('recommended');

  // Compute Active Campaign Presets
  const displayCampaigns = useMemo(() => {
    const currentType = business?.business_type || 'grocery';
    if (campaignTab === 'recommended') {
      const nicheMatches = CAMPAIGN_PRESETS.filter(c => c.businessType === currentType);
      const topUniversal = CAMPAIGN_PRESETS.filter(c => ['diwali', 'birthday', 'vip_loyalty', 'reengage'].includes(c.id));
      return nicheMatches.length > 0 ? [...nicheMatches, ...topUniversal] : topUniversal;
    }
    if (campaignTab === 'niche') {
      return CAMPAIGN_PRESETS.filter(c => c.category === 'niche');
    }
    if (campaignTab === 'festival') {
      return CAMPAIGN_PRESETS.filter(c => c.category === 'festival');
    }
    if (campaignTab === 'birthday') {
      return CAMPAIGN_PRESETS.filter(c => c.category === 'birthday');
    }
    if (campaignTab === 'loyalty') {
      return CAMPAIGN_PRESETS.filter(c => c.category === 'loyalty' || c.category === 'reengage');
    }
    return CAMPAIGN_PRESETS;
  }, [business?.business_type, campaignTab]);

  // Initial default campaign matching store profile
  const defaultNicheCampaign = useMemo(() => {
    const currentType = business?.business_type || 'grocery';
    const match = CAMPAIGN_PRESETS.find(c => c.businessType === currentType);
    return match || CAMPAIGN_PRESETS[0];
  }, [business?.business_type]);

  // Selected Campaign State
  const [selectedCampaign, setSelectedCampaign] = useState<FestivalCampaign>(defaultNicheCampaign);
  const [discountVal, setDiscountVal] = useState<string>(defaultNicheCampaign.defaultDiscount);
  const [couponCode, setCouponCode] = useState<string>(defaultNicheCampaign.defaultCoupon);
  const [minSpendVal, setMinSpendVal] = useState<string>(defaultNicheCampaign.defaultMinSpend);
  const [validityDaysVal, setValidityDaysVal] = useState<number>(defaultNicheCampaign.validityDays);

  // Sync default if business profile loads
  React.useEffect(() => {
    if (business?.business_type) {
      const match = CAMPAIGN_PRESETS.find(c => c.businessType === business.business_type);
      if (match) {
        setSelectedCampaign(match);
        setDiscountVal(match.defaultDiscount);
        setCouponCode(match.defaultCoupon);
        setMinSpendVal(match.defaultMinSpend);
        setValidityDaysVal(match.validityDays);
      }
    }
  }, [business?.business_type]);

  // Audience Filter
  const [targetAudience, setTargetAudience] = useState<'all' | 'birthday' | 'vip' | 'inactive'>('all');
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Today's date calculations
  const today = new Date();
  const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const todayDay = String(today.getDate()).padStart(2, '0');
  const todayMMDD = `${todayMonth}-${todayDay}`;

  // 1. Birthday Customers Radar (matches MM-DD)
  const birthdayCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!c.date_of_birth) return false;
      const bdayPart = c.date_of_birth.includes('-')
        ? c.date_of_birth.slice(-5) // gets MM-DD
        : '';
      return bdayPart === todayMMDD;
    });
  }, [customers, todayMMDD]);

  // 2. Inactive Customers (haven't visited for > 30 days)
  const nowMs = Date.now();
  const thirtyDaysMs = 30 * 86400000;
  const inactiveCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!c.last_visit_date) return true;
      const diff = nowMs - new Date(c.last_visit_date).getTime();
      return diff > thirtyDaysMs;
    });
  }, [customers, nowMs]);

  // 3. VIP Customers (Total spent > ₹2000 or visits >= 5)
  const vipCustomers = useMemo(() => {
    return customers.filter((c) => (c.total_spent || 0) >= 200000 || (c.total_visits || 0) >= 5);
  }, [customers]);

  // Target Customer List based on filter
  const filteredAudience = useMemo(() => {
    if (targetAudience === 'birthday') return birthdayCustomers;
    if (targetAudience === 'vip') return vipCustomers;
    if (targetAudience === 'inactive') return inactiveCustomers;
    return customers;
  }, [targetAudience, customers, birthdayCustomers, vipCustomers, inactiveCustomers]);

  // Switch Campaign Handler
  const handleSelectCampaign = (camp: FestivalCampaign) => {
    setSelectedCampaign(camp);
    setDiscountVal(camp.defaultDiscount);
    setCouponCode(camp.defaultCoupon);
    setMinSpendVal(camp.defaultMinSpend);
    setValidityDaysVal(camp.validityDays);

    if (camp.category === 'birthday') {
      setTargetAudience('birthday');
    } else if (camp.category === 'reengage') {
      setTargetAudience('inactive');
    } else if (camp.category === 'loyalty') {
      setTargetAudience('vip');
    } else {
      setTargetAudience('all');
    }
  };

  // Compile Dynamic WhatsApp Message
  const getCompiledMessage = (customerName = '{{customer_name}}') => {
    const bizName = business?.name || 'Sharma Kirana Store';
    const bizPhone = business?.phone || '9876543210';

    return selectedCampaign.template
      .replace(/{{customer_name}}/g, customerName)
      .replace(/{{business_name}}/g, bizName)
      .replace(/{{business_phone}}/g, bizPhone)
      .replace(/{{discount}}/g, discountVal)
      .replace(/{{coupon_code}}/g, couponCode)
      .replace(/{{min_spend}}/g, minSpendVal)
      .replace(/{{validity_days}}/g, String(validityDaysVal));
  };

  // Trigger Individual WhatsApp Greeting (Pro Gated)
  const handleSendToCustomer = (customer: Customer) => {
    requirePro(() => {
      const message = getCompiledMessage(customer.name);
      const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
      const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`, '_blank');
    });
  };

  // Copy Full Message to Clipboard
  const handleCopyMessage = () => {
    const message = getCompiledMessage('Customer');
    navigator.clipboard.writeText(message);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ---------------- TOP HEADER ---------------- */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              <span>WhatsApp Growth &amp; Festive Vouchers</span>
            </span>
            <ProFeatureBadge />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Automated WhatsApp Greetings & Festival Engine
          </h1>
          <p className="text-xs text-slate-500">
            Trigger personalized WhatsApp greetings with discount coupon vouchers for Diwali, Eid, New Year, Birthdays & VIP customers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyMessage}
            className="text-xs font-bold gap-1.5"
          >
            {copiedId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedId ? 'Copied to Clipboard!' : 'Copy Template'}</span>
          </Button>
        </div>
      </div>

      {/* PRO LOCK CARD FOR FREE USERS */}
      {!isPro && (
        <ProFeatureLockedCard
          title="Automated WhatsApp Growth &amp; Festive Engine"
          description="Send automated festive discount vouchers (Diwali, Eid, New Year), birthday gifts, and refill reminders directly to your customers' WhatsApp."
          features={[
            'Festival Greetings & Coupon Codes',
            'Today\'s Birthday Celebration Radar',
            'Category-Smart Sourcing & Refill Alerts',
            'Direct WhatsApp 1-Click Dispatch'
          ]}
        />
      )}

      {/* ---------------- 1. BIRTHDAYS & SPECIAL OCCASIONS RADAR ---------------- */}
      <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 rounded-2xl p-4 sm:p-5 text-white shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
              <Cake className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <div className="text-sm font-black flex items-center gap-2">
                <span>Today's Birthday & Anniversary Celebrations Radar</span>
                <Badge className="bg-white/30 text-white font-bold border-none text-[10px]">
                  {birthdayCustomers.length} Today
                </Badge>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                Send a 1-click personalized celebratory gift voucher to delighted customers on their special day!
              </p>
            </div>
          </div>

          {birthdayCustomers.length > 0 && (
            <Button
              size="sm"
              onClick={() => handleSelectCampaign(CAMPAIGN_PRESETS.find(c => c.id === 'birthday')!)}
              className="bg-white text-slate-900 font-extrabold text-xs hover:bg-amber-50 shadow-sm"
            >
              <Gift className="w-3.5 h-3.5 mr-1 text-rose-600" />
              <span>Send Birthday Vouchers</span>
            </Button>
          )}
        </div>

        {birthdayCustomers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {birthdayCustomers.map((cust) => (
              <div key={cust.id} className="p-3 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-between text-xs border border-white/20">
                <div>
                  <div className="font-extrabold text-white">{cust.name}</div>
                  <div className="text-[10px] text-rose-100 font-mono mt-0.5">
                    {cust.phone} • {formatINR(cust.total_spent)} spent
                  </div>
                </div>
                <button
                  onClick={() => {
                    const bdayCamp = CAMPAIGN_PRESETS.find(c => c.id === 'birthday')!;
                    handleSelectCampaign(bdayCamp);
                    handleSendToCustomer(cust);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white text-rose-700 hover:bg-rose-50 font-bold text-[11px] flex items-center gap-1 shadow-xs"
                >
                  <Send className="w-3 h-3" />
                  <span>Send WhatsApp</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-center text-xs text-rose-100 font-medium">
            🎂 No birthdays detected today. Make sure to record customer birthdays when creating or editing customer profiles.
          </div>
        )}
      </div>

      {/* ---------------- 2. FESTIVAL & OCCASION PRESET PICKER ---------------- */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-emerald-600" />
            <span>Select WhatsApp Marketing Campaign</span>
          </h2>
          
          {/* Campaign Category Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-bold">
            {[
              { id: 'recommended', label: `✨ For ${storeProfile.shortName}` },
              { id: 'niche', label: '🏬 All Niche Specials' },
              { id: 'festival', label: '🪔 Festivals' },
              { id: 'birthday', label: '🎂 Birthdays' },
              { id: 'loyalty', label: '👑 VIP & Comeback' },
              { id: 'all', label: `All (${CAMPAIGN_PRESETS.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCampaignTab(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  campaignTab === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {displayCampaigns.map((camp) => {
            const isSelected = selectedCampaign.id === camp.id;
            const isNicheMatch = camp.businessType === business?.business_type;

            return (
              <button
                key={camp.id}
                type="button"
                onClick={() => handleSelectCampaign(camp)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                {isNicheMatch && (
                  <span className={`absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                    isSelected ? 'bg-amber-400 text-slate-950' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    ✨ Recommended
                  </span>
                )}

                <div>
                  <div className="text-xl mb-1">{camp.icon}</div>
                  <div className="text-xs font-black line-clamp-2 leading-snug">{camp.name}</div>
                  <div className={`text-[10px] font-semibold mt-0.5 truncate ${
                    isSelected ? 'text-amber-300' : 'text-slate-500'
                  }`}>
                    {camp.name_hi}
                  </div>
                </div>

                <div className={`mt-2 pt-1.5 border-t text-[10px] font-mono font-bold flex items-center justify-between ${
                  isSelected ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-400'
                }`}>
                  <span>{camp.defaultDiscount}</span>
                  <span>Code: {camp.defaultCoupon}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- 3. TWO COLUMNS: VOUCHER CONFIGURATOR & MESSAGE PREVIEW ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: VOUCHER & CAMPAIGN CUSTOMIZER (6 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <span>{selectedCampaign.icon}</span>
                  <span>Customize Voucher & Offer Details</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adjust the discount value, coupon code, and minimum purchase limit.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Input
                label="Discount Offer Value"
                placeholder="e.g. 15% OFF, Flat ₹100 OFF"
                value={discountVal}
                onChange={(e) => setDiscountVal(e.target.value)}
              />

              <Input
                label="Custom Coupon Code"
                placeholder="e.g. DIWALI15, BDAY100"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              />

              <Input
                label="Minimum Bill Value"
                placeholder="e.g. ₹500"
                value={minSpendVal}
                onChange={(e) => setMinSpendVal(e.target.value)}
              />

              <Input
                label="Validity (Days)"
                type="number"
                min="1"
                max="90"
                placeholder="7"
                value={validityDaysVal.toString()}
                onChange={(e) => setValidityDaysVal(parseInt(e.target.value) || 7)}
              />
            </div>

            {/* Target Audience Filter Bar */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                Target Audience Group:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'all', label: `All (${customers.length})` },
                  { id: 'birthday', label: `Birthdays (${birthdayCustomers.length})` },
                  { id: 'vip', label: `VIPs (${vipCustomers.length})` },
                  { id: 'inactive', label: `Inactive (${inactiveCustomers.length})` },
                ].map((aud) => (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => setTargetAudience(aud.id as any)}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-bold text-center transition-all ${
                      targetAudience === aud.id
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {aud.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: LIVE WHATSAPP MESSAGE PREVIEW (6 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                  WA
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">WhatsApp Message Live Preview</span>
                  <span className="text-[10px] text-emerald-800 font-semibold">Formatted with emojis & bold highlights</span>
                </div>
              </div>
            </div>

            {/* WhatsApp Chat Bubble */}
            <div className="p-4 rounded-2xl bg-[#EFEAE2] border border-slate-300 shadow-inner">
              <div className="max-w-md bg-white rounded-2xl rounded-tl-xs p-3.5 text-xs text-slate-900 shadow-sm border border-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                {getCompiledMessage('Ramesh Kumar')}
                <div className="text-[10px] text-slate-400 text-right mt-1.5 flex items-center justify-end gap-1">
                  <span>10:30 AM</span>
                  <span className="text-sky-500 font-bold">✓✓</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ---------------- 4. TARGET CUSTOMER RECIPIENTS QUEUE ---------------- */}
      <Card className="p-4 sm:p-5 bg-white border border-slate-200 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-700" />
              <span>Target Customers Queue ({filteredAudience.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click <strong>"Send via WhatsApp"</strong> on any customer to open WhatsApp with the personalized greeting.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
          {filteredAudience.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No customers found matching this audience filter.
            </div>
          ) : (
            filteredAudience.map((cust) => (
              <div key={cust.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 font-extrabold flex items-center justify-center text-xs border border-slate-200">
                    {cust.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 flex items-center gap-2">
                      <span>{cust.name}</span>
                      {cust.date_of_birth && (
                        <Badge variant="outline" size="sm" className="text-[10px] bg-rose-50 text-rose-800 border-rose-200">
                          🎂 {cust.date_of_birth}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      📞 {cust.phone} • Spent {formatINR(cust.total_spent || 0)} ({cust.total_visits || 0} visits)
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleSendToCustomer(cust)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send WhatsApp</span>
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Razorpay Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        businessName={business?.name || 'Your Store'}
      />
    </div>
  );
}
