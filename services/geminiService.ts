import { GoogleGenAI } from "@google/genai";
import { MENU_ITEMS } from '../constants';

// CRITICAL: Always use process.env.API_KEY. Do not hardcode your key here.
// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Construct the system instruction with the menu context
const systemInstruction = `
Você é a Nutri IA do PratoFit, uma assistente virtual focada em alimentação saudável.
Você deve ser prestativa, amigável e especialista em nutrição.

Aqui está o cardápio do restaurante (Marmitas Congeladas):
${JSON.stringify(MENU_ITEMS.map(item => ({
  name: item.title,
  description: item.description,
  price: item.price,
  category: item.category,
  tags: item.tags
})))}

Seu objetivo é ajudar os clientes a escolherem suas refeições:
- Sugira pratos com base nas preferências (low carb, hipertrofia/proteico, sem glúten, comida caseira, etc.).
- Responda dúvidas sobre os ingredientes baseando-se nas descrições.
- Se o usuário pedir algo que não está no menu, sugira educadamente uma alternativa similar do cardápio.
- Seja breve, use emojis ocasionalmente e deixe a resposta apetitosa.
- Sempre cite valores em Reais (R$).
- Responda sempre em Português do Brasil.
`;

export const sendMessageToGemini = async (history: {role: 'user' | 'model', text: string}[], newMessage: string) => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Desculpe, estou tendo problemas para consultar o cardápio agora. Tente novamente em instantes.";
  }
};