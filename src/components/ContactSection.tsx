import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export const ContactSection: React.FC = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Arrives in Vertik's Enquiries, where the team answers it.
      await api.submitContact({ name, phone, email: email || undefined, subject, message });
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleWhatsAppSend = () => {
    const text = encodeURIComponent(
      `Hello Illumea Skincare!\n\n*Name:* ${name || 'Customer'}\n*Phone:* ${phone}\n*Subject:* ${subject || 'General Inquiry'}\n*Message:* ${message}\n\nPlease get back to me.`
    );
    window.open(`https://wa.me/94766503330?text=${text}`, '_blank');
  };

  return (
    <section className="py-16 sm:py-24 bg-[#faf9f6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest">
            We are here to help
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-stone-900">
            Contact Illumea Skin Care
          </h1>
          <p className="text-stone-600 text-xs sm:text-sm">
            Have a question about our herbal ingredients, shipping, or want a personalized skincare recommendation? Reach out to our team in Kandy.
          </p>
        </div>

        {/* 2-Column Info & Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Contact Cards */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
              <h3 className="font-serif-title text-xl font-bold text-stone-900">
                Customer Support Hub
              </h3>
              
              <div className="space-y-4 text-xs sm:text-sm text-stone-600">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-stone-900">Registered Office:</strong>
                    <span>783 / William Gopallawa Mawatha, Kandy, Sri Lanka</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-stone-900">Hotline & WhatsApp:</strong>
                    <a href="tel:+94766503330" className="hover:text-emerald-700 font-semibold block">
                      +94 76 650 3330
                    </a>
                    <a href="tel:0766503330" className="text-stone-500">
                      076 650 3330
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-stone-900">Email Inquiries:</strong>
                    <a href="mailto:info@illumea.com" className="hover:text-emerald-700 block">
                      info@illumea.com
                    </a>
                    <a href="mailto:illumeaplus@gmail.com" className="text-stone-500">
                      illumeaplus@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-stone-900">Opening Hours:</strong>
                    <span>Monday – Saturday: 9:00 AM – 6:00 PM</span>
                    <span className="block text-stone-400 text-[11px]">(Closed on Sundays & Poya Days)</span>
                  </div>
                </div>
              </div>

              {/* Direct WhatsApp Action */}
              <div className="pt-2">
                <a
                  href="https://wa.me/94766503330?text=Hello%20Illumea%2C%20I%20have%20an%20inquiry"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat with an Expert on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Google Map Mockup */}
            <div className="bg-white rounded-3xl p-2 border border-stone-200/80 shadow-xs overflow-hidden">
              <iframe
                title="Illumea Kandy Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15830.41319230522!2d80.6186!3d7.2882!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae3662d5f8c3735%3A0x6b107e33558f6236!2sWilliam%20Gopallawa%20Mawatha%2C%20Kandy!5e0!3m2!1sen!2slk!4v1700000000000!5m2!1sen!2slk"
                width="100%"
                height="220"
                style={{ border: 0, borderRadius: '1.25rem' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7 bg-white p-7 sm:p-10 rounded-3xl border border-stone-200/80 shadow-xs">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h3 className="font-serif-title text-2xl font-bold text-stone-900">
                    Send Us a Message
                  </h3>
                  <p className="text-xs text-stone-500">
                    Fill out the form below and our skincare advisors will reply within 24 hours.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kasun Fernando"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 076 650 3330"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Question about Pigment Cure Cream"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Your Message *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tell us about your skin concern or product inquiry..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3 bg-[#1b3b22] hover:bg-[#142d1a] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleWhatsAppSend}
                    className="w-full sm:w-auto px-6 py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Send via WhatsApp</span>
                  </button>
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
              </form>
            ) : (
              <div className="text-center py-12 space-y-4 animate-fade-in">
                <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
                <h3 className="text-2xl font-serif-title font-bold text-stone-900">
                  Message Sent Successfully!
                </h3>
                <p className="text-xs text-stone-600 max-w-sm mx-auto">
                  Thank you for reaching out, {name || 'dear customer'}. Our team will review your message and contact you via phone or WhatsApp promptly.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                  }}
                  className="px-6 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-full"
                >
                  Send Another Message
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
