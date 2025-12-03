
import React from 'react';
import { KITS } from '../constants';
import { KitDefinition } from '../types';
import { Check, Package } from 'lucide-react';

interface KitSelectorProps {
  onSelect: (kit: KitDefinition) => void;
}

const KitSelector: React.FC<KitSelectorProps> = ({ onSelect }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Como deseja pedir?</h2>
        <p className="text-gray-500">Escolha o tamanho do seu kit e monte com seus sabores favoritos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KITS.map((kit) => (
          <div 
            key={kit.id}
            className={`relative bg-white rounded-xl border-2 transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1 group flex flex-col justify-between
              ${kit.highlight ? 'border-emerald-500 shadow-emerald-100 ring-4 ring-emerald-50' : 'border-gray-100 shadow-sm hover:border-emerald-300'}
            `}
            onClick={() => onSelect(kit)}
          >
            {kit.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                MAIS VENDIDO
              </div>
            )}
            
            <div className="p-6 text-center">
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 ${kit.highlight ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                <Package size={24} />
              </div>
              
              <h3 className="font-bold text-lg text-gray-800 mb-1">{kit.name}</h3>
              <p className="text-xs text-gray-400 mb-4">{kit.description}</p>
              
              <div className="mb-2">
                <span className="text-2xl font-bold text-gray-800">
                    {kit.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              
              <div className="text-sm font-medium text-emerald-600 bg-emerald-50 py-1 px-3 rounded-lg inline-block">
                {kit.pricePerMeal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / prato
              </div>
            </div>

            <div className={`p-4 border-t ${kit.highlight ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'} rounded-b-xl text-center`}>
              <span className={`text-sm font-semibold flex items-center justify-center gap-2 ${kit.highlight ? 'text-emerald-700' : 'text-gray-600 group-hover:text-emerald-600'}`}>
                Selecionar
                <Check size={16} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KitSelector;
