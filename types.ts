export interface MenuItem {
  id: string;
  title: string;
  description: string;
  // Preço mantido para compatibilidade, mas não será exibido na UI de seleção
  price: number;
  originalPrice?: number;
  serving: string;
  imageUrl: string;
  category: string;
  tags?: string[];
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface KitDefinition {
  id: string;
  name: string;
  totalMeals: number;
  price: number;
  pricePerMeal: number;
  description?: string;
  highlight?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}