import React, { useState } from 'react';
import { QrCode, CheckCircle, XCircle, Loader } from 'lucide-react';
import { nfceService } from '../services/nfceService';

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
