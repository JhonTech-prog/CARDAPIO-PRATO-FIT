
import { MenuItem } from '../types';
import { MENU_ITEMS } from '../constants';

/**
 * SERVIÇO DE API - PRATOFIT
 * O estoque é gerenciado manualmente no frontend usando localStorage.
 * O backend de estoque só é usado se VITE_USE_BACKEND_STOCK estiver ativado.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const USE_BACKEND_STOCK = import.meta.env.VITE_USE_BACKEND_STOCK === 'true';
const STORAGE_KEY = 'pratofit_inventory';

const mergeStock = (stockMap: Record<string, number>): MenuItem[] => {
  return MENU_ITEMS.map(item => ({
    ...item,
    stock: stockMap[item.id] !== undefined ? stockMap[item.id] : item.stock
  }));
};

const saveLocalStock = (items: MenuItem[]) => {
  const stockMap = items.reduce((acc: Record<string, number>, item) => {
    acc[item.id] = item.stock;
    return acc;
  }, {});
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stockMap));
};

export const apiService = {
  getProducts: async (): Promise<MenuItem[]> => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const stockMap = JSON.parse(saved) as Record<string, number>;
        return mergeStock(stockMap);
      } catch (error) {
        console.warn('Erro ao ler estoque do localStorage, usando MENU_ITEMS:', error);
      }
    }

    if (USE_BACKEND_STOCK) {
      try {
        const response = await fetch(`${API_URL}/api/products`);
        if (response.ok) {
          const { data: stockMap } = await response.json();
          const products = mergeStock(stockMap);
          saveLocalStock(products);
          return products;
        }
      } catch (error) {
        console.warn('Backend de estoque indisponível, usando manualmente localStorage ou MENU_ITEMS:', error);
      }
    }

    return MENU_ITEMS;
  },

  updateStock: async (updatedItems: MenuItem[]): Promise<boolean> => {
    saveLocalStock(updatedItems);

    if (!USE_BACKEND_STOCK) {
      return true;
    }

    try {
      const response = await fetch(`${API_URL}/api/products/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedItems })
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao enviar estoque para o backend, mas estoque local já foi atualizado:', error);
      return true;
    }
  },

  decrementStock: async (items: { id: string; quantity: number }[]): Promise<boolean> => {
    if (!USE_BACKEND_STOCK) {
      // Este app não usa decremento automático; mantenha controle manual no programa.
      return true;
    }

    try {
      const response = await fetch(`${API_URL}/api/products/decrement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      return response.ok;
    } catch (error) {
      console.error('Erro ao decrementar estoque no backend:', error);
      return false;
    }
  }
};
