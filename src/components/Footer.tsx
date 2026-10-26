import React, { useState } from 'react';
import { MapPin, Phone, MessageCircle } from 'lucide-react';
import { api } from '../services/api';

interface FooterProps {
  onNavClick: (tab: string) => void;
  onOpenPolicy: (type: 'refund' | 'terms' | 'privacy') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavClick, onOpenPolicy }) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !phone) return;
    try {
      await api.subscribeNewsletter(email, phone);
      setSubscribed(true);
      setEmail('');
      setPhone('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <footer className="bg-[#142318] text-stone-300 pt-16 pb-12 border-t border-emerald-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Newsletter Box (from illumea.lk) */}
        <div className="bg-gradient-to-r from-[#1c3823] to-[#254d30] rounded-3xl p-8 sm:p-12 border border-emerald-800/40 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-1 text-center lg:text-left max-w-xl">
            <span className="text-xs uppercase font-bold text-amber-400 tracking-widest">
              Newsletter
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif-title font-bold text-white">
              Subscribe to our newsletter for new products, trends and offers.
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/70">
              Receive exclusive member discount vouchers and expert seasonal skincare routines.
            </p>
          </div>

          <div className="w-full lg:w-auto">
            {!subscribed ? (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md w-full">
                <input
                  type="email"
                  required
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-emerald-200/50 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-56"
                />
                <input
                  type="tel"
                  required
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-emerald-200/50 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-40"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs sm:text-sm rounded-xl transition shadow-md whitespace-nowrap"
                >
                  Claim Exclusive Offer!
                </button>
                {error && <p className="text-xs text-red-300 sm:basis-full">{error}</p>}
              </form>
            ) : (
              <div className="bg-emerald-900/80 border border-emerald-500/40 px-5 py-3 rounded-xl text-amber-300 text-xs sm:text-sm font-semibold flex items-center gap-2">
                <span>✓ Thank you for subscribing! Your offer code has been saved.</span>
              </div>
            )}
          </div>
        </div>

        {/* 4 Footer Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Info & Socials */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/images/logo.png"
                alt="ILLUMEA SKIN CARE"
                className="h-10 w-auto object-contain brightness-0 invert opacity-90"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.src = 'https://illumea.lk/wp-content/uploads/2025/09/logo-1.png';
                }}
              />
            </div>

            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-sm">
              Illumea Skincare blends nature and science to deliver premium, safe, and herbal skincare products. Manufactured in GMP-certified facilities, we ensure quality, safety, affordability, and visible results to enhance your natural beauty with confidence.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-emerald-800 text-stone-300 hover:text-white flex items-center justify-center transition"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-emerald-800 text-stone-300 hover:text-white flex items-center justify-center transition"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://wa.me/94766503330"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#25D366] text-stone-300 hover:text-white flex items-center justify-center transition"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 1: Our Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Our Product
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => onNavClick('shop')} className="hover:text-white transition">
                  Illumea Face Wash
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('shop')} className="hover:text-white transition">
                  Illumea Anti-Acne Face Wash
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('shop')} className="hover:text-white transition">
                  Illumea Deep Cleanser
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('shop')} className="hover:text-white transition">
                  Illumea Scrub
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('shop')} className="hover:text-white transition">
                  Illumea Hydrating Toner
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Company & Useful Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Company
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => onNavClick('home')} className="hover:text-white transition">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('about')} className="hover:text-white transition">
                  About us
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('shop')} className="hover:text-white transition">
                  Shop
                </button>
              </li>
              <li>
                <button onClick={() => onNavClick('contact')} className="hover:text-white transition">
                  Contact Us
                </button>
              </li>
              <li className="pt-2 border-t border-white/10">
                <button onClick={() => onOpenPolicy('refund')} className="hover:text-white transition block">
                  Refund Policy
                </button>
              </li>
              <li>
                <button onClick={() => onOpenPolicy('terms')} className="hover:text-white transition block">
                  Terms and Conditions
                </button>
              </li>
              <li>
                <button onClick={() => onOpenPolicy('privacy')} className="hover:text-white transition block">
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Customer Support
            </h4>
            <div className="space-y-3 text-xs text-stone-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>783 / William Gopallawa Mawatha , Kandy</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <a href="tel:0766503330" className="hover:text-white font-semibold">
                  0766503330
                </a>
              </div>
              <div className="p-3 bg-emerald-950/60 rounded-xl border border-emerald-900/80 text-[11px] text-emerald-200">
                <span>Sansu International Pvt Ltd</span>
                <span className="block text-emerald-400/80">GMP & NMRA Registered</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar / Copyright (from illumea.lk) */}
        <div className="pt-8 border-t border-emerald-950/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            Copyright © 2025 <strong>ILLUMEA SKIN CARE</strong>, All rights reserved. Powered by{' '}
            <a
              href="https://esupport.live/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline font-semibold"
            >
              eSupport
            </a>.
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>100% Herbal Guaranteed</span>
            <span>•</span>
            <span>Sri Lanka & Italy</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
