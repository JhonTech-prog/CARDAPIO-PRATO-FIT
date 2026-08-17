import { MenuItem } from '../types';
import { MENU_ITEMS } from '../constants';

export interface ErpMenuItem {
  id: string;
  externalProductId: string;
  title: string;
  description: string;
  price: number;
  serving: string;
  category: string;
  stock: number;
  available: boolean;
}

export interface OnlineOrderItem {
  externalProductId: string;
  quantity: number;
}

export interface StockReservation {
  reservationId: string;
  status: string;
  expiresAt: string;
  items: OnlineOrderItem[];
}

interface ErpErrorPayload {
  message?: string;
  error?: string;
}

export class ErpApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ErpApiError';
  }
}

const ERP_API_URL = (import.meta.env.VITE_ERP_API_URL || '').replace(/\/$/, '');

const getErpUrl = (path: string) => {
  if (!ERP_API_URL) {
    throw new ErpApiError('A integração de estoque não está configurada. Defina VITE_ERP_API_URL.');
  }

  return `${ERP_API_URL}${path}`;
};

const parseError = async (response: Response): Promise<string> => {
  const fallbackMessage = `O ERP respondeu com erro ${response.status}.`;

  try {
    const body = await response.json() as ErpErrorPayload;
    return body.message || body.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(getErpUrl(path), options);
  } catch (error) {
    if (error instanceof ErpApiError) throw error;
    throw new ErpApiError('Não foi possível conectar ao ERP. Verifique sua conexão e tente novamente.');
  }

  if (!response.ok) {
    throw new ErpApiError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return await response.json() as T;
  } catch {
    throw new ErpApiError('O ERP retornou uma resposta inválida.');
  }
};

const menuImageFor = (remoteItem: ErpMenuItem) => {
  const matchingItem = MENU_ITEMS.find(item =>
    item.id === remoteItem.id ||
    item.title.toLocaleLowerCase() === remoteItem.title.toLocaleLowerCase()
  );

  return matchingItem?.imageUrl || '';
};

const mapMenuItem = (item: ErpMenuItem): MenuItem => {
  if (!item.id || !item.externalProductId || !item.title) {
    throw new ErpApiError('O ERP retornou um item de cardápio incompleto.');
  }

  return {
    id: item.id,
    externalProductId: item.externalProductId,
    title: item.title,
    description: item.description || '',
    price: Number(item.price) || 0,
    serving: item.serving || '',
    category: item.category || 'Cardápio',
    imageUrl: menuImageFor(item),
    stock: item.available ? Math.max(0, Number(item.stock) || 0) : 0,
    available: item.available && Number(item.stock) > 0
  };
};

export const erpService = {
  async getOnlineMenu(): Promise<MenuItem[]> {
    const result = await request<{ items: ErpMenuItem[] }>('/api/online-menu');

    if (!Array.isArray(result.items)) {
      throw new ErpApiError('O ERP retornou um cardápio inválido.');
    }

    return result.items.map(mapMenuItem);
  },

  async createReservation(
    items: OnlineOrderItem[],
    customerName: string | undefined,
    idempotencyKey: string
  ): Promise<StockReservation> {
    const reservation = await request<StockReservation>('/api/online-orders/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, customerName, idempotencyKey })
    });

    if (!reservation.reservationId || !reservation.status || !reservation.expiresAt) {
      throw new ErpApiError('O ERP não retornou uma reserva válida.');
    }

    return reservation;
  },

  confirmReservation(reservationId: string, idempotencyKey: string) {
    return request(`/api/online-orders/${encodeURIComponent(reservationId)}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey })
    });
  },

  cancelReservation(reservationId: string) {
    return request(`/api/online-orders/${encodeURIComponent(reservationId)}`, {
      method: 'DELETE'
    });
  }
};
