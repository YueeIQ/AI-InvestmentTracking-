import { GoogleGenAI, Type } from "@google/genai";
import { Holding, AIAdvice } from '../types';

export const getSmartAdvice = async (holdings: Holding[]): Promise<AIAdvice[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Prepare the portfolio summary for the prompt
  const portfolioText = holdings.map(h => 
    `Type: ${h.type}, Name: ${h.name}, Code: ${h.code}, Buy Price: ${h.buyPrice}, Current Price: ${h.currentPrice}`
  ).join('\n');

  const prompt = `
    I am a personal investor. Here is my current portfolio:
    ${portfolioText}

    For each unique asset, please analyze it briefly and suggest 3 "better" alternatives (funds or stocks in similar sectors/categories) that have historically performed better or have lower fees.
    
    Return the response in strictly valid JSON format matching the requested schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              assetName: { type: Type.STRING },
              assetCode: { type: Type.STRING },
              alternatives: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    code: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as AIAdvice[];
    }
    return [];

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
