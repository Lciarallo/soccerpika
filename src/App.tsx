import { useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Catalog } from './components/Catalog';
import { ProductModal } from './components/ProductModal';
import { AuthenticityChecker } from './components/AuthenticityChecker';
import { CartDrawer } from './components/CartDrawer';
import { SellJerseyForm } from './components/SellJerseyForm';
import { Footer } from './components/Footer';
import { JERSEYS } from './data/jerseys';
import type { Jersey, CartItem } from './types/jersey';
import { CheckCircle2 } from 'lucide-react';

export function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('catalog');
  
  // Modals & Drawers
  const [selectedJersey, setSelectedJersey] = useState<Jersey | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthenticityOpen, setIsAuthenticityOpen] = useState(false);
  const [authenticityCodeParam, setAuthenticityCodeParam] = useState('');
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);

  // Cart & Wishlist State
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { jersey: JERSEYS[0], size: 'M', quantity: 1 }
  ]);
  const [wishlistIds, setWishlistIds] = useState<string[]>(['acmilan-2007-kaka']);

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddToCart = (jersey: Jersey, size: 'P' | 'M' | 'G' | 'GG') => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.jersey.id === jersey.id && item.size === size);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [...prev, { jersey, size, quantity: 1 }];
    });
    showToast(`Manto ${jersey.club} (${size}) adicionado ao carrinho!`);
  };

  const handleUpdateQuantity = (jerseyId: string, size: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.jersey.id === jerseyId && item.size === size) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (jerseyId: string, size: string) => {
    setCartItems(prev => prev.filter(item => !(item.jersey.id === jerseyId && item.size === size)));
  };

  const handleToggleWishlist = (jersey: Jersey) => {
    setWishlistIds(prev => {
      const exists = prev.includes(jersey.id);
      if (exists) {
        showToast(`Removido dos favoritos`);
        return prev.filter(id => id !== jersey.id);
      } else {
        showToast(`Adicionado aos seus favoritos Vault!`);
        return [...prev, jersey.id];
      }
    });
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const featuredJersey = JERSEYS.find(j => j.id === 'brasil-1998-ronaldo') || JERSEYS[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-gray-100 font-['Plus_Jakarta_Sans'] selection:bg-[#00FF7F] selection:text-black">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0e1422] border border-[#00FF7F] text-white px-5 py-3 rounded-xl shadow-[0_0_25px_rgba(0,255,127,0.3)] flex items-center gap-2.5 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#00FF7F]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        cartCount={totalCartCount}
        wishlistCount={wishlistIds.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuthenticity={() => {
          setAuthenticityCodeParam('');
          setIsAuthenticityOpen(true);
        }}
        onOpenSellModal={() => setIsSellModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      {/* Main Content */}
      <main className="flex-1">
        
        {/* Hero Section */}
        <Hero
          featuredJersey={featuredJersey}
          onSelectJersey={(j) => setSelectedJersey(j)}
          onOpenAuthenticity={() => {
            setAuthenticityCodeParam(featuredJersey.authenticityCode);
            setIsAuthenticityOpen(true);
          }}
        />

        {/* Catalog Section */}
        <div id="catalog">
          <Catalog
            jerseys={JERSEYS}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onSelectJersey={(j) => setSelectedJersey(j)}
            onAddToCart={handleAddToCart}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>

      </main>

      {/* Footer */}
      <Footer />

      {/* Product Detail Modal */}
      <ProductModal
        jersey={selectedJersey}
        onClose={() => setSelectedJersey(null)}
        onAddToCart={handleAddToCart}
        isWishlisted={selectedJersey ? wishlistIds.includes(selectedJersey.id) : false}
        onToggleWishlist={handleToggleWishlist}
        onOpenAuthenticityWithCode={(code) => {
          setAuthenticityCodeParam(code);
          setIsAuthenticityOpen(true);
        }}
      />

      {/* Authenticity Verification Modal */}
      {isAuthenticityOpen && (
        <AuthenticityChecker
          jerseys={JERSEYS}
          initialCode={authenticityCodeParam}
          onClose={() => setIsAuthenticityOpen(false)}
        />
      )}

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCartItems([])}
      />

      {/* Sell Your Jersey Modal */}
      <SellJerseyForm
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
      />

    </div>
  );
}

export default App;
