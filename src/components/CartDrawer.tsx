import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, MessageCircle, Truck, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    deliveryFee,
    total,
    totalItems,
    setIsCheckoutOpen,
  } = useCart();

  if (!isCartOpen) return null;

  const FREE_SHIPPING_THRESHOLD = 5000;
  const progressPercent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  const handleCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleWhatsAppCheckout = () => {
    let message = `*NEW ORDER - ILLUMEA SKIN CARE*\n\n`;
    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.product.name}* (${item.product.size})\n   Qty: ${item.quantity} x Rs. ${item.product.price.toLocaleString()} = Rs. ${(item.quantity * item.product.price).toLocaleString()}\n`;
    });
    message += `\n*Subtotal:* Rs. ${subtotal.toLocaleString()}`;
    message += `\n*Delivery Fee:* ${deliveryFee === null ? 'to be confirmed' : deliveryFee === 0 ? 'FREE' : `Rs. ${deliveryFee.toLocaleString()}`}`;
    message += `\n*Total Order Amount:* Rs. ${total.toLocaleString()}`;
    message += `\n\nPlease let me know how to proceed with payment & delivery details!`;

    window.open(`https://wa.me/94766503330?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
          
          {/* Header */}
          <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-[#fbf9f5]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#1b3b22]" />
              <h2 className="text-lg font-bold text-stone-900">Your Shopping Bag</h2>
              <span className="bg-[#1b3b22] text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {totalItems}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Bar */}
          <div className="px-5 py-3 bg-emerald-50/70 border-b border-emerald-100 text-xs">
            {remainingForFreeShipping > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-emerald-900 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    Add <strong className="text-emerald-800">රු {remainingForFreeShipping.toLocaleString()}</strong> more for FREE Delivery!
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Congratulations! You qualify for FREE Islandwide Delivery!</span>
              </div>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-16">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-stone-800 text-base">Your bag is empty</h3>
                <p className="text-xs text-stone-500 max-w-xs">
                  Discover our 100% herbal range and treat your skin to pure natural radiance.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-4 px-6 py-2.5 bg-[#1b3b22] text-white rounded-full text-xs font-semibold hover:bg-[#142d1a] transition"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-4 p-3 rounded-2xl border border-stone-200/80 bg-white hover:border-stone-300 transition shadow-2xs"
                >
                  {/* Image */}
                  <div className="w-20 h-20 bg-stone-50 rounded-xl p-2 flex items-center justify-center shrink-0">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="max-h-full max-w-full object-contain mix-blend-multiply"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.src = 'https://illumea.lk/wp-content/uploads/2025/09/WhatsApp-Image-2025-10-03-at-09.21.26_c94d0d8d.jpg';
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug line-clamp-1">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-stone-400 hover:text-rose-500 transition p-1"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[11px] text-stone-500">
                        {item.product.size}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-bold text-[#1b3b22]">
                        රු {(item.product.price * item.quantity).toLocaleString()}
                      </span>

                      {/* Quantity buttons */}
                      <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50 text-xs">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="px-2 py-1 text-stone-600 hover:bg-stone-200 font-bold"
                        >
                          -
                        </button>
                        <span className="px-2.5 py-1 font-semibold text-stone-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="px-2 py-1 text-stone-600 hover:bg-stone-200 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Calculations */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-stone-200 bg-[#fbf9f5] space-y-3">
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-900">
                    රු {subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Islandwide Delivery</span>
                  <span className="font-semibold">
                    {deliveryFee === null ? (
                      <span className="text-stone-500 font-normal">Calculated at checkout</span>
                    ) : deliveryFee === 0 ? (
                      <span className="text-emerald-700 font-bold">FREE</span>
                    ) : (
                      `රු ${deliveryFee.toLocaleString()}`
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm sm:text-base font-bold text-stone-900 pt-2 border-t border-stone-200">
                  <span>Total</span>
                  <span className="text-[#1b3b22]">
                    රු {total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleCheckout}
                  className="w-full py-3.5 px-4 bg-[#1b3b22] hover:bg-[#142d1a] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleWhatsAppCheckout}
                  className="w-full py-2.5 px-4 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Order via WhatsApp Direct</span>
                </button>
              </div>

              <div className="flex justify-between items-center pt-1 text-[11px] text-stone-500">
                <button
                  onClick={clearCart}
                  className="hover:text-rose-600 underline"
                >
                  Clear Bag
                </button>
                <span>100% Secure Checkout</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
