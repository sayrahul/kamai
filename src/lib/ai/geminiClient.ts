import { BILL_SCAN_SYSTEM_PROMPT, PurchaseBillExtractionSchema, PurchaseBillExtractionResult } from './billScanPrompt';

/**
 * Server-side Gemini API client for processing invoice/bill image OCR
 */
export async function extractPurchaseBillWithGemini(
  base64Data: string,
  mimeType: string = 'image/jpeg'
): Promise<PurchaseBillExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }

  // Primary model with fallback
  const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError: any = null;

  // Clean raw base64 string if data URL prefix was passed
  const cleanBase64 = base64Data.includes(',')
    ? base64Data.split(',')[1]
    : base64Data;

  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `${BILL_SCAN_SYSTEM_PROMPT}\n\nExtract and return structured JSON conforming to the requested schema.`,
              },
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Gemini model ${model} returned error status ${response.status}:`, errorText);
        lastError = new Error(`Gemini API error (${response.status}): ${errorText}`);
        continue;
      }

      const responseData = await response.json();
      const candidateText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!candidateText) {
        console.warn(`Gemini model ${model} returned empty candidate text.`);
        lastError = new Error('Empty response from AI Vision model.');
        continue;
      }

      // Parse JSON from model output
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(candidateText);
      } catch (parseErr) {
        // Strip markdown code fences if present
        const cleanedText = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedJson = JSON.parse(cleanedText);
      }

      // Validate against Zod schema
      const validated = PurchaseBillExtractionSchema.parse(parsedJson);
      return validated;
    } catch (err: any) {
      console.warn(`Failed extracting with model ${model}:`, err.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to extract purchase bill details from image.');
}
