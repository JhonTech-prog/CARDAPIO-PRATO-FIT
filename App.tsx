
import React, { useState, useMemo, useEffect } from 'react';
import { APP_NAME } from './constants';
import { MenuItem, CartItem, KitDefinition } from './types';
import { apiService } from './services/apiService';
import MenuCard from './components/MenuCard';
import CartSheet from './components/CartSheet';
import KitSelector from './components/KitSelector';
import AIChef from './components/AIChef';
import CheckoutModal from './components/CheckoutModal';
import LimitReachedModal from './components/LimitReachedModal';
import AdminPanel from './components/AdminPanel';
import MobileStockEntry from './components/MobileStockEntry';
import { ShoppingBag, Search, ArrowLeft, PackageCheck, Lock, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  // Detecta subdomínio de estoque mobile (estoque.pratofit.com.br)
  const isMobileStockDomain = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname.toLowerCase();
    
    // Detecta subdomínio estoque.pratofit.com.br ou estoque-pratofit
    const isStockDomain = host.startsWith('estoque.') || host.includes('estoque-');
    
    // Para testes locais: acesse http://localhost:3000/?estoque=true
    const isStockParam = new URLSearchParams(window.location.search).get('estoque') === 'true';
    
    return isStockDomain || isStockParam;
  }, []);

  const isSubdomainAdmin = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    
    // Detecta subdomínio admin.pratofit.com.br ou admin-pratofit
    const isAdminDomain = host.startsWith('admin.') || host.includes('admin-');
    
    // Para testes locais: acesse http://localhost:3000/?admin=true
    const isAdminParam = new URLSearchParams(window.location.search).get('admin') === 'true';
    
    // Para testes: acesse http://localhost:3000/admin
    const isAdminPath = path.startsWith('/admin');
    
    return isAdminDomain || isAdminParam || isAdminPath;
  }, []);

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedKit, setSelectedKit] = useState<KitDefinition | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const products = await apiService.getProducts();
      setMenuItems(products);
      setIsLoadingData(false);
    };
    loadData();
  }, []);

  const categorizedItems = useMemo<Record<string, MenuItem[]>>(() => {
    const groups: Record<string, MenuItem[]> = {};
    const filtered = menuItems.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    filtered.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [searchQuery, menuItems]);

  const totalSelectedItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const addToCart = (item: MenuItem) => {
    if (!selectedKit) return;
    
    // Verifica se o item está em estoque
    if (item.stock <= 0) {
        alert("😢 Desculpe! Este item está esgotado no momento.");
        return;
    }
    
    if (totalSelectedItems >= selectedKit.totalMeals) {
        setIsLimitModalOpen(true);
        return;
    }
    
    const currentQty = cartItems.find(i => i.id === item.id)?.quantity || 0;
    if (currentQty >= item.stock) {
        alert("Poxa! Você já adicionou todas as unidades disponíveis deste item.");
        return;
    }
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
    
    if (totalSelectedItems + 1 === selectedKit.totalMeals) {
      setTimeout(() => setIsLimitModalOpen(true), 300);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    if (!selectedKit) return;
    if (delta > 0) {
        const item = menuItems.find(i => i.id === id);
        if (!item || totalSelectedItems >= selectedKit.totalMeals) {
            if (totalSelectedItems >= selectedKit.totalMeals) setIsLimitModalOpen(true);
            return;
        }
        const currentQtyInCart = cartItems.find(i => i.id === id)?.quantity || 0;
        if (currentQtyInCart >= item.stock) return;
    }
    setCartItems(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
  };

  const handleSaveStock = async (updatedItems: MenuItem[]) => {
    const success = await apiService.updateStock(updatedItems);
    if (success) {
      setMenuItems(updatedItems);
    }
  };

  const checkAdminPassword = () => {
    if (adminPass === 'admin123') {
      setIsAdminMode(true);
      setAdminPass('');
    } else {
      alert('Senha incorreta!');
      setAdminPass('');
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando PratoFit...</p>
      </div>
    );
  }

  // Rota Mobile de Estoque
  if (isMobileStockDomain) {
    return <MobileStockEntry />;
  }

  if (isAdminMode) {
    return (
      <AdminPanel 
        items={menuItems} 
        onSave={handleSaveStock} 
        onExit={() => {
            setIsAdminMode(false);
            if (isSubdomainAdmin) {
                window.location.href = 'https://pratofit.com.br';
            }
        }} 
      />
    );
  }

  if (isSubdomainAdmin && !isAdminMode) {
    return (
      <div className="fixed inset-0 bg-[#0f172a] flex items-center justify-center p-6 z-[9999]">
        <div className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-12 text-center">
                <div className="mb-10">
                    <img src="https://i.postimg.cc/C1mfH4ML/LOGO-2.png" alt="Admin" className="h-16 mx-auto mb-6" />
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest mb-4">
                        <ShieldCheck size={12} className="text-emerald-600" /> Acesso Administrativo
                    </div>
                    <h3 className="text-2xl font-black text-slate-800">PratoFit Central</h3>
                </div>
                <div className="space-y-4">
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input 
                            type="password" 
                            value={adminPass}
                            onChange={(e) => setAdminPass(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && checkAdminPassword()}
                            placeholder="Senha de acesso"
                            className="w-full pl-12 pr-6 py-4 border-2 border-slate-50 rounded-2xl outline-none focus:border-emerald-500 transition-all bg-slate-50 focus:bg-white text-center font-bold tracking-widest"
                            autoFocus
                        />
                    </div>
                    <button onClick={checkAdminPassword} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl active:scale-95">
                        Entrar no Painel
                    </button>
                    <a href="https://pratofit.com.br" className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-emerald-600 transition-colors pt-6 block text-center">
                        Voltar para a Loja Pública
                    </a>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-x-hidden">
      {selectedKit && (
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <img 
                src="https://i.postimg.cc/C1mfH4ML/LOGO-2.png" 
                alt={APP_NAME} 
                className="h-12 w-auto object-contain cursor-pointer" 
                onClick={() => setSelectedKit(null)} 
              />
              <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-emerald-600 bg-emerald-50 rounded-full">
                <ShoppingBag size={24} />
                {totalSelectedItems > 0 && <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-[10px] font-bold text-white bg-orange-500 rounded-full translate-x-1/4 -translate-y-1/4">{totalSelectedItems}</span>}
              </button>
            </div>
            <div className="pb-4 space-y-3">
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm"><PackageCheck size={18} /> {selectedKit.name}</div>
                  <div className="text-xs font-black text-emerald-700 bg-white px-2 py-1 rounded-full">{totalSelectedItems}/{selectedKit.totalMeals} pratos</div>
              </div>
              <div className="relative">
                  <Search className="absolute inset-y-0 left-3 flex items-center h-full text-slate-400" size={16} />
                  <input type="text" placeholder="Pesquisar marmitas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500" />
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={`flex-1 ${!selectedKit ? '' : 'max-w-7xl mx-auto w-full px-4 pt-6'}`}>
        {!selectedKit ? (
            <KitSelector onSelect={(kit) => { setSelectedKit(kit); setCartItems([]); }} />
        ) : (
            <>
                <button onClick={() => setSelectedKit(null)} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-widest mb-6"><ArrowLeft size={14} /> Mudar meu plano</button>
                {(Object.entries(categorizedItems) as [string, MenuItem[]][]).map(([category, items]) => (
                <div key={category} className="mb-10 animate-fade-in-up">
                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3"><span className="w-1.5 h-6 bg-emerald-500 rounded-full" /> {category}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map(item => (
                        <MenuCard 
                          key={item.id} 
                          item={item} 
                          onAdd={addToCart} 
                          onRemove={(it: MenuItem) => updateQuantity(it.id, -1)} 
                          isLimitReached={totalSelectedItems >= selectedKit.totalMeals} 
                          quantity={cartItems.find(i => i.id === item.id)?.quantity || 0} 
                        />
                    ))}
                    </div>
                </div>
                ))}
            </>
        )}
      </main>

      <footer className="py-20 bg-gray-50 border-t border-gray-100 text-center">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">PratoFit Alimentação Saudável - Campina Grande/PB</p>
      </footer>

      <AIChef />
      <CartSheet 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cartItems} 
        onUpdateQuantity={updateQuantity} 
        selectedKit={selectedKit} 
        onChangeKit={() => setSelectedKit(null)} 
        onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} 
        onClearCart={() => setCartItems([])} 
      />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} items={cartItems} selectedKit={selectedKit} />
      {selectedKit && <LimitReachedModal isOpen={isLimitModalOpen} onClose={() => setIsLimitModalOpen(false)} onCheckout={() => { setIsLimitModalOpen(false); setIsCheckoutOpen(true); }} totalMeals={selectedKit.totalMeals} />}
    </div>
  );
};

export default App;