import { ProductLoop } from '../catalogue';
import { ContactForm, MiniCartCount, MyAccount, NewsletterForm } from '../commerce';
import type { IslandRegistry } from './islands';

/** Every `data-react` name used in the injected markup, and the component that fills it. */
export const ISLANDS: IslandRegistry = {
  ProductLoop,
  MiniCartCount,
  NewsletterForm,
  ContactForm,
  MyAccount,
};
