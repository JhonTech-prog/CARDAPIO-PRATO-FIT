
import React from 'react';
import { MenuItem } from '../types';
import { ArrowLeft, Package, LogOut } from 'lucide-react';

interface AdminDashboardProps {
  items: MenuItem[];
  onExit: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ items, onExit }) => {
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 animate-fade-in-up">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <button 
              onClick={onExit}
              className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold text-sm mb-2 transition-colors"
            >
              <ArrowLeft size={16} /> Voltar ao Cardápio
            </button>
            <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                <Package className="text-emerald-600" /> 
                Gestão de Estoque
            </h1>
          </div>
          
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="border-b border-blue-100 bg-blue-50 px-6 py-4 text-sm font-medium text-blue-800">
            O estoque exibido é sincronizado pelo ERP central e não pode ser alterado neste cardápio.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Produto</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center w-32">Estoque Atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img src={item.imageUrl} alt={item.title} className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                        <div>
                          <p className="font-bold text-gray-800">{item.title}</p>
                          <p className="text-xs text-gray-400">{item.serving}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-full uppercase">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`w-20 rounded-xl border-2 py-2 text-center font-bold ${item.stock <= 5 ? 'border-orange-200 bg-orange-50 text-orange-600' : 'border-gray-100 bg-gray-50 text-gray-700'}`}>
                          {item.available ? item.stock : 0}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
            <button 
                onClick={onExit}
                className="text-red-400 hover:text-red-600 flex items-center gap-2 font-bold text-sm transition-colors"
            >
                <LogOut size={16} /> Sair do modo administrador
            </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
