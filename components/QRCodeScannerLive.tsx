import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Upload, AlertCircle } from 'lucide-react';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showUploadOption, setShowUploadOption] = useState(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Solicita câmera imediatamente ao montar
    const initCamera = async () => {
      await startCamera();
    };
    initCamera();
    
    return () => {
      stopCamera();
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      console.log('🎥 Solicitando acesso à câmera...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' }, // Câmera traseira
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            console.log('✅ Vídeo iniciado');
            setCameraActive(true);
            setScanning(true);
            setError('');
            startScanning();
          }).catch((err) => {
            console.error('Erro ao iniciar vídeo:', err);
            setError('Erro ao iniciar câmera. Tente novamente.');
            setShowUploadOption(true);
          });
        };
        
        setStream(mediaStream);
        console.log('✅ Câmera ativada com sucesso!');
      }
    } catch (err: any) {
      console.error('❌ Erro ao acessar câmera:', err);
      
      let errorMessage = 'Não foi possível acessar a câmera.';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = '📷 Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = '📷 Nenhuma câmera encontrada no dispositivo.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = '📷 Câmera já está em uso por outro aplicativo.';
      }
      
      setError(errorMessage);
      setShowUploadOption(true);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
    setScanning(false);
  };

  const startScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    scanIntervalRef.current = setInterval(async () => {
      if (videoRef.current && canvasRef.current && cameraActive) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Tenta detectar QR Code
        try {
          if ('BarcodeDetector' in window) {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(canvas);
            
            if (barcodes.length > 0) {
              const qrCode = barcodes[0].rawValue;
              console.log('✅ QR Code detectado:', qrCode);
              stopCamera();
              if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
              }
              onScan(qrCode);
            }
          }
        } catch (err) {
          console.error('Erro ao escanear:', err);
        }
      }
    }, 500); // Escaneia a cada 500ms
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    console.log('📷 Processando foto...');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target?.result as string;
        const qrCodeData = await decodeQRCodeFromImage(base64Image);
        
        if (qrCodeData) {
          console.log('✅ QR Code extraído da foto:', qrCodeData);
          onScan(qrCodeData);
        } else {
          setError('❌ Nenhum QR Code detectado na foto. Tente novamente com uma foto mais nítida.');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      setError('Erro ao processar a imagem.');
    }
  };

  const decodeQRCodeFromImage = async (base64Image: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          resolve(null);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        // Tenta API nativa
        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(canvas);
            if (barcodes.length > 0) {
              resolve(barcodes[0].rawValue);
              return;
            }
          } catch (err) {
            console.error('BarcodeDetector falhou:', err);
          }
        }

        // Fallback: API online
        try {
          const blob = await (await fetch(base64Image)).blob();
          const formData = new FormData();
          formData.append('file', blob);

          const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
            method: 'POST',
            body: formData
          });

          const result = await response.json();
          if (result[0]?.symbol[0]?.data) {
            resolve(result[0].symbol[0].data);
            return;
          }
        } catch (err) {
          console.error('API online falhou:', err);
        }

        resolve(null);
      };
      img.src = base64Image;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
        <h2 className="font-bold text-lg">📷 Escanear QR Code</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-emerald-700 rounded-lg active:scale-95 transition"
        >
          <X size={24} />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black">
        {cameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              webkit-playsinline="true"
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {/* Scanning Overlay */}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-4 border-emerald-500 rounded-2xl relative animate-pulse">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-center bg-black bg-opacity-70 px-4 py-2 rounded-lg">
                      <div className="font-bold">Aponte para o QR Code</div>
                      <div className="text-xs text-emerald-300 mt-1">Escaneando automaticamente...</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-white p-6">
            <AlertCircle size={64} className="text-yellow-500 mb-4" />
            <p className="text-center mb-6">{error || 'Carregando câmera...'}</p>
            
            {showUploadOption && (
              <div className="space-y-3 w-full max-w-sm">
                <label className="block">
                  <div className="bg-emerald-600 text-white p-4 rounded-xl text-center cursor-pointer active:scale-95 transition">
                    <Upload size={32} className="mx-auto mb-2" />
                    <div className="font-bold">Enviar Foto do QR Code</div>
                    <div className="text-xs text-emerald-100 mt-1">Tire uma foto e envie</div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={startCamera}
                  className="w-full bg-blue-600 text-white p-4 rounded-xl active:scale-95 transition"
                >
                  <Camera size={24} className="inline mr-2" />
                  Tentar Câmera Novamente
                </button>
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Instructions */}
      {cameraActive && (
        <div className="bg-gray-900 text-white p-4 text-center text-sm">
          <p className="font-bold mb-1">📱 Centralize o QR Code na moldura</p>
          <p className="text-gray-400 text-xs">A leitura será feita automaticamente</p>
        </div>
      )}
    </div>
  );
};

export default QRCodeScanner;
