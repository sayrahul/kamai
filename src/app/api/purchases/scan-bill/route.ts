import { NextRequest, NextResponse } from 'next/server';
import { extractPurchaseBillWithGemini } from '@/lib/ai/geminiClient';
import { parseRupeesToPaise } from '@/lib/utils';
import { PurchaseBillLineItem } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, businessType } = body;

    // 1. Validate payload
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { success: false, message: 'No image data provided for bill scan.' },
        { status: 400 }
      );
    }

    // 2. Vertical Gate Check (Server-side defense in depth)
    if (businessType === 'restaurant') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Purchase bill scanning is not enabled for restaurant/cafe businesses (loose mandi ingredients).' 
        },
        { status: 400 }
      );
    }

    // 3. Check Gemini API Key configuration
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: 'GEMINI_API_KEY is not configured on the server. Please add it to your environment variables.',
        },
        { status: 503 }
      );
    }

    // 4. Extract bill details with Gemini Vision
    const extraction = await extractPurchaseBillWithGemini(
      imageBase64,
      mimeType || 'image/jpeg'
    );

    // 5. Convert currency amounts to paise for internal store accounting
    const convertedLineItems: PurchaseBillLineItem[] = (extraction.line_items || []).map((item) => {
      const unitPricePaise = parseRupeesToPaise(item.unit_price.toString());
      const totalPricePaise = item.total_price 
        ? parseRupeesToPaise(item.total_price.toString()) 
        : unitPricePaise * item.quantity;
      
      // Default recommended selling price with a standard 20% retail margin
      const recommendedSellingPricePaise = Math.round(unitPricePaise * 1.25);

      return {
        raw_name: item.name.trim(),
        is_new_product: true, // will be resolved client-side via fuzzy match
        quantity: item.quantity,
        unit: item.unit || 'piece',
        unit_price: unitPricePaise,
        total_price: totalPricePaise,
        selling_price: recommendedSellingPricePaise,
        confidence: item.confidence || 'medium',
      };
    });

    const totalAmountPaise = extraction.total_amount
      ? parseRupeesToPaise(extraction.total_amount.toString())
      : convertedLineItems.reduce((sum, item) => sum + item.total_price, 0);

    return NextResponse.json({
      success: true,
      data: {
        supplier_name_raw: extraction.supplier_name || '',
        bill_number: extraction.bill_number || '',
        bill_date: extraction.bill_date || '',
        total_amount: totalAmountPaise,
        line_items: convertedLineItems,
        ai_model_used: 'gemini-flash-vision',
        raw_ai_response: JSON.stringify(extraction),
      },
    });
  } catch (error: any) {
    console.error('Error in /api/purchases/scan-bill:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to process purchase bill with AI OCR. Please try again or enter manually.',
      },
      { status: 500 }
    );
  }
}
