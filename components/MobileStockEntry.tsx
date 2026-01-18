import React, { useState, useRef } from 'react';
import { Camera, Key, CheckCircle, XCircle, Loader } from 'lucide-react';
import { nfceService } from '../services/nfceService';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || 'AIzaSyAtdBlGO14fLgVGV_qfiRgi5cXPzRsc7DM';

const MobileStockEntry: React.FC = () => {
  const [accessKey, setAccessKey] = useState('');
  const [processing, setProcessing] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [extractedKey, setExtractedKey] = useState(''); // Código extraído da foto
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invoiceScreenshotRef = useRef<HTMLInputElement>(null);

  const extractInvoiceDataFromScreenshot = async (base64Image: string): Promise<any> => {
    try {
      console.log('🤖 Extraindo dados da nota fiscal com Gemini AI...');
      
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
      alert(`Erro ao processar print: ${error.message}`);
      setProcessing(false);
    }
  };

  const extractAccessKeyFromImage = async (base64Image: string): Promise<string | null> => {
    try {
      console.log('🤖 Iniciando extração da chave com Gemini AI...');
      
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
Você é um OCR especializado em ler CUPONS FISCAIS NFC-e da SEFAZ BRASILEIRA.

🎯 OBJETIVO: Extrair a CHAVE DE ACESSO de 44 dígitos.

📍 ONDE ESTÁ A CHAVE:
A chave fica NO RODAPÉ do cupom, logo ACIMA do QR Code ou ABAIXO da frase:
- "Consulte pela chave de acesso em"
- "www.sefaz.pb.gov.br/nfce/consulta" (ou outro estado)

📝 FORMATO EXATO DA CHAVE:
- Sempre 44 NÚMEROS (pode ter espaços entre eles)
- Aparece em 1, 2 ou 3 linhas
- Números agrupados de 4 em 4 dígitos

EXEMPLO REAL (como aparece no cupom):
"""
www.sefaz.pb.gov.br/nfce/consulta
2526 0112 9197 3400 0310 6311 3000 4299 7516 3182 9541
"""

OUTRO EXEMPLO:
"""
Consulte pela chave de acesso em
2524 1234 5678 9012 3456
7890 1234 5678 9012 3456
7890 1234
"""

🔍 INSTRUÇÕES:
1. Procure no RODAPÉ (parte inferior) da nota
2. Encontre a URL "www.sefaz..." ou texto "Consulte pela chave"
3. A chave está logo ABAIXO ou ACIMA desse texto
4. Conte os números - deve ter EXATAMENTE 44 dígitos
5. Ignore espaços e junte todos os números

❌ NÃO CONFUNDA COM:
- CNPJ (só 14 dígitos) - exemplo: 12.345.678/0001-90
- Número da nota (só 6-9 dígitos)
- Data (tem barras /)
- Valor (tem vírgula ou R$)
- Protocolo de autorização (tem letras)

✅ RETORNE:
- Se encontrar: os 44 dígitos SEM ESPAÇOS (exemplo: 25260112919734000310631130004299751631829541)
- Se NÃO encontrar: apenas a palavra "NAO_ENCONTRADA"
- NÃO adicione explicações, APENAS os 44 números OU "NAO_ENCONTRADA"

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
      
      console.log('🤖 Resposta bruta do Gemini:', text);

      // Extrai apenas números
      const cleanKey = text.replace(/\D/g, '');
      
      console.log('🔢 Números extraídos:', cleanKey, '(', cleanKey.length, 'dígitos)');
      
      if (cleanKey.length === 44) {
        console.log('✅ Chave válida extraída:', cleanKey);
        return cleanKey;
      } else if (text.toUpperCase().includes('NAO_ENCONTRADA') || text.toUpperCase().includes('NÃO')) {
        console.log('❌ IA não encontrou a chave na imagem');
        return null;
      } else if (cleanKey.length > 0) {
        console.log('⚠️ Chave inválida - tem', cleanKey.length, 'dígitos, precisa de 44');
        // Tenta pegar os primeiros ou últimos 44 dígitos se tiver mais
        if (cleanKey.length > 44) {
          const key44 = cleanKey.substring(0, 44);
          console.log('🔧 Tentando usar primeiros 44 dígitos:', key44);
          return key44;
        }
        return null;
      } else {
        console.log('❌ Nenhum número encontrado');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao extrair chave com Gemini:', error);
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
            {/* MÉTODO PRINCIPAL: Upload do Print da SEFAZ */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 mb-4">
              <h2 className="text-white font-bold text-lg mb-3">🎯 MÉTODO RECOMENDADO</h2>
              <p className="text-white text-sm mb-4">
                1. Escaneie QR Code do cupom (câmera do celular)<br/>
                2. Site da SEFAZ abre → Clique "Consultar"<br/>
                3. Tire PRINT da tela com produtos<br/>
                4. Faça upload abaixo ⬇️
              </p>
              
              <label className="block">
                <div className="bg-white text-blue-600 p-6 rounded-xl shadow active:scale-95 transition cursor-pointer text-center">
                  <Camera size={48} className="mx-auto mb-3" />
                  <div className="font-bold text-xl mb-2">📱 Upload Print da SEFAZ</div>
                  <div className="text-sm text-gray-600">
                    Print da tela com produtos → IA cadastra tudo
                  </div>
                </div>
                <input
                  ref={invoiceScreenshotRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInvoiceScreenshot}
                  className="hidden"
                  disabled={processing}
                />
              </label>
            </div>

            <div className="text-center text-gray-400 text-sm my-4 font-bold">
              ─── OU (menos confiável) ───
            </div>

            {/* PASSO 1: Extrair Código da Nota Física */}
            <div className="bg-gray-100 rounded-2xl shadow p-6 mb-4 border-2 border-gray-300">
              <h2 className="text-gray-700 font-bold text-lg mb-3">📸 Extrair Código Automaticamente</h2>
              <p className="text-gray-600 text-sm mb-4">Foto do cupom físico → IA tenta extrair código</p>
              
              <label className="block">
                <div className="bg-white text-gray-700 p-6 rounded-xl shadow active:scale-95 transition cursor-pointer text-center border">
                  <Camera size={48} className="mx-auto mb-3" />
                  <div className="font-bold text-xl mb-2">Tentar Ler Cupom</div>
                  <div className="text-sm text-gray-600">
                    Tire foto do RODAPÉ (QR Code + números)
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={processing}
                />
              </label>
            </div>

            {/* Exibir código extraído */}
            {extractedKey && (
              <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4 mb-4">
                <h3 className="font-bold text-green-900 mb-2">✅ Código Extraído:</h3>
                <div className="bg-white p-3 rounded border border-green-300 mb-3">
                  <div className="font-mono text-sm break-all">{extractedKey}</div>
                </div>
                
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(extractedKey);
                    alert('✅ Código copiado!');
                  }}
                  className="w-full bg-blue-500 text-white py-2 rounded-lg mb-2 font-bold"
                >
                  📋 Copiar Código
                </button>
                
                <a
                  href={`https://www.sefaz.pb.gov.br/nfce/qrcode?p=${extractedKey}|2|1|1|`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-500 text-white py-2 rounded-lg text-center font-bold"
                >
                  🌐 Abrir na SEFAZ
                </a>
                
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded text-sm">
                  <strong>⚠️ Agora:</strong>
                  <ol className="list-decimal ml-4 mt-2 space-y-1">
                    <li>Clique em "Abrir na SEFAZ" acima</li>
                    <li>Cole o código e clique "Consultar"</li>
                    <li>Tire PRINT da tela completa</li>
                    <li>Use o botão azul no topo para upload ⬆️</li>
                  </ol>
                </div>
              </div>
            )}

            <div className="text-center text-gray-500 text-sm my-4">ou digite manualmente</div>

            {/* Opção Manual */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="text-center mb-4">
                <Key size={48} className="mx-auto text-blue-600 mb-2" />
                <h3 className="font-bold text-gray-800">Digite o código manualmente</h3>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={44}
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value.replace(/\D/g, ''))}
                  placeholder="44 dígitos da chave de acesso"
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none text-center font-mono text-sm"
                />
                <div className="text-xs text-gray-500 text-center">
                  {accessKey.length}/44 dígitos
                </div>

                <button
                  onClick={handleProcessKey}
                  disabled={processing || accessKey.length !== 44}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold active:scale-95 transition disabled:bg-gray-300"
                >
                  ✅ Validar Código
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
