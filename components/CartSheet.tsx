
import React from 'react';
import { X, Minus, Plus, ShoppingBag, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
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
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2 text-gray-800 font-semibold">
              <ShoppingBag size={20} className="text-emerald-600"/>
              <h2>Seu Kit</h2>
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
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-emerald-800">{selectedKit.name}</span>
                <span className="font-bold text-lg">{selectedKit.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{selectedKit.totalMeals} itens inclusos</span>
                <button onClick={onChangeKit} className="text-orange-500 hover:underline">Trocar plano</button>
            </div>
          </div>
        </div>

        {/* Validation Banner */}
        <div className={`px-4 py-3 text-sm flex items-center gap-2 ${isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-50 text-orange-800'}`}>
            {isComplete ? (
                <>
                    <CheckCircle size={16} />
                    <span>Kit completo! Pronto para finalizar.</span>
                </>
            ) : (
                <>
                    <AlertCircle size={16} />
                    <span>Faltam <b>{remaining}</b> marmitas para fechar o kit.</span>
                </>
            )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <ShoppingBag size={48} className="mx-auto mb-4 opacity-50" />
              <p>Você ainda não selecionou as marmitas do seu kit.</p>
              <button onClick={onClose} className="text-emerald-600 text-sm mt-2 hover:underline">
                Voltar ao cardápio
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4 border-b border-gray-100 pb-4 last:border-0">
                <img src={item.imageUrl} alt={item.title} className="w-14 h-14 rounded object-cover" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-800 line-clamp-1">{item.title}</h4>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {item.category.split(' ')[0]}
                    </span>
                    <div className="flex items-center gap-3 border rounded-lg px-2 py-1 bg-white">
                      <button 
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm w-4 text-center font-medium">{item.quantity}</span>
                      <button 
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        disabled={!isComplete && remaining <= 0} // Prevent adding more if full
                        className={`text-gray-400 ${(!isComplete && remaining <= 0) ? 'cursor-not-allowed opacity-50' : 'hover:text-emerald-600'}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
            {remaining < 0 && (
                <p className="text-xs text-red-500 text-center mb-2">Você selecionou itens demais. Remova {Math.abs(remaining)}.</p>
            )}
            <button 
                disabled={!isComplete}
                onClick={onCheckout}
                className={`w-full py-3 rounded-lg font-medium shadow-lg transition-all ${
                    isComplete 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99]' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              {isComplete ? 'Avançar para Pagamento' : `Escolha mais ${remaining > 0 ? remaining : 0} itens`}
            </button>
        </div>
      </div>
    </div>
  );
};

export default CartSheet;
