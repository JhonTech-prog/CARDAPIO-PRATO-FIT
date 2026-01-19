import React, { useState, useRef } from 'react';
import { Camera, Key, CheckCircle, XCircle, Loader } from 'lucide-react';
import { nfceService } from '../services/nfceService';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || 'AIzaSyAJFkOo6CVhInYzaJTEui15MRv_xfVqCBw';

const MobileStockEntry: React.FC = () => {
  const [accessKey, setAccessKey] = useState('');
  const [processing, setProcessing] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [extractedKey, setExtractedKey] = useState(''); // Código extraído da foto
  const [imageUrl, setImageUrl] = useState(''); // URL da imagem
  const [invoiceText, setInvoiceText] = useState(''); // Texto da nota colado
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invoiceScreenshotRef = useRef<HTMLInputElement>(null);

  const extractInvoiceDataFromScreenshot = async (base64Image: string): Promise<any> => {
    try {
      console.log('🤖 Extraindo dados da nota fiscal com Gemini AI...');
      
      // Lista modelos disponíveis primeiro
      const listResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
      );
      
      if (!listResponse.ok) {
        throw new Error('Não foi possível listar modelos disponíveis');
      }
      
      const modelsList = await listResponse.json();
      console.log('Modelos disponíveis:', modelsList);
      
      // Procura por modelos que suportam generateContent e vision
      const visionModels = modelsList.models?.filter((m: any) => 
        m.supportedGenerationMethods?.includes('generateContent') &&
        (m.name.includes('vision') || m.name.includes('gemini-1.5') || m.name.includes('gemini-pro')) &&
        !m.name.includes('robotics') &&
        !m.name.includes('exp-') &&
        !m.name.includes('preview')
      );
      
      if (!visionModels || visionModels.length === 0) {
        console.error('❌ Nenhum modelo adequado. Disponíveis:', modelsList.models?.map((m: any) => m.name));
        throw new Error('Nenhum modelo de visão disponível');
      }
      
      // Prioriza gemini-1.5-pro ou gemini-pro-vision
      let selectedModel = visionModels.find((m: any) => m.name.includes('gemini-1.5-pro')) ||
                          visionModels.find((m: any) => m.name.includes('gemini-pro-vision')) ||
                          visionModels[0];
      
      const modelName = selectedModel.name.split('/').pop();
      console.log(`✅ Usando modelo: ${modelName}`);
      
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `
Você é um OCR especializado em extrair dados de NOTAS FISCAIS ELETRÔNICAS (NFC-e) brasileiras.

📋 TAREFA: Extrair TODOS os produtos desta nota fiscal.

Para CADA PRODUTO, extraia:
- Nome/Descrição
- Quantidade
- Unidade (UN, KG, L, etc)
- Valor Unitário
- Valor Total

📝 FORMATO DE SAÍDA (JSON):
{
  "supplier": "Nome do fornecedor/loja",
  "cnpj": "CNPJ se visível",
  "invoiceNumber": "Número da nota",
  "totalValue": 59.95,
  "items": [
    {
      "name": "ARROZ BRANCO 1KG",
      "quantity": 2,
      "unit": "UN",
      "unitCost": 5.50,
      "totalCost": 11.00
    }
  ]
}

⚠️ IMPORTANTE:
- Retorne APENAS o JSON, sem explicações
- Se não conseguir ler, retorne: {"error": "Não foi possível ler"}
- Normalize os nomes (remova códigos, deixe limpo)
- Unidade: UN, KG, G, L, ML, PCT, CX

ANALISE A IMAGEM:
`;

      const imagePart = {
        inlineData: {
          data: base64Image.split(',')[1],
          mimeType: 'image/jpeg'
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = result.response;
      const text = response.text().trim();
      
      console.log('🤖 Resposta do Gemini:', text);

      // Remove markdown code blocks se tiver
      let jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const data = JSON.parse(jsonText);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      console.log('✅ Dados extraídos:', data);
      return data;
      
    } catch (error) {
      console.error('❌ Erro ao extrair dados:', error);
      throw error;
    }
  };

  const handleInvoiceScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    
    try {
      console.log('📸 Processando print da nota fiscal...');
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target?.result as string;
        
        // Extrai dados com Gemini AI
        const data = await extractInvoiceDataFromScreenshot(base64Image);
        
        if (!data.items || data.items.length === 0) {
          alert('⚠️ Nenhum produto encontrado!\n\nDicas:\n• Tire print da parte com os PRODUTOS\n• Certifique que os textos estão legíveis\n• Zoom na lista de produtos');
          setProcessing(false);
          return;
        }

        setInvoiceData(data);
        setProcessing(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('❌ Erro:', error);
      alert(`Erro ao processar imagem: ${error.message}`);
      setProcessing(false);
    }
  };

  const handleImageUrl = async () => {
    if (!imageUrl.trim()) {
      alert('⚠️ Cole a URL da imagem');
      return;
    }

    setProcessing(true);
    
    try {
      console.log('🌐 Processando imagem da URL...');
      
      // Converte URL para base64
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target?.result as string;
        
        // Extrai dados com Gemini AI
        const data = await extractInvoiceDataFromScreenshot(base64Image);
        
        if (!data.items || data.items.length === 0) {
          alert('⚠️ Nenhum produto encontrado na imagem!');
          setProcessing(false);
          return;
        }

        setInvoiceData(data);
        setImageUrl('');
        setProcessing(false);
      };
      
      reader.readAsDataURL(blob);
    } catch (error: any) {
      console.error('❌ Erro:', error);
      alert(`Erro ao processar URL: ${error.message}\n\nVerifique se a URL está correta e acessível.`);
      setProcessing(false);
    }
  };

  const handleInvoiceText = async () => {
    if (!invoiceText.trim()) {
      alert('⚠️ Cole o texto da nota fiscal');
      return;
    }

    setProcessing(true);
    
    try {
      console.log('📝 Processando texto da nota fiscal...');
      
      // Lista modelos disponíveis
      const listResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
      );
      
      if (!listResponse.ok) {
        throw new Error('Não foi possível listar modelos disponíveis');
      }
      
      const modelsList = await listResponse.json();
      console.log('📋 Modelos disponíveis:', modelsList);
      
      // Procura modelos de texto (não precisa de visão)
      const textModels = modelsList.models?.filter((m: any) => 
        m.supportedGenerationMethods?.includes('generateContent') &&
        !m.name.includes('vision') &&
        !m.name.includes('robotics')
      );
      
      if (!textModels || textModels.length === 0) {
        console.error('❌ Nenhum modelo adequado. Disponíveis:', modelsList.models?.map((m: any) => m.name));
        throw new Error('Nenhum modelo de texto disponível');
      }
      
      // Prioriza gemini-2.5 (incluindo preview) para processamento de texto
      const selectedModel = textModels.find((m: any) => m.name.includes('gemini-2.5-flash')) ||
                           textModels.find((m: any) => m.name.includes('gemini-2.5') && m.name.includes('preview')) ||
                           textModels.find((m: any) => m.name.includes('gemini-1.5-flash')) ||
                           textModels[0];
      const modelName = selectedModel.name.split('/').pop();
      console.log(`✅ Usando modelo: ${modelName}`);
      
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `
Você é um assistente que extrai produtos de notas fiscais.

📋 TAREFA: Do texto abaixo, extraia TODOS os produtos com:
1. Nome do produto
2. Quantidade (número)
3. Valor total do produto (em reais)

REGRAS:
- Ignore cabeçalhos, rodapés, totais gerais
- Se quantidade não especificada, use 1
- Extraia TODOS os produtos que encontrar
- Normalize nomes (remova códigos, deixe só o nome)

📊 RETORNE UM JSON:
{
  "supplier": "Nome do fornecedor ou loja",
  "items": [
    {
      "name": "ARROZ BRANCO",
      "quantity": 5,
      "totalCost": 22.50
    }
  ]
}

TEXTO DA NOTA:
${invoiceText}

RETORNE APENAS O JSON, SEM TEXTO ADICIONAL.
`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text().trim();
      
      console.log('🤖 Resposta do Gemini:', text);

      // Extrai JSON da resposta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Não foi possível extrair JSON da resposta');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      if (!data.items || data.items.length === 0) {
        alert('⚠️ Nenhum produto encontrado no texto!');
        setProcessing(false);
        return;
      }

      // Calcula valores derivados
      data.items = data.items.map((item: any) => {
        const quantity = item.quantity || 1;
        const totalCost = item.totalCost || 0;
        const unitCost = quantity > 0 ? totalCost / quantity : 0;
        
        return {
          name: item.name,
          quantity: quantity,
          unit: item.unit || 'un',
          unitCost: unitCost,
          totalCost: totalCost
        };
      });

      // Calcula total geral
      data.totalValue = data.items.reduce((sum: number, item: any) => sum + item.totalCost, 0);

      setInvoiceData(data);
      setInvoiceText('');
      setProcessing(false);
      
      console.log(`✅ ${data.items.length} produtos extraídos!`);
    } catch (error: any) {
      console.error('❌ Erro:', error);
      alert(`Erro ao processar texto: ${error.message}`);
      setProcessing(false);
    }
  };

  const extractAccessKeyFromImage = async (base64Image: string): Promise<string | null> => {
    try {
      console.log('🤖 Iniciando extração da chave com Gemini AI...');
      
      // Primeiro lista modelos disponíveis (igual recipeOCRService)
      const listResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
      );
      
      if (!listResponse.ok) {
        throw new Error('Não foi possível listar modelos disponíveis');
      }
      
      const modelsList = await listResponse.json();
      console.log('Modelos disponíveis:', modelsList);
      
      // Procura por modelos que suportam generateContent e vision
      const visionModels = modelsList.models?.filter((m: any) => 
        m.supportedGenerationMethods?.includes('generateContent') &&
        (m.name.includes('vision') || m.name.includes('gemini-1.5') || m.name.includes('gemini-pro')) &&
        !m.name.includes('robotics') && // Exclui modelos de robótica
        !m.name.includes('exp-') && // Exclui experimentais
        !m.name.includes('preview') // Exclui previews
      );
      
      if (!visionModels || visionModels.length === 0) {
        console.error('❌ Nenhum modelo adequado. Disponíveis:', modelsList.models?.map((m: any) => m.name));
        throw new Error('Nenhum modelo de visão disponível');
      }
      
      // Prioriza gemini-1.5-pro ou gemini-pro-vision
      let selectedModel = visionModels.find((m: any) => m.name.includes('gemini-1.5-pro')) ||
                          visionModels.find((m: any) => m.name.includes('gemini-pro-vision')) ||
                          visionModels[0];
      
      const modelName = selectedModel.name.split('/').pop();
      console.log(`✅ Usando modelo: ${modelName}`);
      
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `
Você é um OCR especializado. Sua ÚNICA tarefa é encontrar e retornar uma sequência de 44 NÚMEROS.

🔍 O QUE PROCURAR:
Na imagem, há uma sequência de 44 dígitos numéricos que geralmente está:
- Perto de um texto como "www.sefaz.pb.gov.br" ou similar
- ABAIXO de uma URL
- Pode estar dividida em grupos (exemplo: 2526 0112 9197 3400 0310 6311 3000 4299 7516 3182 9541)
- Pode estar em 1, 2 ou 3 linhas

⚠️ NÃO PROCURE:
- QR Code (ignore completamente)
- Código de barras
- CNPJ (só tem 14 números)
- Valores em dinheiro (tem vírgula/R$)
- Data (tem barras)

✅ RESPOSTA:
- Se encontrar 44 números: retorne APENAS os 44 dígitos sem espaços (exemplo: 25260112919734000310631130004299751631829541)
- Se NÃO encontrar: retorne apenas "NAO_ENCONTRADA"
- NÃO adicione explicações, APENAS os números OU "NAO_ENCONTRADA"

🎯 DICA: Os 44 números geralmente aparecem logo após texto como "www.sefaz..." ou "Consulte pela chave"

ANALISE A IMAGEM:
`;

      const imagePart = {
        inlineData: {
          data: base64Image.split(',')[1],
          mimeType: 'image/jpeg'
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = result.response;
      const text = response.text().trim();
      
      console.log('🤖 Resposta do Gemini:', text);

      // Extrai apenas números
      const cleanKey = text.replace(/\D/g, '');
      
      console.log('🔢 Números extraídos:', cleanKey, '(', cleanKey.length, 'dígitos)');
      
      if (cleanKey.length === 44) {
        console.log('✅ Chave válida extraída:', cleanKey);
        return cleanKey;
      } else if (text.toUpperCase().includes('NAO_ENCONTRADA') || text.toUpperCase().includes('NÃO')) {
        console.log('❌ IA não encontrou a chave na imagem');
        return null;
      } else if (cleanKey.length > 44) {
        const key44 = cleanKey.substring(0, 44);
        console.log('🔧 Usando primeiros 44 dígitos:', key44);
        return key44;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erro ao extrair chave:', error);
      return null;
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    
    try {
      console.log('📷 Processando foto do cupom físico para EXTRAIR CÓDIGO...');
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target?.result as string;
        
        // Extrai APENAS a chave de acesso (não busca na SEFAZ)
        const key = await extractAccessKeyFromImage(base64Image);
        
        if (!key) {
          const tryManual = confirm('❌ Não consegui ler o código automaticamente.\n\n✅ Quer digitar os 44 números manualmente?');
          
          if (tryManual) {
            setProcessing(false);
            return;
          }
          
          alert('💡 Dica: Tire foto da parte INFERIOR da nota fiscal, incluindo:\n• O QR Code\n• A URL (www.sefaz...)\n• Os 44 números abaixo');
          setProcessing(false);
          return;
        }

        // APENAS exibe o código extraído (não busca na SEFAZ)
        setExtractedKey(key);
        setAccessKey(key);
        setProcessing(false);
        
        alert(`✅ Código extraído com sucesso!\n\n${key}\n\nAgora:\n1. Copie o código abaixo\n2. Clique em "Abrir na SEFAZ"\n3. Cole o código e clique em "Consultar"\n4. Tire print da tela\n5. Faça upload do print`);
      };
      
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('❌ Erro:', error);
      alert(`Erro ao processar foto: ${error.message}`);
      setProcessing(false);
    }
  };

  const processAccessKey = async (key: string) => {
    try {
      console.log('🔍 Buscando nota fiscal via proxy backend...');
      console.log('🔑 Chave:', key);
      
      // URL do backend (usa variável de ambiente ou fallback para Render)
      const backendUrl = API_URL || 'https://cardapio-prato-fit.onrender.com';
      const apiEndpoint = `${backendUrl}/api/nfce/fetch`;
      
      console.log('🌐 Endpoint:', apiEndpoint);
      
      // Chama o proxy do backend para evitar CORS
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessKey: key })
      });

      const result = await response.json();
      
      console.log('📦 Resposta do backend:', { 
        success: result.success, 
        hasHtml: !!result.html, 
        htmlLength: result.html?.length,
        url: result.url,
        error: result.error 
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar nota fiscal');
      }

      if (!result.html || result.html.length < 100) {
        throw new Error('Resposta da SEFAZ está vazia ou incompleta');
      }

      console.log('✅ HTML recebido do backend, processando...');
      console.log('📄 Tamanho do HTML:', result.html.length, 'caracteres');
      
      // Processa o HTML usando o nfceService
      const data = await nfceService.processHTML(result.html);
      
      console.log('✅ Dados extraídos:', data);
      
      if (!data.items || data.items.length === 0) {
        alert('⚠️ Nenhum produto encontrado na nota fiscal!\n\nTente tirar outra foto ou digitar a chave manualmente.');
        setProcessing(false);
        return;
      }
      
      console.log('✅ Dados processados com sucesso:', data.items.length, 'itens');
      setInvoiceData(data);
      setProcessing(false);
    } catch (error: any) {
      console.error('❌ Erro completo:', error);
      
      let errorMessage = 'Erro desconhecido';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = '🌐 Servidor offline. Verifique sua conexão ou tente novamente em alguns minutos.';
      } else if (error.message.includes('Nenhum produto')) {
        errorMessage = '📦 A nota foi encontrada, mas não conseguimos extrair os produtos.\n\nTente:\n• Tirar outra foto mais nítida\n• Digitar a chave manualmente';
      } else if (error.message.includes('buscar nota fiscal')) {
        errorMessage = '🔍 Não foi possível acessar a SEFAZ.\n\nVerifique:\n• Se a chave está correta (44 dígitos)\n• Se a nota foi emitida recentemente\n• Se o site da SEFAZ está disponível';
      } else {
        errorMessage = `❌ ${error.message}`;
      }
      
      alert(errorMessage);
      setProcessing(false);
    }
  };

  const handleProcessKey = async () => {
    const cleanKey = accessKey.replace(/\s/g, '');
    
    if (cleanKey.length !== 44) {
      alert('⚠️ A chave de acesso deve ter 44 dígitos!');
      return;
    }

    // Apenas exibe o código para o usuário copiar e ir na SEFAZ
    setExtractedKey(cleanKey);
    alert(`✅ Código válido!\n\n${cleanKey}\n\nAgora:\n1. Copie o código\n2. Clique em "Abrir na SEFAZ"\n3. Cole e consulte\n4. Tire print da tela\n5. Faça upload do print acima`);
  };

  const handleSave = async () => {
    if (!invoiceData) return;

    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/stock-entries/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: invoiceData.supplier,
          invoiceNumber: invoiceData.invoiceNumber,
          date: invoiceData.date,
          items: invoiceData.items,
          source: 'nota_fiscal'
        })
      });

      if (response.ok) {
        setHistory([{ ...invoiceData, timestamp: new Date() }, ...history]);
        setInvoiceData(null);
        setAccessKey('');
        alert('✅ Entrada registrada com sucesso!');
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      {/* Header */}
      <div className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow-lg">
        <h1 className="text-xl font-black">📦 Entrada de Estoque</h1>
        <p className="text-xs text-emerald-100 mt-1">PratoFit - Gestão Mobile</p>
      </div>

      <div className="p-4 pb-20">
        {!invoiceData ? (
          <>
            {/* Colar Texto da Nota */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-lg p-6 mb-4">
              <h2 className="text-white font-bold text-lg mb-3">📝 Cadastrar Nota Fiscal</h2>
              <p className="text-white text-sm mb-4">
                Cole o texto completo da nota fiscal abaixo
              </p>
              
              <div className="space-y-3">
                <textarea
                  value={invoiceText}
                  onChange={(e) => setInvoiceText(e.target.value)}
                  placeholder="Cole aqui todo o texto da nota fiscal...&#10;&#10;Exemplo:&#10;SUPERMERCADO XYZ&#10;ARROZ BRANCO 5KG - R$ 22,50&#10;FEIJAO PRETO 1KG - R$ 8,90&#10;BATATA 2KG - R$ 7,80&#10;..."
                  rows={15}
                  className="w-full p-4 border-2 border-white rounded-xl focus:border-yellow-300 outline-none text-sm font-mono bg-white"
                  disabled={processing}
                />
                
                <button
                  onClick={handleInvoiceText}
                  disabled={processing || !invoiceText.trim()}
                  className="w-full bg-white text-green-600 py-4 rounded-xl font-bold text-lg active:scale-95 transition disabled:bg-gray-300 disabled:text-gray-500 shadow-lg"
                >
                  {processing ? '⏳ Processando...' : '🚀 Processar Nota Fiscal'}
                </button>
              </div>
            </div>

            {/* Histórico */}
            {history.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-4">
                <h3 className="font-bold text-gray-800 mb-3">📋 Últimas Entradas</h3>
                <div className="space-y-2">
                  {history.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="border-l-4 border-emerald-500 bg-emerald-50 p-3 rounded">
                      <div className="font-bold text-sm">{item.supplier}</div>
                      <div className="text-xs text-gray-600">
                        {item.items?.length || 1} itens - R$ {(item.totalValue || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(item.timestamp).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          // Preview da Nota Fiscal
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <h3 className="font-bold text-lg mb-4">✅ Confirmar Entrada</h3>

              <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500">Fornecedor</div>
                  <div className="font-bold">{invoiceData.supplier}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Valor Total</div>
                  <div className="font-bold text-emerald-600 text-xl">
                    R$ {invoiceData.totalValue?.toFixed(2)}
                  </div>
                </div>
              </div>

              <h4 className="font-bold mb-2">Produtos ({invoiceData.items.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {invoiceData.items.map((item: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-lg border">
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {item.quantity} {item.unit} × R$ {item.unitCost?.toFixed(2)} = 
                      <span className="text-emerald-600 font-bold ml-1">
                        R$ {item.totalCost?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setInvoiceData(null); setAccessKey(''); }}
                className="flex-1 bg-gray-500 text-white py-4 rounded-xl font-bold active:scale-95 transition"
              >
                <XCircle size={20} className="inline mr-2" />
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={processing}
                className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-bold active:scale-95 transition disabled:bg-gray-300"
              >
                <CheckCircle size={20} className="inline mr-2" />
                Confirmar
              </button>
            </div>
          </div>
        )}

        {processing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm mx-4">
              <Loader className="animate-spin h-12 w-12 text-emerald-600 mx-auto mb-3" />
              <div className="font-bold text-center">Processando...</div>
              <div className="text-sm text-gray-600 text-center mt-2">
                A IA está lendo a nota fiscal
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileStockEntry;
