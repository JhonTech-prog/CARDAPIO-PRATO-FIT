
import React from 'react';
import { X, Minus, Plus, ShoppingBag, AlertCircle, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import { CartItem, KitDefinition } from '../types';

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  selectedKit: KitDefinition | null;
  onChangeKit: () => void;
  onCheckout: () => void;
  onClearCart: () => void;
}

const CartSheet: React.FC<CartSheetProps> = ({ isOpen, onClose, items, onUpdateQuantity, selectedKit, onChangeKit, onCheckout, onClearCart }) => {
  if (!isOpen || !selectedKit) return null;

  const totalSelected = items.reduce((acc, item) => acc + item.quantity, 0);
  const isComplete = totalSelected === selectedKit.totalMeals;
  const remaining = selectedKit.totalMeals - totalSelected;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-gray-800 font-bold">
              <ShoppingBag size={20} className="text-emerald-600"/>
              <h2>Meu Kit</h2>
            </div>
            <div className="flex items-center gap-1">
                {items.length > 0 && (
                    <button 
                        onClick={onClearCart}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors mr-1"
                        title="Limpar cesta"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <X size={20} className="text-gray-500" />
                </button>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-1">
                <span className="font-black text-emerald-800 text-sm">{selectedKit.name.toUpperCase()}</span>
                <span className="font-black text-xl text-emerald-600">{selectedKit.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-2">
                <span>{selectedKit.totalMeals} refeições</span>
                <button onClick={onChangeKit} className="text-orange-500 hover:underline">Trocar plano</button>
            </div>
          </div>
        </div>

        {/* Validation Banner */}
        <div className={`px-4 py-3 text-xs font-bold flex items-center gap-2 uppercase tracking-wide transition-colors ${isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-50 text-orange-800'}`}>
            {isComplete ? (
                <>
                    <CheckCircle size={14} />
                    <span>Seu kit está prontinho!</span>
                </>
            ) : (
                <>
                    <AlertCircle size={14} className="animate-pulse" />
                    <span>Faltam {remaining} pratos para o Kit {selectedKit.totalMeals}</span>
                </>
            )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center text-gray-300 mt-20">
              <ShoppingBag size={64} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">Sua cesta está vazia</p>
              <button onClick={onClose} className="text-emerald-600 text-sm mt-4 font-bold uppercase hover:underline">
                Adicionar pratos
              </button>
            </div>
          ) : (
            items.map((item) => {
              const hasReachedStock = !item.available || item.quantity >= item.stock;
              return (
                <div key={item.id} className="flex gap-4 p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                  <img src={item.imageUrl} alt={item.title} className="w-16 h-16 rounded-lg object-cover border border-gray-50" />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{item.title}</h4>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">{item.category}</p>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                      {hasReachedStock ? (
                          <span className="text-[9px] text-orange-600 font-bold flex items-center gap-0.5">
                              <AlertTriangle size={10} /> LIMITE ESTOQUE
                          </span>
                      ) : <div/>}

                      <div className="flex items-center gap-4 border border-gray-100 rounded-lg px-2 py-1 bg-gray-50/50">
                        <button 
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-xs w-4 text-center font-black">{item.quantity}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          disabled={isComplete || hasReachedStock}
                          className={`transition-colors ${isComplete || hasReachedStock ? 'text-gray-200 cursor-not-allowed' : 'text-emerald-600 hover:text-emerald-700'}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 border-t bg-white">
            <button 
                disabled={!isComplete}
                onClick={onCheckout}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                    isComplete 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
            >
              {isComplete ? 'Fechar meu Pedido' : `Escolha mais ${remaining} pratos`}
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-4">
                Pedido finalizado via WhatsApp
            </p>
        </div>
      </div>
    </div>
  );
};

export default CartSheet;
