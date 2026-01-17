import React, { useState } from 'react';
import { Camera, QrCode, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { nfceService } from '../services/nfceService';
import { invoiceOCRService } from '../services/invoiceOCRService';
import QRCodeScannerLive from './QRCodeScannerLive';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

const MobileStockEntry: React.FC = () => {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const handleQRCodeScan = async (qrCodeData: string) => {
    setShowQRScanner(false);
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target?.result as string;
        const result = await invoiceOCRService.extractInvoiceData(base64Image);
        
        if (!result.items || result.items.length === 0) {
          alert('⚠️ Nenhum produto detectado! Tire foto mostrando a lista de produtos.');
          return;
        }
        
        setInvoiceData(result);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
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
          source: 'cupom_fiscal'
        })
      });

      if (response.ok) {
        // Adiciona ao histórico
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
      {/* Header Mobile */}
      <div className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black">📦 Entrada de Estoque</h1>
          <div className="text-xs bg-emerald-700 px-3 py-1 rounded-full">
            Mobile
          </div>
        </div>
        <p className="text-xs text-emerald-100 mt-1">
          PratoFit - Gestão de Produção
        </p>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-20">
        {!invoiceData ? (
          <>
            {/* Botões de Ação */}
            <div className="space-y-4 mb-6">
              <button
                onClick={() => setShowQRScanner(true)}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-6 rounded-2xl shadow-lg active:scale-95 transition-transform"
              >
                <QrCode size={48} className="mx-auto mb-3" />
                <div className="font-bold text-lg mb-1">Escanear QR Code</div>
                <div className="text-xs text-emerald-100">
                  Recomendado - 100% preciso
                </div>
              </button>

              <label className="block">
                <div className="w-full bg-white border-2 border-gray-300 p-6 rounded-2xl shadow active:scale-95 transition-transform cursor-pointer">
                  <Camera size={48} className="mx-auto mb-3 text-gray-600" />
                  <div className="font-bold text-lg mb-1 text-gray-800">Foto da Lista</div>
                  <div className="text-xs text-gray-600">
                    Foto da parte com os produtos
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Histórico */}
            {history.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-4">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle size={20} className="text-emerald-600" />
                  Entradas Recentes
                </h3>
                <div className="space-y-2">
                  {history.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="border-l-4 border-emerald-500 bg-emerald-50 p-3 rounded">
                      <div className="font-bold text-sm">{item.supplier}</div>
                      <div className="text-xs text-gray-600">
                        {item.items.length} itens - R$ {item.totalValue?.toFixed(2)}
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
          // Preview dos Dados
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Confirmar Entrada</h3>
                <CheckCircle size={24} className="text-emerald-600" />
              </div>

              <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500">Fornecedor</div>
                  <div className="font-bold">{invoiceData.supplier}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Data</div>
                  <div className="font-bold">{invoiceData.date}</div>
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
                className="flex-1 bg-gray-500 text-white py-4 rounded-xl font-bold active:scale-95 transition-transform shadow-lg"
              >
                <XCircle size={20} className="inline mr-2" />
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={processing}
                className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-bold active:scale-95 transition-transform shadow-lg disabled:bg-gray-300"
              >
                <CheckCircle size={20} className="inline mr-2" />
                Confirmar
              </button>
            </div>
          </div>
        )}

        {processing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 shadow-2xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600 mx-auto mb-3"></div>
              <div className="font-bold text-center">Processando...</div>
            </div>
          </div>
        )}

        {showQRScanner && (
          <QRCodeScannerLive
            onScan={handleQRCodeScan}
            onClose={() => setShowQRScanner(false)}
          />
        )}
      </div>

      {/* Footer fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 text-center text-xs text-gray-500">
        PratoFit © 2026 - Versão Mobile
      </div>
    </div>
  );
};

export default MobileStockEntry;
