import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './layout/Layout';
import {
  AboutPage, AccountPage, ContactPage, HomePage, PrivacyPage, RefundPage, TermsPage,
} from './pages/StaticPages';
import { ProductPage, ShopPage } from './catalogue';
import { CartPage, CartProvider, CheckoutPage } from './commerce';

/**
 * The live site's URLs. Layout adds the trailing slash WordPress would redirect to. The category
 * and brand archives are the shop template under another heading, as on the live site.
 */
export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop/" element={<ShopPage />} />
            <Route path="/product-category/:term/" element={<ShopPage />} />
            <Route path="/brand/:term/" element={<ShopPage />} />
            <Route path="/product/:slug/" element={<ProductPage />} />
            <Route path="/about-us/" element={<AboutPage />} />
            <Route path="/contact-us/" element={<ContactPage />} />
            <Route path="/cart/" element={<CartPage />} />
            <Route path="/checkout/*" element={<CheckoutPage />} />
            <Route path="/my-account/*" element={<AccountPage />} />
            <Route path="/refund-policy/" element={<RefundPage />} />
            <Route path="/terms-and-conditions/" element={<TermsPage />} />
            <Route path="/privacy-policy-2/" element={<PrivacyPage />} />
            <Route path="*" element={<Navigate replace to="/" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}
