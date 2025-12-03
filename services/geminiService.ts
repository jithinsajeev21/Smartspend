import { GoogleGenAI, Type } from "@google/genai";
import { Expense, AnalysisResult, Category } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ParsedReceiptResult {
  items: Omit<Expense, 'id' | 'payer' | 'owner'>[];
  totalDiscount?: number;
}

export const parseReceipt = async (imageData: string, mimeType: string = "image/jpeg"): Promise<ParsedReceiptResult> => {
  const prompt = `
    Analyze this supermarket receipt image to extract expense data.
    
    ### STEP 1: ITEMS & NET PRICES (Handle Item-Specific Savings)
    - Go through the receipt line by line.
    - If an item is followed by a discount line (e.g., "Mackerel ... 5.00" followed by "Savings ... -1.00"), you MUST subtract that saving from the item price immediately.
    - The 'amount' you return for that item must be the **Final Net Price** (e.g. 4.00).
    - Ignore specific line-item savings in the final output, just give the net amount.

    ### STEP 2: GLOBAL COUPONS (Handle Bill-Level Discounts)
    - Look for **generic coupons** applied to the *Subtotal* (e.g. "Coupon", "Voucher", "Promo Code", "$5.00 off Total").
    - **CRITICAL NEGATIVE RULE**: 
      - Do **NOT** extract "Total Savings", "Member Savings", "Card Savings", "You Saved", or "Trip Savings" found at the bottom of the receipt. 
      - These are **SUMMARIES** of the savings you already deducted in Step 1. 
      - If you put this amount in 'totalDiscount', it will be subtracted AGAIN, causing an error.
      - **ONLY** populate 'totalDiscount' if there is an explicit separate line item for a coupon code or voucher that reduces the subtotal.
      - If no such global coupon exists, 'totalDiscount' MUST be 0.

    ### Extraction Rules:
    1. **Store Name:** Identify the Merchant/Supermarket name.
    2. **Items:** Break down the transaction into individual items.
    3. **Attributes:**
       - description: The item name.
       - amount: The **NET** price for this item (Price minus item-specific savings).
       - date: Transaction date (YYYY-MM-DD).
       - store: The Store Name.
       - category: Choose the most accurate category from the provided list.

    Return a JSON object containing the list of items and the totalDiscount.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: imageData
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  amount: { type: Type.NUMBER, description: "Net price of item after individual savings applied" },
                  date: { type: Type.STRING },
                  store: { type: Type.STRING },
                  category: { type: Type.STRING, enum: Object.values(Category) }
                },
                required: ['description', 'amount', 'category', 'date', 'store']
              }
            },
            totalDiscount: { type: Type.NUMBER, description: "Only for generic coupons/vouchers. MUST BE 0 if text says 'Total Savings' or 'You Saved'." }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ParsedReceiptResult;
    }
    throw new Error("No extracted data found");
  } catch (error) {
    console.error("Error parsing receipt:", error);
    throw error;
  }
};

export const analyzeExpenses = async (expenses: Expense[]): Promise<AnalysisResult> => {
  if (expenses.length === 0) {
    return {
      summary: "No grocery data recorded yet. Scan a receipt to get started!",
      tips: ["Track your weekly grocery runs to spot trends."],
      sentiment: 'neutral'
    };
  }

  // Prepare a simplified version of the data including Store and Payer information
  const expenseSummary = expenses.map(e => 
    `${e.date}: €${e.amount} on ${e.category} (${e.description}) at ${e.store}. Paid by ${e.payer}, Owned by ${e.owner}`
  ).join('\n');

  const prompt = `
    Analyze the following list of grocery expenses (Currency is Euro €):
    ${expenseSummary}

    Provide a grocery optimization analysis including:
    1. A brief summary of purchasing habits, mentioning stores and splitting balance if notable.
    2. 3 actionable tips to save money (e.g. suggest switching stores for certain categories if prices seem high).
    3. A sentiment regarding the nutritional and financial balance.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'] }
          },
          required: ['summary', 'tips', 'sentiment']
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("No response text generated");

  } catch (error) {
    console.error("Error analyzing expenses:", error);
    return {
      summary: "Unable to generate analysis at this time.",
      tips: ["Check your network connection.", "Try again later."],
      sentiment: 'neutral'
    };
  }
};
