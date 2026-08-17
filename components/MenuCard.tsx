
import React, { useState } from 'react';
import { MenuItem } from '../types';
import { Plus, Minus, ImageOff, Lock, ShoppingCart, AlertTriangle } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
  onRemove: (item: MenuItem) => void;
  isLimitReached: boolean;
  quantity: number;
}

const MenuCard: React.FC<MenuCardProps> = ({ item, onAdd, onRemove, isLimitReached, quantity }) => {
  const [imgError, setImgError] = useState(false);
  const isOutOfStock = !item.available || item.stock <= 0;
  const isLowStock = item.stock > 0 && item.stock <= 5;
  const hasReachedStockLimit = quantity >= item.stock;

  return (
    <div className={`relative bg-white border rounded-2xl p-4 flex justify-between gap-4 transition-all duration-300 h-full shadow-sm hover:shadow-md group
      ${quantity > 0 ? 'border-emerald-200 ring-1 ring-emerald-50 bg-emerald-50/10' : 'border-slate-100'} 
      ${isOutOfStock ? 'opacity-75' : ''}`}>
      
      <div className="flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-start justify-between mb-1">
            <h3 className={`font-black text-base leading-tight ${isOutOfStock ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
              {item.title}
            </h3>
          </div>
          
          <p className="text-slate-500 text-xs sm:text-sm line-clamp-2 mb-3 font-medium opacity-80">
            {item.description}
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-slate-400 text-[10px] uppercase font-black tracking-widest bg-slate-50 px-2 py-0.5 rounded">{item.serving}</span>
            {isLowStock && !isOutOfStock && (
              <span className="flex items-center gap-1 text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 animate-pulse">
                <AlertTriangle size={10} /> SÓ RESTAM {item.stock}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-auto">
            <div className="flex flex-wrap gap-1">
                {item.tags?.map(tag => (
                    <span key={tag} className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                        {tag}
                    </span>
                ))}
            </div>
        </div>
      </div>

      <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
        <div className={`w-full h-full relative overflow-hidden rounded-2xl border border-slate-50 shadow-inner ${isOutOfStock ? 'grayscale opacity-50' : ''}`}>
            {!imgError ? (
            <img 
                src={item.imageUrl} 
                alt={item.title} 
                onError={() => setImgError(true)}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            ) : (
            <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-slate-300 p-2 text-center">
                <ImageOff size={20} className="mb-1 opacity-50" />
                <span className="text-[10px] font-black opacity-50 uppercase tracking-tighter">Sem Imagem</span>
            </div>
            )}

            {isOutOfStock && (
                <div className="absolute inset-0 bg-slate-800/80 flex items-center justify-center text-white font-black text-[10px] rotate-[-12deg] shadow-lg tracking-widest uppercase">
                    Esgotado
                </div>
            )}
        </div>
        
        {/* Quantity Badge */}
        {quantity > 0 && (
          <div className="absolute -top-2 -left-2 bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-lg z-10 border-2 border-white animate-bounce">
            {quantity}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="absolute -bottom-3 -right-2 flex gap-2 z-10">
            {quantity > 0 && (
                <button 
                    onClick={() => onRemove(item)}
                    className="p-2.5 rounded-full border transition-all shadow-xl flex items-center justify-center bg-white text-slate-500 border-slate-200 hover:bg-red-50 hover:text-red-500 active:scale-90"
                >
                    <Minus size={18} />
                </button>
            )}

            <button 
                onClick={() => !isOutOfStock && !hasReachedStockLimit && onAdd(item)}
                disabled={isOutOfStock || hasReachedStockLimit}
                className={`p-2.5 rounded-full border transition-all shadow-xl flex items-center justify-center
                    ${isOutOfStock || hasReachedStockLimit
                        ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed' 
                        : isLimitReached
                            ? 'bg-orange-100 text-orange-500 border-orange-200 hover:bg-orange-200 active:scale-90' 
                            : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 hover:scale-105 active:scale-90'
                    }`}
            >
                {isOutOfStock ? <Lock size={18} /> : 
                 hasReachedStockLimit ? <Lock size={18} /> :
                 isLimitReached ? <ShoppingCart size={18} /> : 
                 <Plus size={18} />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
