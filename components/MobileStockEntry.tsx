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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractAccessKeyFromImage = async (base64Image: string): Promise<string | null> => {
    try {
      console.log('🤖 Iniciando extração da chave com Gemini AI...');
      
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
Você é um OCR especializado em ler CUPONS FISCAIS BRASILEIROS (NFC-e).

📋 DESCRIÇÃO VISUAL DA NOTA FISCAL:
Uma NFC-e (cupom fiscal) tem no RODAPÉ:
1. Um QR CODE (quadrado preto e branco)
2. Abaixo do QR Code tem um texto tipo:
   "Consulta via leitor de QR Code"
   ou
   "www.sefaz.pb.gov.br/nfce/consulta"
   
3. Logo ABAIXO dessa URL, tem a CHAVE DE ACESSO:
   - São 44 NÚMEROS agrupados de 4 em 4
   - Formato visual: "1234 5678 9012 3456 7890 1234 5678 9012 3456 7890 1234"
   - Pode estar em 1, 2 ou 3 linhas
   - Pode ter ou não espaços entre os grupos

📝 EXEMPLO REAL de como aparece:
```
Consulte pela chave de acesso em
www.sefaz.pb.gov.br/nfce/qrcode

2524 1234 5678 9012 3456 7890
1234 5678 9012 3456 7890 1234
```

🎯 SUA TAREFA:
1. Procure no RODAPÉ da nota (parte de baixo)
2. Encontre o QR Code
3. ABAIXO do QR Code, procure uma sequência de números
4. Conte se tem 44 dígitos (ignore espaços)
5. Retorne APENAS os 44 números SEM espaços

⚠️ NÃO CONFUNDA COM:
- CNPJ (tem 14 dígitos)
- Número da nota (menor que 10 dígitos)
- Código de barras (diferente)
- Valor total (tem vírgula/pontos)

✅ FORMATO DA RESPOSTA:
- Se encontrar: retorne os 44 números sem espaço (exemplo: 25241234567890123456789012345678901234567890)
- Se NÃO encontrar: retorne apenas "NAO_ENCONTRADA"
- NÃO retorne texto explicativo, APENAS os números OU "NAO_ENCONTRADA"

ANALISE A IMAGEM AGORA:
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
      console.log('📷 Processando foto da nota fiscal...');
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target?.result as string;
        
        // Extrai chave de acesso com Gemini AI
        const key = await extractAccessKeyFromImage(base64Image);
        
        if (!key) {
          alert('❌ Não foi possível ler a chave de acesso da foto.\n\nDicas:\n• Tire foto da parte inferior da nota\n• Certifique-se que os números estão visíveis\n• Evite reflexo e sombra');
          setProcessing(false);
          return;
        }

        // Atualiza o campo
        setAccessKey(key);
        
        // Processa automaticamente
        await processAccessKey(key);
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

    setProcessing(true);
    await processAccessKey(cleanKey);
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
            {/* Dicas de Como Fotografar */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
              <h3 className="font-bold text-blue-900 mb-2">💡 Como tirar a foto:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>📸 Tire foto do <strong>RODAPÉ</strong> do cupom</li>
                <li>🔲 Capture o <strong>QR Code</strong></li>
                <li>🔢 Inclua os <strong>44 números</strong> abaixo do QR Code</li>
                <li>💡 Boa iluminação, sem sombra</li>
                <li>📏 Números legíveis e nítidos</li>
              </ul>
              <div className="mt-3 p-2 bg-white rounded text-xs text-gray-600 border border-blue-200">
                <div className="font-mono text-center">
                  ⬛⬜⬛⬜ ← QR Code<br/>
                  www.sefaz...consulta<br/>
                  <strong className="text-blue-600">2524 1234 5678 9012 3456...</strong> ← 44 números
                </div>
              </div>
            </div>

            {/* Botão Tirar Foto */}
            <label className="block mb-4">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-8 rounded-2xl shadow-lg active:scale-95 transition cursor-pointer text-center">
                <Camera size={64} className="mx-auto mb-4" />
                <div className="font-bold text-2xl mb-2">Tirar Foto da Nota</div>
                <div className="text-sm text-emerald-100">A IA vai ler a chave automaticamente</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>

            {/* Opção Manual */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="text-center mb-4">
                <Key size={48} className="mx-auto text-blue-600 mb-2" />
                <h3 className="font-bold text-gray-800">Ou digite manualmente</h3>
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
                  Buscar Nota
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

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

const MobileStockEntry: React.FC = () => {
  const [accessKey, setAccessKey] = useState('');
  const [processing, setProcessing] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const handleProcessKey = async () => {
    // Remove espaços e valida
    const cleanKey = accessKey.replace(/\s/g, '');
    
    if (cleanKey.length !== 44) {
      alert('⚠️ A chave de acesso deve ter 44 dígitos!');
      return;
    }

    setProcessing(true);
    
    try {
      console.log('🔍 Processando chave de acesso...');
      
      // Monta URL da SEFAZ usando a chave de acesso
      // Formato: https://www.sefaz.pb.gov.br/nfce/qrcode?p=CHAVE|2|1|1|HASH
      const nfceUrl = `https://www.sefaz.pb.gov.br/nfce/qrcode?p=${cleanKey}|2|1|1|`;
      
      const data = await nfceService.processQRCode(nfceUrl);
      
      if (!data.items || data.items.length === 0) {
        alert('⚠️ Nenhum produto encontrado na nota fiscal!');
        return;
      }
      
      setInvoiceData(data);
      setAccessKey(''); // Limpa o campo
    } catch (error: any) {
      console.error('❌ Erro:', error);
      alert(`Erro ao processar: ${error.message}`);
    } finally {
      setProcessing(false);
    }
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
            {/* Formulário Chave de Acesso */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="text-center mb-6">
                <Key size={64} className="mx-auto text-emerald-600 mb-3" />
                <h2 className="text-xl font-bold text-gray-800">Chave de Acesso</h2>
                <p className="text-sm text-gray-600 mt-2">
                  Digite os 44 números da chave de acesso da nota fiscal
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Chave de Acesso (44 dígitos)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={44}
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value.replace(/\D/g, ''))}
                    placeholder="00000000000000000000000000000000000000000000"
                    className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-emerald-500 outline-none text-center font-mono text-sm"
                  />
                  <div className="text-xs text-gray-500 text-center mt-2">
                    {accessKey.length}/44 dígitos
                  </div>
                </div>

                <button
                  onClick={handleProcessKey}
                  disabled={processing || accessKey.length !== 44}
                  className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <Loader className="inline animate-spin mr-2" size={20} />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Key className="inline mr-2" size={20} />
                      Buscar Nota Fiscal
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                <div className="text-xs text-blue-800">
                  <div className="font-bold mb-2">💡 Onde encontrar a chave?</div>
                  <ul className="space-y-1 ml-4">
                    <li>• Abaixo do QR Code da nota fiscal</li>
                    <li>• Sequência de 44 números</li>
                    <li>• Exemplo: 25241112345678901234550010000123451234567890</li>
                  </ul>
                </div>
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
                        {item.items?.length || 1} itens - R$ {(item.totalValue || item.items?.[0]?.totalCost || 0).toFixed(2)}
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
                onClick={() => setInvoiceData(null)}
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
            <div className="bg-white rounded-2xl p-6">
              <Loader className="animate-spin h-12 w-12 text-emerald-600 mx-auto mb-3" />
              <div className="font-bold text-center">Processando...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileStockEntry;

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

const MobileStockEntry: React.FC = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const handleQRCodeScan = async (qrCodeData: string) => {
    setShowCamera(false);
    setProcessing(true);
    
    try {
      console.log('🔍 Processando QR Code...');
      const data = await nfceService.processQRCode(qrCodeData);
      
      if (!data.items || data.items.length === 0) {
        alert('⚠️ Nenhum produto encontrado na nota fiscal!');
        return;
      }
      
      setInvoiceData(data);
    } catch (error: any) {
      console.error('❌ Erro:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setProcessing(false);
    }
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

  if (showCamera) {
    return <CameraScanner onScan={handleQRCodeScan} onClose={() => setShowCamera(false)} />;
  }

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
            {/* Botão QR Code */}
            <div className="space-y-4 mb-6">
              <button
                onClick={() => setShowCamera(true)}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-8 rounded-2xl shadow-lg active:scale-95 transition-transform"
              >
                <QrCode size={64} className="mx-auto mb-4" />
                <div className="font-bold text-2xl mb-2">Escanear QR Code</div>
                <div className="text-sm text-emerald-100">Aponte a câmera para o QR Code da nota fiscal</div>
              </button>
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
                        {item.items?.length || 1} itens - R$ {(item.totalValue || item.items?.[0]?.totalCost || 0).toFixed(2)}
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
        ) : showManualEntry ? (
          // Formulário Manual
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <h3 className="font-bold text-lg mb-4">✏️ Entrada Manual</h3>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Produto</label>
              <input
                type="text"
                placeholder="Ex: Tomate"
                value={manualProduct.name}
                onChange={(e) => setManualProduct({...manualProduct, name: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Quantidade</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="5"
                  value={manualProduct.quantity}
                  onChange={(e) => setManualProduct({...manualProduct, quantity: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-emerald-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Unidade</label>
                <select
                  value={manualProduct.unit}
                  onChange={(e) => setManualProduct({...manualProduct, unit: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-emerald-500 outline-none"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="l">l</option>
                  <option value="ml">ml</option>
                  <option value="unidade">unidade</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Preço Unitário (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="6.50"
                value={manualProduct.unitCost}
                onChange={(e) => setManualProduct({...manualProduct, unitCost: e.target.value})}
            cessing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6">
              <Loader className="animate-spin h-12 w-12 text-emerald-600 mx-auto mb-3" />
              <div className="font-bold text-center">Processando...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de Câmera Simples
const CameraScanner: React.FC<{ onScan: (data: string) => void; onClose: () => void }> = ({ onScan, onClose }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [error, setError] = React.useState('');
  const [scanning, setScanning] = React.useState(false);

  React.useEffect(() => {
    let stream: MediaStream | null = null;
    let interval: NodeJS.Timeout;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScanning(true);
          
          // Escaneia a cada 500ms
          interval = setInterval(async () => {
            if (videoRef.current && canvasRef.current) {
              const canvas = canvasRef.current;
              const video = videoRef.current;
              
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0);
                
                // Tenta detectar QR Code
                if ('BarcodeDetector' in window) {
                  try {
                    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                    const barcodes = await detector.detect(canvas);
                    
                    if (barcodes.length > 0) {
                      clearInterval(interval);
                      stream?.getTracks().forEach(t => t.stop());
                      onScan(barcodes[0].rawValue);
                    }
                  } catch (err) {
                    console.error('Erro ao escanear:', err);
                  }
                }
              }
            }
          }, 500);
        }
      } catch (err) {
        console.error('Erro ao acessar câmera:', err);
        setError('Erro ao acessar câmera. Permita o acesso nas configurações.');
      }
    };

    startCamera();

    return () => {
      clearInterval(interval);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
        <h2 className="font-bold text-lg">📷 Escanear QR Code</h2>
        <button onClick={onClose} className="p-2 hover:bg-emerald-700 rounded-lg">
          <XCircle size={24} />
        </button>
      </div>

      <div className="flex-1 relative">
        {error ? (
          <div className="h-full flex items-center justify-center text-white p-6 text-center">
            <div>
              <div className="text-6xl mb-4">⚠️</div>
              <div>{error}</div>
            </div>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-4 border-emerald-500 rounded-2xl animate-pulse">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white bg-black bg-opacity-70 px-4 py-2 rounded-lg text-center">
                      <div className="font-bold">Aponte para o QR Code</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default MobileStockEntry;
