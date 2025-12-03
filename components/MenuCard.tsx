
import React, { useState } from 'react';
import { MenuItem } from '../types';
import { Plus, Minus, ImageOff, Lock } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
  onRemove: (item: MenuItem) => void;
  isLimitReached: boolean;
  quantity: number;
}

const MenuCard: React.FC<MenuCardProps> = ({ item, onAdd, onRemove, isLimitReached, quantity }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`bg-white border rounded-lg p-4 flex justify-between gap-4 transition-all duration-200 h-full hover:shadow-md ${quantity > 0 ? 'border-emerald-200 ring-1 ring-emerald-50 bg-emerald-50/10' : 'border-gray-100'}`}>
      <div className="flex flex-col justify-between flex-1">
        <div>
          <h3 className="text-gray-800 font-medium text-base mb-1 flex items-center gap-2">
            {item.title}
          </h3>
          <p className="text-gray-500 text-xs sm:text-sm line-clamp-3 mb-2 font-light leading-relaxed">
            {item.description}
          </p>
          <span className="text-gray-500 text-xs block mb-2">{item.serving}</span>
        </div>
        
        {/* Tags visual section */}
        <div className="flex flex-wrap gap-1 mt-2">
            {item.tags?.map(tag => (
                <span key={tag} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                    {tag}
                </span>
            ))}
        </div>
      </div>

      <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 group">
        {!imgError ? (
          <img 
            src={item.imageUrl} 
            alt={item.title} 
            onError={() => setImgError(true)}
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          <div className="w-full h-full bg-red-50 rounded-md flex flex-col items-center justify-center text-red-400 p-2 text-center border border-red-100">
            <ImageOff size={20} className="mb-1 opacity-50" />
            <span className="text-[10px] font-bold text-red-500 leading-tight">Erro</span>
          </div>
        )}
        
        {/* Quantity Badge */}
        {quantity > 0 && (
          <div className="absolute -top-2 -left-2 bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md z-10 border-2 border-white animate-scale-up">
            {quantity}
          </div>
        )}
        
        {/* Action Buttons Container */}
        <div className="absolute -bottom-3 -right-2 flex gap-2 z-10">
            {/* Remove Button (Only visible if quantity > 0) */}
            {quantity > 0 && (
                <button 
                    onClick={() => onRemove(item)}
                    className="p-2 rounded-full border transition-all shadow-md flex items-center justify-center bg-white text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                    aria-label={`Remover ${item.title}`}
                >
                    <Minus size={18} />
                </button>
            )}

            {/* Add Button */}
            <button 
                onClick={() => onAdd(item)}
                className={`p-2 rounded-full border transition-all shadow-md flex items-center justify-center
                    ${isLimitReached 
                        ? 'bg-orange-100 text-orange-500 border-orange-200 hover:bg-orange-200' 
                        : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 hover:scale-105'
                    }`}
                aria-label={isLimitReached ? "Kit Completo" : `Adicionar ${item.title}`}
            >
                {isLimitReached ? <Lock size={18} /> : <Plus size={18} />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
