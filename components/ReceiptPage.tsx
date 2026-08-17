import React, { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { PICKUP_INFO } from '../constants';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

interface ReceiptItem {
  title: string;
  quantity: number;
}

interface ReceiptOrder {
  orderCode: string;
  createdAt: string;
  customerName: string;
  fulfillmentType: 'delivery' | 'pickup';
  cep: string;
  address: string;
  number: string;
  neighborhood: string;
  pickupTime: string;
  items: ReceiptItem[];
  selectedKitName: string;
  selectedKitPrice: number;
  deliveryFee: number;
  totalPrice: number;
  paymentMethod: 'link' | 'pix';
  observation: string;
  lowStockWarning: boolean;
  reservationId?: string;
  reservationExpiresAt?: string;
}

const ReceiptPage: React.FC = () => {
  const [order, setOrder] = useState<ReceiptOrder | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (!token) {
        setError('Token do pedido não encontrado.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/receipt?token=${encodeURIComponent(token)}`);
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          setError(body?.error || 'Não foi possível carregar o cupom.');
          return;
        }

        const data = await response.json();
        setOrder(data.order);
      } catch (fetchError) {
        console.error('Erro ao buscar cupom:', fetchError);
        setError('Erro de conexão ao carregar o cupom.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="p-5 bg-emerald-600 text-white flex items-center justify-between gap-4">
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest opacity-90 hover:opacity-100">
            <ArrowLeft size={18} /> Voltar
          </button>
          <button onClick={handlePrint} className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-2xl text-sm font-bold">
            <Printer size={18} /> Imprimir Cupom
          </button>
        </div>
        <div className="p-6">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
          ) : order ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="text-2xl font-black text-slate-900">CUPOM DE PEDIDO</div>
                <div className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString('pt-BR')} {new Date(order.createdAt).toLocaleTimeString('pt-BR')}</div>
                <div className="text-xs uppercase tracking-[0.3em] text-emerald-600">Código: {order.orderCode}</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-700">Cliente</div>
                <div className="text-lg font-bold text-slate-900">{order.customerName}</div>
                <div className="mt-3 text-sm text-slate-600 space-y-1">
                  <div>Plano: {order.selectedKitName}</div>
                  <div>Pagamento: {order.paymentMethod === 'pix' ? 'PIX' : 'Link de pagamento'}</div>
                  {order.reservationId && <div>Reserva ERP: {order.reservationId}</div>}
                  {order.reservationExpiresAt && <div>Reserva válida até: {new Date(order.reservationExpiresAt).toLocaleString('pt-BR')}</div>}
                  {order.observation && <div>Obs: {order.observation}</div>}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-700 mb-3">Itens</div>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="flex justify-between text-sm text-slate-800">
                      <span className="font-medium">{item.title}</span>
                      <span>{item.quantity}x</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm text-slate-700">
                <div className="font-semibold text-slate-800">Informações de entrega</div>
                {order.fulfillmentType === 'delivery' ? (
                  <div className="space-y-1">
                    <div>{order.address}{order.number ? `, Nº ${order.number}` : ''}</div>
                    <div>{order.neighborhood}</div>
                    <div>CEP: {order.cep}</div>
                    <div>Taxa de entrega: R$ {order.deliveryFee.toFixed(2)}</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div>Retirada na loja</div>
                    <div>{PICKUP_INFO.address}</div>
                    <div>Horário de retirada: {order.pickupTime}</div>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex justify-between items-center mb-2 text-slate-900 font-semibold">
                  <span>Total</span>
                  <span>R$ {order.totalPrice.toFixed(2)}</span>
                </div>
                <div className="text-xs text-slate-500">Valor do plano: R$ {order.selectedKitPrice.toFixed(2)}</div>
                {order.fulfillmentType === 'delivery' && <div className="text-xs text-slate-500">Taxa de entrega: R$ {order.deliveryFee.toFixed(2)}</div>}
              </div>

              {order.lowStockWarning && (
                <div className="rounded-3xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                  Atenção: este pedido contém itens com estoque baixo. Verifique disponibilidade antes de imprimir.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">Carregando dados do cupom...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptPage;
