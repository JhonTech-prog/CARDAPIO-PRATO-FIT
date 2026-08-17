
export interface MenuItem {
  id: string;
  externalProductId: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  serving: string;
  imageUrl: string;
  category: string;
  tags?: string[];
  stock: number;
  available: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

// Added KitDefinition here as it is being imported from this file by components
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