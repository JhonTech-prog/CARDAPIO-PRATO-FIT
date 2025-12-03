
import React from 'react';
import { X, CheckCircle, ArrowRight, Edit2 } from 'lucide-react';

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
  totalMeals: number;
}

const LimitReachedModal: React.FC<LimitReachedModalProps> = ({ isOpen, onClose, onCheckout, totalMeals }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up">
        <div className="bg-orange-500 p-4 flex justify-between items-center text-white">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <CheckCircle size={24} className="text-white" />
            Kit Completo!
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Você atingiu o limite!</h3>
          <p className="text-gray-500 mb-6">
            Seu kit de <b>{totalMeals} refeições</b> já está todo preenchido. O que você deseja fazer agora?
          </p>

          <div className="flex flex-col gap-3">
            <button 
              onClick={onCheckout}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              Finalizar Pedido
              <ArrowRight size={20} />
            </button>
            
            <button 
              onClick={onClose}
              className="w-full bg-white text-gray-600 border border-gray-200 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Edit2 size={18} />
              Revisar / Trocar itens
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LimitReachedModal;
