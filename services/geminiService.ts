
import { GoogleGenAI, Type } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async analyzeSales(salesData: any) {
    const prompt = `Analizza questi dati di vendita di una panetteria e fornisci 3 suggerimenti pratici per migliorare il business o ottimizzare il magazzino: ${JSON.stringify(salesData)}`;
    
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return response.text;
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Impossibile generare suggerimenti al momento.";
    }
  }

  async getInventoryAlerts(inventory: any) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Controlla lo stato del magazzino e segnala criticità: ${JSON.stringify(inventory)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alerts: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }
}
