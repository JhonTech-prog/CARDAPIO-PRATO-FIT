import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * SERVIÇO DE IA PARA LEITURA DE RECEITAS
 * Usa Google Gemini Vision para extrair receitas escritas à mão
 */

// @ts-ignore
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyBn8HC5au-4SGJmuR9S1VyrgHk_MWVRyB8';
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Processa imagem de receita manuscrita e extrai ingredientes
 */
export async function extractRecipeFromImage(imageBase64: string, productName: string) {
  try {
    // Primeiro lista modelos disponíveis
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    
    if (!listResponse.ok) {
      throw new Error('Não foi possível listar modelos disponíveis');
    }
    
    const modelsList = await listResponse.json();
    console.log('Modelos disponíveis:', modelsList);
    
    // Procura por modelos que suportam generateContent e vision
    const visionModels = modelsList.models?.filter((m: any) => 
      m.supportedGenerationMethods?.includes('generateContent') &&
      (m.name.includes('vision') || m.name.includes('1.5') || m.name.includes('2.0') || m.name.includes('2.5')) &&
      !m.name.includes('robotics')
    );
    
    if (!visionModels || visionModels.length === 0) {
      throw new Error('Nenhum modelo de visão disponível. Modelos encontrados: ' + JSON.stringify(modelsList));
    }
    
    // Prioriza gemini-2.5 (incluindo preview que estava funcionando)
    let selectedModel = visionModels.find((m: any) => m.name.includes('gemini-2.5-flash')) ||
                        visionModels.find((m: any) => m.name.includes('gemini-2.5') && m.name.includes('preview')) ||
                        visionModels.find((m: any) => m.name.includes('gemini-1.5-flash') && !m.name.includes('exp')) ||
                        visionModels.find((m: any) => m.name.includes('gemini-1.5-pro')) ||
                        visionModels[0];
    
    const modelName = selectedModel.name.split('/').pop(); // Pega apenas o nome sem o prefixo
    console.log(`Usando modelo: ${modelName}`);
    
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const prompt = `Você é um especialista em culinária e deve extrair uma receita desta imagem.

Analise a imagem desta receita escrita à mão e extraia as seguintes informações em formato JSON:

{
  "productName": "Nome do prato",
  "ingredients": [
    {
      "name": "Nome do ingrediente",
      "quantity": 100,
      "unit": "g"
    }
  ],
  "preparation": "Modo de preparo",
  "portionSize": 1
}

IMPORTANTE:
- Converta todas as medidas para gramas (g) ou mililitros (ml)
- Colher de sopa = 15ml
- Colher de chá = 5ml
- Xícara = 240ml
- Normalize os nomes dos ingredientes (ex: "arroz branco" → "arroz")
- Retorne APENAS o JSON, sem texto adicional`;

    const imageParts = [{
      inlineData: {
        data: imageBase64.split(',')[1] || imageBase64,
        mimeType: 'image/jpeg'
      }
    }];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const textContent = response.text();
    
    if (!textContent) {
      throw new Error('Nenhum conteúdo retornado pela IA');
    }

    // Remove markdown code blocks se presentes
    const jsonText = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const extractedData = JSON.parse(jsonText);

    console.log(`✅ Modelo ${modelName} funcionou!`);
    return {
      success: true,
      data: extractedData
    };
        
  } catch (error: any) {
    console.error('Erro ao processar imagem:', error);
    return {
      success: false,
      error: error.message || String(error)
    };
  }
}

/**
 * Valida se a receita extraída está no formato correto
 */
export function validateExtractedRecipe(recipe: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!recipe.productName || recipe.productName.trim() === '') {
    errors.push('Nome do produto não encontrado');
  }

  if (!recipe.ingredients || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    errors.push('Nenhum ingrediente encontrado');
  } else {
    recipe.ingredients.forEach((ing: any, index: number) => {
      if (!ing.name) errors.push(`Ingrediente ${index + 1}: nome não encontrado`);
      if (!ing.quantity || ing.quantity <= 0) errors.push(`Ingrediente ${index + 1}: quantidade inválida`);
      if (!ing.unit) errors.push(`Ingrediente ${index + 1}: unidade não especificada`);
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export const recipeOCRService = {
  extractRecipeFromImage,
  validateExtractedRecipe
};
