import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || 'AIzaSyAJFkOo6CVhInYzaJTEui15MRv_xfVqCBw';

const MobileStockEntry: React.FC = () => {
  const [processing, setProcessing] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [invoiceText, setInvoiceText] = useState('');

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
        !m.name.includes('robotics') &&
        !m.name.includes('exp-') &&
        !m.name.includes('preview')
      );
      
      if (!textModels || textModels.length === 0) {
        console.error('❌ Nenhum modelo adequado. Disponíveis:', modelsList.models?.map((m: any) => m.name));
        throw new Error('Nenhum modelo de texto disponível');
      }
      
      const selectedModel = textModels[0];
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

  const handleSave = async () => {
    if (!invoiceData) return;

    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/stock-entries/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: invoiceData.supplier,
          invoiceNumber: invoiceData.invoiceNumber || 'N/A',
          date: new Date().toISOString(),
          items: invoiceData.items,
          source: 'nota_fiscal_texto'
        })
      });

      if (response.ok) {
        setHistory([{ ...invoiceData, timestamp: new Date() }, ...history]);
        setInvoiceData(null);
        alert('✅ Nota fiscal cadastrada com sucesso!');
      } else {
        throw new Error('Erro ao salvar no servidor');
      }
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold">📦 Cadastro de Estoque</h1>
        <p className="text-emerald-100 text-sm mt-1">Cole o texto da nota fiscal</p>
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
                        {item.items?.length || 0} produtos - R$ {item.totalValue?.toFixed(2)}
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

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setInvoiceData(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-xl font-bold"
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={processing}
                  className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold active:scale-95 transition disabled:bg-gray-300"
                >
                  {processing ? <Loader className="animate-spin mx-auto" /> : '✅ Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {processing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl">
              <Loader className="animate-spin mx-auto mb-3 text-emerald-600" size={48} />
              <div className="text-gray-800 font-bold">Processando...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileStockEntry;
