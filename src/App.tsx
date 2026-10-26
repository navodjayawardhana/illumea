import { useState } from 'react';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { CoreValues } from './components/CoreValues';
import { WhyChooseUs } from './components/WhyChooseUs';
import { BrandGuarantees } from './components/BrandGuarantees';
import { ShopSection } from './components/ShopSection';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { PolicyModal } from './components/PolicyModal';
import { WhatsAppButton } from './components/WhatsAppButton';
import { Footer } from './components/Footer';
import { ProductsProvider, useProducts } from './context/ProductsContext';
import { Sparkles, ArrowRight } from 'lucide-react';

export function AppContent() {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePolicy, setActivePolicy] = useState<'refund' | 'terms' | 'privacy' | null>(null);
  const { products } = useProducts();

  // Latest products for the homepage
  const latestProducts = products.slice(0, 8);
  // Discount products for homepage
  const discountProducts = products.filter((p) => p.isDiscount);

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6] text-stone-800">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Page Routing */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <>
            {/* Hero Section */}
            <Hero
              onShopClick={() => handleNavClick('shop')}
              onAboutClick={() => handleNavClick('about')}
            />

            {/* Latest Products Section (from illumea.lk) */}
            <section className="py-16 sm:py-20 bg-white border-b border-stone-200/60">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
                  <div className="text-center sm:text-left space-y-1">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Pure Herbal Range
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif-title font-bold text-stone-900">
                      Latest Products
                    </h2>
                  </div>

                  <button
                    onClick={() => handleNavClick('shop')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b3b22] hover:text-emerald-700 bg-stone-50 hover:bg-stone-100 px-4 py-2 rounded-full border border-stone-200 transition"
                  >
                    <span>View All Collection</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {latestProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            </section>

            {/* Discount / Special Offers Section (from illumea.lk) */}
            {discountProducts.length > 0 && (
              <section className="py-16 bg-[#f7f4ed] border-b border-stone-200/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center max-w-xl mx-auto space-y-2 mb-10">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">
                      Special Value Offers
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif-title font-bold text-stone-900">
                      Our Discount Products
                    </h2>
                    <p className="text-xs text-stone-500">
                      Limited-time herbal package discounts and promotional pricing.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {discountProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Core Values Section */}
            <CoreValues />

            {/* Why Choose Illumea Section */}
            <WhyChooseUs
              onContactClick={() => handleNavClick('contact')}
              onShopClick={() => handleNavClick('shop')}
            />

            {/* Brand Guarantees & Partners */}
            <BrandGuarantees onShopClick={() => handleNavClick('shop')} />
          </>
        )}

        {activeTab === 'shop' && (
          <ShopSection
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {activeTab === 'values' && (
          <div className="pt-4">
            <CoreValues />
          </div>
        )}

        {activeTab === 'why-us' && (
          <div className="pt-4">
            <WhyChooseUs
              onContactClick={() => handleNavClick('contact')}
              onShopClick={() => handleNavClick('shop')}
            />
          </div>
        )}

        {activeTab === 'about' && (
          <AboutSection
            onShopClick={() => handleNavClick('shop')}
            onContactClick={() => handleNavClick('contact')}
          />
        )}

        {activeTab === 'contact' && <ContactSection />}
      </main>

      {/* Global Modals & Drawers */}
      <ProductModal />
      <CartDrawer />
      <CheckoutModal />
      <PolicyModal
        policyType={activePolicy}
        onClose={() => setActivePolicy(null)}
      />

      {/* Floating WhatsApp Action Widget */}
      <WhatsAppButton />

      {/* Footer */}
      <Footer
        onNavClick={handleNavClick}
        onOpenPolicy={(type) => setActivePolicy(type)}
      />
    </div>
  );
}

export function App() {
  return (
    <ProductsProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </ProductsProvider>
  );
}

export default App;
