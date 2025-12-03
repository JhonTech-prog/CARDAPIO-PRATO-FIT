
import React, { useState, useMemo } from 'react';
import { MENU_ITEMS, APP_NAME } from './constants';
import { MenuItem, CartItem, KitDefinition } from './types';
import MenuCard from './components/MenuCard';
import CartSheet from './components/CartSheet';
import KitSelector from './components/KitSelector';
import AIChef from './components/AIChef';
import CheckoutModal from './components/CheckoutModal';
import LimitReachedModal from './components/LimitReachedModal';
import { ShoppingBag, Search, Info, ArrowLeft, PackageCheck } from 'lucide-react';

const App: React.FC = () => {
  // State for the new flow
  const [selectedKit, setSelectedKit] = useState<KitDefinition | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Group items by category
  const categorizedItems = useMemo(() => {
    const groups: { [key: string]: MenuItem[] } = {};
    const filtered = MENU_ITEMS.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    filtered.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [searchQuery]);

  const totalSelectedItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const addToCart = (item: MenuItem) => {
    if (!selectedKit) return;

    // Check if we reached the limit
    if (totalSelectedItems >= selectedKit.totalMeals) {
        setIsLimitModalOpen(true); // Open the specific limit modal
        return;
    }

    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    
    // Auto-trigger modal when kit becomes full
    if (totalSelectedItems + 1 === selectedKit.totalMeals) {
        setIsLimitModalOpen(true);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    if (!selectedKit) return;
    
    // Check limit when adding
    if (delta > 0) {
        if (totalSelectedItems >= selectedKit.totalMeals) {
            setIsLimitModalOpen(true);
            return; 
        }
        // Auto-trigger modal when kit becomes full
        if (totalSelectedItems + 1 === selectedKit.totalMeals) {
            setIsLimitModalOpen(true);
        }
    }

    setCartItems(prev => {
      return prev.map(item => {
        if (item.id === id) {
          return { ...item, quantity: Math.max(0, item.quantity + delta) };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const getItemQuantity = (itemId: string) => {
    return cartItems.find(i => i.id === itemId)?.quantity || 0;
  };

  const handleSelectKit = (kit: KitDefinition) => {
    setSelectedKit(kit);
    setCartItems([]); // Reset cart when choosing new kit
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChangeKit = () => {
    if (cartItems.length === 0) {
        // If cart is empty, simply go back without confirmation
        setSelectedKit(null);
        setCartItems([]);
        setIsCartOpen(false);
        setIsLimitModalOpen(false);
        setIsCheckoutOpen(false);
        return;
    }

    if (window.confirm("Se você trocar de plano, sua seleção atual será perdida. Deseja continuar?")) {
        setSelectedKit(null);
        setCartItems([]);
        setIsCartOpen(false);
        setIsLimitModalOpen(false);
        setIsCheckoutOpen(false);
    }
  };

  const handleClearCart = () => {
    if (cartItems.length > 0 && window.confirm("Tem certeza que deseja remover todos os itens da cesta?")) {
        setCartItems([]);
    }
  };

  const handleOpenCheckout = () => {
    setIsCartOpen(false);
    setIsLimitModalOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      {/* Header / Banner */}
      <header className="bg-white shadow-sm sticky top-0 z-30 relative overflow-visible">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 relative z-20">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3 -ml-6">
               <div>
                 <img 
                   src="https://i.postimg.cc/C1mfH4ML/LOGO-2.png" 
                   alt={APP_NAME} 
                   className="h-28 w-auto object-contain cursor-pointer" 
                   onClick={() => selectedKit && handleChangeKit()}
                 />
               </div>
            </div>

            {/* Central Half-Moon Dish Image (Desktop) - Centered Exactly */}
            <div className="hidden lg:block absolute top-0 left-[52%] -translate-x-1/2 z-10 pointer-events-none">
                <div className="relative w-[500px] h-[150px] bg-gray-900 rounded-b-[100%] shadow-2xl border-x-8 border-emerald-500 overflow-hidden -mt-1">
                    <img 
                        src="https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151100_03UX_i.jpg" 
                        alt="Prato Destaque" 
                        className="w-full h-full object-cover object-center scale-110 brightness-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent pointer-events-none"></div>
                </div>
            </div>

            <div className="flex items-center gap-6 z-20">
                {/* Decorative Bars */}
                <div className="hidden sm:flex gap-3 mr-4">
                    <div className="w-10 h-20 sm:h-24 bg-emerald-700 -skew-x-[35deg] rounded-sm shadow-sm"></div>
                    <div className="w-10 h-20 sm:h-24 bg-orange-500 -skew-x-[35deg] rounded-sm shadow-sm"></div>
                    <div className="w-10 h-20 sm:h-24 bg-emerald-400 -skew-x-[35deg] rounded-sm shadow-sm"></div>
                </div>

                {/* Cart Trigger (Only visible if kit selected) */}
                {selectedKit && (
                    <button 
                    onClick={() => setIsCartOpen(true)}
                    className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                    <ShoppingBag size={28} />
                    {totalSelectedItems > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-emerald-600 rounded-full">
                        {totalSelectedItems}
                        </span>
                    )}
                    </button>
                )}
            </div>
          </div>
          
          {/* Progress Bar / Search (Only if Kit Selected) */}
          {selectedKit && (
             <div className="pb-4 space-y-4 pt-4 lg:pt-8">
                {/* Progress Bar */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-emerald-800">
                        <PackageCheck size={20} />
                        <span className="font-medium text-sm sm:text-base">
                            Editando: <b>{selectedKit.name}</b>
                        </span>
                    </div>
                    <div className="text-sm font-bold text-emerald-700">
                        {totalSelectedItems}/{selectedKit.totalMeals} selecionados
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                    type="text"
                    placeholder="Buscar itens no cardápio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
                    />
                </div>
             </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {!selectedKit ? (
            // Mode 1: Kit Selection
            <KitSelector onSelect={handleSelectKit} />
        ) : (
            // Mode 2: Meal Selection
            <>
                <div className="mb-4">
                    <button 
                        onClick={handleChangeKit} 
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Voltar para escolha de planos
                    </button>
                </div>

                {Object.entries(categorizedItems).map(([category, items]: [string, MenuItem[]]) => (
                <div key={category} className="mb-10 animate-fade-in-up">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2 border-gray-100">
                        {category} 
                        <span className="text-gray-400 font-normal text-sm">({items.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {items.map(item => (
                        <div key={item.id} className="h-full">
                        <MenuCard 
                            item={item} 
                            onAdd={addToCart}
                            onRemove={() => updateQuantity(item.id, -1)}
                            isLimitReached={totalSelectedItems >= selectedKit.totalMeals}
                            quantity={getItemQuantity(item.id)}
                        />
                        </div>
                    ))}
                    </div>
                </div>
                ))}
                
                {Object.keys(categorizedItems).length === 0 && (
                <div className="text-center py-20 text-gray-500">
                    <Info size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Nenhum item encontrado para "{searchQuery}"</p>
                </div>
                )}
            </>
        )}
      </main>

      <AIChef />
      
      <CartSheet 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        selectedKit={selectedKit}
        onChangeKit={handleChangeKit}
        onCheckout={handleOpenCheckout}
        onClearCart={handleClearCart}
      />

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        selectedKit={selectedKit}
      />

      {selectedKit && (
          <LimitReachedModal 
            isOpen={isLimitModalOpen}
            onClose={() => setIsLimitModalOpen(false)}
            onCheckout={handleOpenCheckout}
            totalMeals={selectedKit.totalMeals}
          />
      )}
    </div>
  );
};

export default App;
