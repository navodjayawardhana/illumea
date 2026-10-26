import React, { useEffect, useState } from 'react';
import { X, CheckCircle, Truck, Banknote, ShieldCheck, MessageCircle, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle'
];

export const CheckoutModal: React.FC = () => {
  const { isCheckoutOpen, setIsCheckoutOpen, cart, subtotal, totalWeightGrams, deliveryFee, setDeliveryFee, total, clearCart } = useCart();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('Kandy');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank'>('cod');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [deliverable, setDeliverable] = useState(true);

  // Vertik prices delivery by city, basket weight and subtotal; ask again whenever any of them
  // changes, a moment after the shopper stops typing.
  useEffect(() => {
    if (!isCheckoutOpen || !city.trim() || cart.length === 0) {
      setDeliveryFee(null);
      setQuoteMessage('');
      setDeliverable(true);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      api.getShippingQuote(city.trim(), totalWeightGrams, subtotal)
        .then((q) => {
          if (!live) return;
          setDeliverable(q.deliverable);
          setDeliveryFee(q.deliverable ? (q.fee ?? 0) : null);
          setQuoteMessage(q.deliverable ? '' : q.message);
        })
        .catch(() => { if (live) setDeliveryFee(null); });
    }, 500);
    return () => { live = false; clearTimeout(timer); };
  }, [isCheckoutOpen, city, totalWeightGrams, subtotal, cart.length, setDeliveryFee]);

  if (!isCheckoutOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      setErrorMessage('Please fill in all required delivery fields.');
      return;
    }

    if (phone.replace(/\D/g, '').length < 9) {
      setErrorMessage('Please enter a valid phone number (e.g. 076 650 3330).');
      return;
    }

    if (!deliverable) {
      setErrorMessage(quoteMessage || 'We do not deliver to that city yet. Please order via WhatsApp.');
      return;
    }

    setIsSubmitting(true);

    try {
      // The order goes straight into Vertik, which holds the stock and checks every price.
      const order = await api.createOrder({
        name: fullName,
        phone,
        address: `${address}, ${district}`,
        city,
        paymentMethod: paymentMethod === 'bank' ? 'bank_transfer' : 'cod',
        notes,
        deliveryFee,
        items: cart.map(item => ({
          itemId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
      });

      setOrderId(order.order_number);
      setIsSubmitting(false);
      setOrderComplete(true);

      // Trigger Confetti Celebration
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(`${(err as Error).message} You can also order directly via WhatsApp.`);
    }
  };

  const handleFinish = () => {
    clearCart();
    setOrderComplete(false);
    setIsCheckoutOpen(false);
  };

  const sendWhatsAppConfirmation = () => {
    let text = `*ORDER CONFIRMATION: #${orderId}*\n\n`;
    text += `*Customer:* ${fullName}\n*Phone:* ${phone}\n*Address:* ${address}, ${city}, ${district}\n*Payment Method:* ${paymentMethod.toUpperCase()}\n\n`;
    text += `*ITEMS:*\n`;
    cart.forEach((item, idx) => {
      text += `${idx + 1}. ${item.product.name} (${item.product.size}) x ${item.quantity} = Rs. ${(item.product.price * item.quantity).toLocaleString()}\n`;
    });
    text += `\n*Total Amount:* Rs. ${total.toLocaleString()}\n`;
    if (notes) text += `*Notes:* ${notes}\n`;
    text += `\nPlease confirm my order dispatch. Thank you!`;

    window.open(`https://wa.me/94766503330?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div
        className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setIsCheckoutOpen(false)}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition"
          aria-label="Close checkout"
        >
          <X className="w-5 h-5" />
        </button>

        {!orderComplete ? (
          <div className="p-6 sm:p-8 max-h-[88vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-stone-200 pb-4 mb-6">
              <span className="text-xs font-bold text-emerald-800 tracking-wider uppercase">
                Secure Checkout
              </span>
              <h2 className="text-2xl font-serif-title font-bold text-stone-900">
                Complete Your Skincare Order
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Delivered safely to your doorstep anywhere in Sri Lanka.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal & Shipping Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  1. Delivery Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priyantha Silva"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 077 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="House No, Street Name"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      City / Town *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kandy / Colombo 03"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      District (Sri Lanka) *
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    >
                      {SRI_LANKA_DISTRICTS.map((dist) => (
                        <option key={dist} value={dist}>
                          {dist}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Special Delivery Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Leave with security, call before arrival"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  2. Select Payment Method
                </h3>

                {/* Card payment appears once a gateway is set up in Vertik (GET /payments). */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex flex-col p-3 rounded-2xl border cursor-pointer transition ${
                      paymentMethod === 'cod'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="text-emerald-700 focus:ring-emerald-600"
                      />
                      <Banknote className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-stone-900">Cash on Delivery</span>
                    </div>
                    <span className="text-[11px] text-stone-500 pl-5">Pay when order arrives</span>
                  </label>

                  <label
                    className={`flex flex-col p-3 rounded-2xl border cursor-pointer transition ${
                      paymentMethod === 'bank'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'bank'}
                        onChange={() => setPaymentMethod('bank')}
                        className="text-emerald-700 focus:ring-emerald-600"
                      />
                      <Truck className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-stone-900">Bank Transfer</span>
                    </div>
                    <span className="text-[11px] text-stone-500 pl-5">Commercial / Sampath</span>
                  </label>

                </div>

                {paymentMethod === 'bank' && (
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1 animate-fade-in">
                    <p className="font-bold text-stone-800">Sansu International Pvt Ltd - Bank Details:</p>
                    <p>Commercial Bank | A/C: 1000 482 918 | Kandy Branch</p>
                    <p className="text-stone-400">Please send deposit slip via WhatsApp: +94 76 650 3330</p>
                  </div>
                )}
              </div>

              {/* Order Summary Box */}
              <div className="bg-[#fbf9f5] p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Items Total ({cart.length})</span>
                  <span>රු {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Islandwide Delivery</span>
                  <span>
                    {deliveryFee === null
                      ? <span className="text-stone-400">{city.trim() ? 'Checking...' : 'Enter your city'}</span>
                      : deliveryFee === 0 ? <strong className="text-emerald-700">FREE</strong> : `රු ${deliveryFee.toLocaleString()}`}
                  </span>
                </div>
                {quoteMessage && <p className="text-rose-700">{quoteMessage}</p>}
                <div className="flex justify-between text-sm font-extrabold text-stone-900 pt-2 border-t border-stone-200">
                  <span>Grand Total</span>
                  <span className="text-[#1b3b22]">රු {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 bg-[#1b3b22] hover:bg-[#142d1a] disabled:bg-stone-400 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Confirming Order...' : `Place Order (රු ${total.toLocaleString()})`}</span>
                </button>

                <p className="text-center text-[11px] text-stone-400">
                  By clicking Place Order you agree to Illumea's Terms & Return Policies.
                </p>
              </div>
            </form>
          </div>
        ) : (
          /* Order Success View */
          <div className="p-8 sm:p-12 text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-800">
                Order Received!
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold text-stone-900 mt-1">
                Thank You, {fullName}!
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                Your order <strong className="text-[#1b3b22]">#{orderId}</strong> has been registered. Our team in Kandy will dispatch your package via prompt courier.
              </p>
            </div>

            <div className="bg-[#fbf9f5] p-5 rounded-2xl border border-stone-200 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-stone-500">Order ID:</span>
                <span className="font-mono font-bold text-stone-900">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Delivery Address:</span>
                <span className="font-semibold text-stone-800">{address}, {city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Payment:</span>
                <span className="font-semibold text-stone-800">{paymentMethod.toUpperCase()}</span>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-2 text-sm font-bold">
                <span>Total Due:</span>
                <span className="text-[#1b3b22]">රු {total.toLocaleString()}</span>
              </div>
            </div>

            {/* Direct WhatsApp Confirmation Button */}
            <div className="space-y-2 max-w-md mx-auto pt-2">
              <button
                onClick={sendWhatsAppConfirmation}
                className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send Order to WhatsApp (+94 76 650 3330)</span>
              </button>

              <button
                onClick={handleFinish}
                className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs rounded-xl transition"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
