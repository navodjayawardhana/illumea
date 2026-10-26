import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Leaf, HeartHandshake, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CONTENT } from '../data/products';
import { useProducts } from '../context/ProductsContext';

interface HeroProps {
  onShopClick: () => void;
  onAboutClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onShopClick, onAboutClick }) => {
  const { openQuickOrder } = useCart();
  const { products } = useProducts();
  // The night cream when the ERP sells it, else its best seller. Until the ERP has published
  // anything the card is drawn from the site's own copy and the button goes to the shop, since
  // a product the ERP does not list cannot be ordered.
  const sellable = products.find((p) => p.name.toLowerCase() === CONTENT[0].name.toLowerCase())
    ?? products.find((p) => p.isBestSeller) ?? products[0];
  const heroProduct = sellable ?? CONTENT[0];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#f5f1ea] via-[#faf7f2] to-[#faf9f6] pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-stone-200/50">
      {/* Decorative botanical blurred glow background */}
      <div className="absolute top-0 right-1/4 -z-10 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 -z-10 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/5 border border-emerald-800/15 text-[#1b3b22] text-xs sm:text-sm font-semibold tracking-wide">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>"Illuminate Your Natural Beauty — Safe, Affordable, Radiant."</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-title font-bold text-stone-900 leading-[1.15] tracking-tight">
              Discover the Power of <br className="hidden sm:inline" />
              <span className="text-[#1b3b22] italic relative inline-block">
                100% Herbal
                <svg className="absolute -bottom-1 left-0 w-full h-2 text-amber-500/60" viewBox="0 0 100 12" preserveAspectRatio="none">
                  <path d="M0,8 Q50,0 100,8" stroke="currentColor" strokeWidth="3" fill="none" />
                </svg>
              </span> Skincare
            </h1>

            {/* Subtext from illumea.lk */}
            <p className="text-stone-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
              Crafted with care, certified for safety, and designed to enhance your natural beauty — Illumea is here in Sri Lanka after a successful launch in Italy. Free from harsh chemicals, parabens, and bleaching agents.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onShopClick}
                className="w-full sm:w-auto px-8 py-4 bg-[#1b3b22] hover:bg-[#142d1a] text-white font-semibold rounded-full shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-base group"
              >
                <span>Shop Herbal Products</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={onAboutClick}
                className="w-full sm:w-auto px-7 py-4 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 font-semibold rounded-full shadow-xs hover:shadow transition text-base flex items-center justify-center gap-2"
              >
                <span>Learn Our Story</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Italy & Sri Lanka</span>
              </button>
            </div>

            {/* Key Trust Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 border-t border-stone-200/80 text-left">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-emerald-100/80 text-[#1b3b22]">
                  <Leaf className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">100% Herbal</div>
                  <div className="text-[11px] text-stone-500">Zero bleaching agents</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-amber-100/80 text-amber-800">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">NMRA GMP Certified</div>
                  <div className="text-[11px] text-stone-500">Safe & standard tested</div>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-blue-100/80 text-blue-900">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Italy & Sri Lanka</div>
                  <div className="text-[11px] text-stone-500">International heritage</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Product Spotlight Visual */}
          <div className="lg:col-span-5 relative flex justify-center">
            
            {/* Ambient Badge Card */}
            <div className="relative w-full max-w-md bg-white p-6 rounded-3xl shadow-xl border border-stone-200/80 transition-all hover:shadow-2xl">
              
              <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-600 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Best Seller in Sri Lanka
              </div>

              {/* Product Image */}
              <div className="relative overflow-hidden rounded-2xl bg-stone-50 aspect-square flex items-center justify-center p-4 group">
                <img
                  src={heroProduct.image}
                  alt={heroProduct.name}
                  className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('wp-content')) {
                      target.src = 'https://illumea.lk/wp-content/uploads/2025/09/WhatsApp-Image-2025-10-03-at-09.21.26_c94d0d8d.jpg';
                    }
                  }}
                />
                <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs text-[11px] font-semibold text-stone-700 px-2.5 py-1 rounded-full shadow-xs">
                  50g Net Vol.
                </span>
              </div>

              {/* Product Info Card below image */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    {heroProduct.category}
                  </span>
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                    <span>★ 4.9</span>
                    <span className="text-stone-400 font-normal">(38 reviews)</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-stone-900">
                  {heroProduct.name}
                </h3>
                <p className="text-xs text-stone-500 line-clamp-2">
                  {heroProduct.subtitle}
                </p>

                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-[#1b3b22]">
                      රු {heroProduct.price.toLocaleString()}
                    </div>
                    {heroProduct.originalPrice && (
                      <div className="text-xs text-stone-400 line-through">
                        රු {heroProduct.originalPrice.toLocaleString()}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => (sellable ? openQuickOrder(sellable) : onShopClick())}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-1"
                  >
                    Quick Order
                  </button>
                </div>
              </div>

              {/* Floating Guarantee Badge */}
              <div className="absolute -bottom-4 -left-4 bg-white border border-stone-200 px-3.5 py-2 rounded-2xl shadow-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div className="text-left">
                  <div className="text-[11px] font-bold text-stone-900">100% Guaranteed</div>
                  <div className="text-[10px] text-stone-500">Paraben & Sulfate Free</div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
