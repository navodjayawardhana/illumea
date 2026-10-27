import { useSyncExternalStore, type ReactNode } from 'react';
import type { CatalogueImage, CatalogueProduct } from '../catalogue/types';

/**
 * The basket, kept in the browser the way WooCommerce keeps it in a session cookie.
 *
 * A module-level store rather than state inside a provider: the header count, the product page's
 * add-to-cart and the cart page are rendered into different places in the document (islands are
 * portals into injected markup), and a store that lives outside the tree answers all of them the
 * same without depending on which of them happens to sit under the provider. `CartProvider` is
 * kept because the shell wraps the app in it and a future server-backed cart would need one.
 *
 * Each line is a snapshot of what the shopper saw when they added it - name, price, picture -
 * so the cart draws instantly on a cold load without waiting for the catalogue. The price in the
 * snapshot is also what checkout sends as `unit_price`; Vertik reprices every line itself and
 * refuses the order with a message naming the product if the two disagree, which is how a stale
 * basket is caught rather than silently charged at a different price.
 *
 * v3: lines now carry the catalogue's WooCommerce-shaped fields (post id, permalink, image sizes).
 * A v2 basket held the old Tailwind site's product objects and is simply not read.
 */
const STORAGE_KEY = 'illumea_cart_v3';

export interface CartThumbnail {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
}

export interface CartItem {
  /** The id an order line needs: the Vertik item id (the WooCommerce id in demo mode). */
  id: string;
  /** WooCommerce's post id when the product exists on the live site, for `data-product_id`. */
  postId: string;
  sku: string;
  name: string;
  permalink: string;
  price: number;
  quantity: number;
  weightGrams: number;
  /** Units on hand when the ERP tracks them; null when it does not. */
  stock: number | null;
  thumbnail: CartThumbnail | null;
}

export interface Cart {
  items: CartItem[];
  count: number;
  subtotal: number;
  weightGrams: number;
  add(product: CatalogueProduct, quantity?: number): void;
  update(id: string, quantity: number): void;
  remove(id: string): void;
  /** Put a removed line back where it was - the "Undo?" link on the cart page. */
  restore(item: CartItem, index: number): void;
  clear(): void;
}

/**
 * The `woocommerce_thumbnail` WordPress would print: the 300x300 crop, and a srcset that lists it
 * first, then the other sizes in the attachment's own metadata order, then the original.
 */
function thumbnailOf(image: CatalogueImage | undefined, name: string): CartThumbnail | null {
  if (!image) return null;
  const thumb = image.sizes.find((s) => s.width === 300 && s.height === 300);
  const src = thumb?.url ?? image.full;
  const width = thumb?.width ?? image.width;
  const height = thumb?.height ?? image.height;
  const ratio = width / height;
  const sameShape = image.sizes.filter((s) => s.url !== src && Math.abs(s.width / s.height - ratio) < 0.01);
  const parts = [`${src} ${width}w`, ...sameShape.map((s) => `${s.url} ${s.width}w`)];
  if (image.full !== src && Math.abs(image.width / image.height - ratio) < 0.01) parts.push(`${image.full} ${image.width}w`);
  return { src, srcSet: parts.join(', '), width, height, alt: image.alt || name };
}

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.id === 'string' && l.quantity > 0) : [];
  } catch {
    return [];
  }
}

let items: CartItem[] = read();
let snapshot: Cart;
const listeners = new Set<() => void>();

function build(): Cart {
  return {
    items,
    count: items.reduce((n, l) => n + l.quantity, 0),
    subtotal: items.reduce((n, l) => n + l.price * l.quantity, 0),
    weightGrams: items.reduce((n, l) => n + (l.weightGrams || 0) * l.quantity, 0),
    add,
    update,
    remove,
    restore,
    clear,
  };
}

function commit(next: CartItem[], persist = true) {
  items = next;
  snapshot = build();
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // A private window with storage blocked still gets a working basket for this visit.
    }
  }
  listeners.forEach((l) => l());
}

/** WooCommerce caps a line at the stock it has when stock is managed; so does this. */
function capped(quantity: number, stock: number | null): number {
  const q = Math.max(0, Math.floor(quantity));
  return stock !== null && stock >= 0 ? Math.min(q, stock) : q;
}

function add(product: CatalogueProduct, quantity = 1) {
  const existing = items.find((l) => l.id === product.id);
  if (existing) {
    commit(items.map((l) => (l.id === product.id ? { ...l, quantity: capped(l.quantity + quantity, product.stock), price: product.price, stock: product.stock } : l)));
    return;
  }
  const q = capped(quantity, product.stock);
  if (q <= 0) return;
  commit([
    ...items,
    {
      id: product.id,
      postId: product.postId,
      sku: product.sku,
      name: product.name,
      permalink: product.permalink,
      price: product.price,
      quantity: q,
      weightGrams: product.weightGrams || 0,
      stock: product.stock,
      thumbnail: thumbnailOf(product.images[0], product.name),
    },
  ]);
}

function update(id: string, quantity: number) {
  if (quantity <= 0) {
    remove(id);
    return;
  }
  commit(items.map((l) => (l.id === id ? { ...l, quantity: capped(quantity, l.stock) || l.quantity } : l)));
}

function remove(id: string) {
  commit(items.filter((l) => l.id !== id));
}

function restore(item: CartItem, index: number) {
  if (items.some((l) => l.id === item.id)) return;
  const next = [...items];
  next.splice(Math.min(index, next.length), 0, item);
  commit(next);
}

function clear() {
  commit([]);
}

snapshot = build();

// Another tab adding to the basket moves this tab's count too, as WooCommerce's fragments do.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) commit(read(), false);
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCart(): Cart {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

/** For code outside React, such as a script handler, that needs the basket once. */
export function getCart(): Cart {
  return snapshot;
}

export function CartProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
