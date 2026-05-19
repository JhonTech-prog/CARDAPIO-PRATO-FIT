
import React, { useState, useEffect } from 'react';
import { X, MessageCircle, AlertCircle, MapPin, Search, Loader2, Store, Bike, Clock, CreditCard } from 'lucide-react';
import { CartItem, KitDefinition } from '../types';
import { DELIVERY_ZONES, PICKUP_INFO } from '../constants';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  selectedKit: KitDefinition | null;
}

type FulfillmentType = 'delivery' | 'pickup';

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, items, selectedKit }) => {
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('delivery');
  const [name, setName] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'link' | 'pix'>('pix');
  const [observation, setObservation] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  
  const [errors, setErrors] = useState({ 
      name: false, 
      address: false, 
      neighborhood: false, 
      cep: false, 
      number: false,
      pickupTime: false
  });
  const [receiptLink, setReceiptLink] = useState('');
  const [orderSent, setOrderSent] = useState(false);

  useEffect(() => {
      if (fulfillmentType === 'pickup') {
          setDeliveryFee(0);
      } else if (selectedNeighborhood) {
            let price = 0;
            for (const zone of DELIVERY_ZONES) {
                if (zone.neighborhoods.includes(selectedNeighborhood)) {
                    price = zone.price;
                    break;
                }
            }
            setDeliveryFee(price);
      }
  }, [fulfillmentType, selectedNeighborhood]);

  useEffect(() => {
    if (isOpen) {
      setReceiptLink('');
      setOrderSent(false);
    }
  }, [isOpen]);

  const normalizeText = (text: string) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    setErrors(prev => ({ ...prev, cep: false }));

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (data.erro) {
            setErrors(prev => ({ ...prev, cep: true }));
            return;
        }

        setAddress(data.logradouro);
        const apiNeighborhood = normalizeText(data.bairro);
        let neighborhoodFound = false;

        for (const zone of DELIVERY_ZONES) {
            const match = zone.neighborhoods.find(nb => normalizeText(nb) === apiNeighborhood);
            if (match) {
                setSelectedNeighborhood(match);
                setDeliveryFee(zone.price);
                neighborhoodFound = true;
                break;
            }
        }

        if (!neighborhoodFound) {
             for (const zone of DELIVERY_ZONES) {
                const match = zone.neighborhoods.find(nb => 
                    apiNeighborhood.includes(normalizeText(nb)) || normalizeText(nb).includes(apiNeighborhood)
                );
                if (match) {
                    setSelectedNeighborhood(match);
                    setDeliveryFee(zone.price);
                    neighborhoodFound = true;
                    break;
                }
            }
        }
    } catch (error) {
        console.error("Erro ao buscar CEP", error);
        setErrors(prev => ({ ...prev, cep: true }));
    } finally {
        setIsLoadingCep(false);
    }
  };

  const handleNeighborhoodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const neighborhoodName = e.target.value;
    setSelectedNeighborhood(neighborhoodName);
    if (!neighborhoodName) {
      setDeliveryFee(0);
      return;
    }
    if (errors.neighborhood) setErrors(prev => ({ ...prev, neighborhood: false }));
    let price = 0;
    for (const zone of DELIVERY_ZONES) {
      if (zone.neighborhoods.includes(neighborhoodName)) {
        price = zone.price;
        break;
      }
    }
    setDeliveryFee(price);
  };

  if (!isOpen || !selectedKit) return null;

  const deliveryAddress = fulfillmentType === 'delivery'
    ? `${address}${number ? ', Nº ' + number : ''}${selectedNeighborhood ? ' - ' + selectedNeighborhood : ''}`
    : PICKUP_INFO.address;

  const totalPrice = selectedKit.price + deliveryFee;
  const lowStockItems = items.filter(item => item.stock < 5);
  const hasLowStockItems = lowStockItems.length > 0;

  const createReceiptPayload = () => ({
    orderCode: `PF${Date.now()}`,
    date: new Date().toISOString(),
    customerName: name,
    fulfillmentType,
    cep,
    address,
    number,
    neighborhood: selectedNeighborhood,
    pickupTime,
    items: items.map(item => ({ title: item.title, quantity: item.quantity })),
    selectedKitName: selectedKit.name,
    selectedKitPrice: selectedKit.price,
    deliveryFee,
    totalPrice,
    paymentMethod,
    observation,
    lowStockWarning: hasLowStockItems,
  });

  const createReceiptLink = () => {
    const payload = createReceiptPayload();
    return `${window.location.origin}/receipt?order=${encodeURIComponent(JSON.stringify(payload))}`;
  };

  const handleFinishOrder = () => {
    const newErrors = {
      name: !name.trim() || name.trim().split(' ').length < 2,
      address: fulfillmentType === 'delivery' ? !address.trim() : false,
      number: fulfillmentType === 'delivery' ? !number.trim() : false,
      neighborhood: fulfillmentType === 'delivery' ? !selectedNeighborhood : false,
      cep: fulfillmentType === 'delivery' ? cep.replace(/\D/g, '').length !== 8 : false,
      pickupTime: fulfillmentType === 'pickup' ? !pickupTime : false
    };

    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    const receiptPayload = createReceiptPayload();
    const receiptLink = `${window.location.origin}/receipt?order=${encodeURIComponent(JSON.stringify(receiptPayload))}`;

    let message = `*NOVO PEDIDO - PRATOFIT* 🥗\n\n`;
    message += `*Pedido:* ${receiptPayload.orderCode}\n`;
    message += `*Cliente:* ${name}\n`;
    
    if (fulfillmentType === 'delivery') {
        message += `*MODO:* ENTREGA 🛵\n`;
        message += `*Endereço:* ${address}, Nº ${number}\n`;
        message += `*CEP:* ${cep}\n`;
        message += `*Bairro:* ${selectedNeighborhood} (+R$ ${deliveryFee.toFixed(2)})\n`;
    } else {
        message += `*MODO:* RETIRADA NA LOJA 🛍️\n`;
        message += `*Horário de Retirada:* ${pickupTime}\n`;
    }

    if (observation) message += `*Obs:* ${observation}\n`;
    message += `--------------------------------\n`;
    message += `*Plano:* ${selectedKit.name}\n`;
    message += `*Kit:* ${selectedKit.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
    if (fulfillmentType === 'delivery') message += `*Taxa:* ${deliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
    message += `*TOTAL:* ${totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
    if (hasLowStockItems) {
      message += `*ATENÇÃO:* Alguns itens estão com estoque baixo (menos de 5 unidades). Pode ocorrer falta se outro cliente comprar antes de você.\n`;
    }
    message += `--------------------------------\n`;
    items.forEach(item => { message += `• ${item.quantity}x ${item.title}\n`; });
    message += `--------------------------------\n`;
    message += `*CUPOM PARA LOJA:* ${receiptLink}\n`;
    message += paymentMethod === 'link' ? `🔗 *LINK DE PAGAMENTO*` : `💠 *PIX*`;

    // debug log
    console.debug('Enviar pedido message:', message);
    // open receipt in a new tab so the loja can print immediately
    try {
      window.open(receiptLink, '_blank');
    } catch (err) {
      console.warn('Falha ao abrir link do cupom automaticamente', err);
    }
    // open WhatsApp with the message (includes receipt link)
    window.open(`https://wa.me/5583988109997?text=${encodeURIComponent(message)}`, '_blank');
    setReceiptLink(receiptLink);
    setOrderSent(true);
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    if (val.length > 5) val = val.replace(/^(\d{5})(\d)/, '$1-$2');
    setCep(val);
    if (errors.cep) setErrors(prev => ({...prev, cep: false}));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
        <div className="bg-emerald-600 p-4 flex justify-between items-center text-white flex-shrink-0">
          <h2 className="font-bold text-lg flex items-center gap-2"><MessageCircle size={24} /> Finalizar Pedido</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setFulfillmentType('delivery')} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${fulfillmentType === 'delivery' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}><Bike size={18} /> Entrega</button>
              <button onClick={() => setFulfillmentType('pickup')} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${fulfillmentType === 'pickup' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}><Store size={18} /> Retirada</button>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm">
            <div className="flex justify-between items-end">
                <span className="font-bold text-gray-800 text-lg">Total:</span>
                <span className="font-extrabold text-emerald-600 text-2xl">{totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </div>
          {hasLowStockItems && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
              <strong>Atenção:</strong> Algumas marmitas selecionadas estão com estoque baixo ({lowStockItems.length} {lowStockItems.length > 1 ? 'itens' : 'item'}) e podem ficar indisponíveis por vendas não avisadas.
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo <span className="text-red-500">*</span></label>
              <input type="text" value={name} onChange={(e) => {setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: false }));}} className={`w-full px-3 py-2 border rounded-lg outline-none ${errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Ex: Maria Silva" />
            </div>
            {fulfillmentType === 'delivery' ? (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CEP <span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                            <input type="text" value={cep} onChange={handleCepChange} onBlur={handleCepBlur} className={`flex-1 px-3 py-2 border rounded-lg outline-none ${errors.cep ? 'border-red-500' : 'border-gray-300'}`} placeholder="00000-000" />
                            <button type="button" onClick={handleCepBlur} disabled={isLoadingCep} className="bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg">{isLoadingCep ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bairro <span className="text-red-500">*</span></label>
                        <select value={selectedNeighborhood} onChange={handleNeighborhoodChange} className={`w-full px-3 py-2 border rounded-lg outline-none bg-white ${errors.neighborhood ? 'border-red-500' : 'border-gray-300'}`}>
                            <option value="">Selecione o bairro...</option>
                            {DELIVERY_ZONES.map((zone) => (
                                <optgroup key={zone.label} label={zone.label}>
                                    {zone.neighborhoods.sort().map(nb => <option key={nb} value={nb}>{nb} (+ R$ {zone.price.toFixed(2)})</option>)}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rua <span className="text-red-500">*</span></label>
                            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={`w-full px-3 py-2 border rounded-lg ${errors.address ? 'border-red-500' : 'border-gray-300'}`} />
                        </div>
                        <div className="w-24">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nº <span className="text-red-500">*</span></label>
                            <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} className={`w-full px-3 py-2 border rounded-lg ${errors.number ? 'border-red-500' : 'border-gray-300'}`} />
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 space-y-2">
                    <p className="text-sm font-bold text-emerald-800">Retirada em: {PICKUP_INFO.address}</p>
                    <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className={`w-full px-3 py-2 border rounded-lg ${errors.pickupTime ? 'border-red-500' : 'border-emerald-200'}`} />
                </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => setPaymentMethod('pix')} className={`py-3 rounded-xl border flex flex-col items-center gap-1 ${paymentMethod === 'pix' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white text-gray-500'}`}><span>💠</span> PIX</button>
                <button onClick={() => setPaymentMethod('link')} className={`py-3 rounded-xl border flex flex-col items-center gap-1 ${paymentMethod === 'link' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white text-gray-500'}`}><CreditCard size={20} /> Link</button>
            </div>
            <textarea value={observation} onChange={(e) => setObservation(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Observações (opcional)" rows={2} />
          </div>
        </div>
        {receiptLink && (
          <div className="p-4 border-t bg-emerald-50 space-y-3">
            <div className="text-sm font-semibold text-emerald-800">Link do cupom para a loja</div>
            <input readOnly value={receiptLink} className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700" />
            <div className="flex gap-3">
              <button type="button" onClick={() => navigator.clipboard.writeText(receiptLink)} className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-bold">Copiar link</button>
              <button type="button" onClick={() => window.open(receiptLink, '_blank')} className="flex-1 border border-emerald-600 text-emerald-700 py-3 rounded-2xl font-bold">Abrir cupom</button>
            </div>
          </div>
        )}
        <div className="p-4 border-t bg-gray-50 space-y-3">
          <button onClick={handleFinishOrder} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"><MessageCircle size={20} /> Enviar Pedido no WhatsApp</button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
