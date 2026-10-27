import HtmlPage from '../layout/HtmlPage';
import home from './html/home.html?raw';
import about from './html/about-us.html?raw';
import contact from './html/contact-us.html?raw';
import refund from './html/refund-policy.html?raw';
import terms from './html/terms-and-conditions.html?raw';
import privacy from './html/privacy-policy-2.html?raw';
import account from './html/my-account.html?raw';

export const HomePage = () => <HtmlPage key="home" page="home" html={home} />;
export const AboutPage = () => <HtmlPage key="about" page="about" html={about} />;
export const ContactPage = () => <HtmlPage key="contact" page="contact" html={contact} />;
export const RefundPage = () => <HtmlPage key="refund" page="refund" html={refund} />;
export const TermsPage = () => <HtmlPage key="terms" page="terms" html={terms} />;
export const PrivacyPage = () => <HtmlPage key="privacy" page="privacy" html={privacy} />;
export const AccountPage = () => <HtmlPage key="account" page="account" html={account} />;
