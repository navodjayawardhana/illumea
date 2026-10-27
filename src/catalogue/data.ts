import { useSyncExternalStore } from 'react';
import { api, type ShopProduct } from '../services/api';
import type { CatalogueProduct, CatalogueImage } from './types';
import wooCatalogue from './woo-catalogue.json';

/**
 * Where the catalogue's products come from.
 *
 * Selling runs on Vertik: price, stock, picture and the id an order line needs come from the ERP.
 * The ERP has no products yet, so `VITE_DEMO_PRODUCTS=1` swaps in the live WooCommerce store's
 * own eleven products (a trimmed Store API dump, woo-catalogue.json) and the site looks exactly
 * like illumea.lk during development and visual QA. Both sources end in the same
 * CatalogueProduct, and nothing downstream knows which one it got.
 *
 * Product URLs keep the live site's slugs, because they are already indexed and shared: an ERP
 * product takes the WooCommerce slug of the live product with the same name, and only a product
 * the live site never had falls back to Vertik's own slug.
 */

type WooEntry = (typeof wooCatalogue)[number];

export const DEMO = import.meta.env.VITE_DEMO_PRODUCTS === '1';

/*
 * WooCommerce picks related products at random on every page load. The two products whose live
 * pages were captured get the picks the reference screenshots show, so visual QA compares like
 * with like; every other product gets a stable pick (see relatedProducts).
 */
const CAPTURED_RELATED: Record<string, string[]> = {
  '934': ['930', '564', '549', '506'],
  '497': ['930', '564', '554', '531'],
};

function fromWoo(w: WooEntry, rank: number): CatalogueProduct {
  return {
    id: String(w.id),
    postId: String(w.id),
    slug: w.slug,
    vertikSlug: w.slug,
    name: w.name,
    permalink: `/product/${w.slug}/`,
    price: w.price,
    regularPrice: w.regularPrice,
    onSale: w.onSale,
    shortDescription: w.shortDescription,
    description: w.description,
    images: w.images.map((i) => ({ full: i.full, width: i.width, height: i.height, alt: i.alt, sizes: i.sizes })),
    categories: w.categories,
    brands: w.brands,
    averageRating: w.averageRating,
    reviewCount: w.reviewCount,
    reviews: w.reviews,
    inStock: w.inStock,
    stock: null,
    sku: w.sku,
    weightGrams: 0,
    createdRank: rank,
  };
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/* "Illumea Face Wash 100ml" and "Illumea Face Wash" are the same product to a person. */
const withoutSize = (s: string) => normalise(s).replace(/\b\d+\s*(ml|g|gm|l|kg)\b/g, '').replace(/\s+/g, ' ').trim();

function wooTwin(name: string): WooEntry | undefined {
  return wooCatalogue.find((w) => normalise(w.name) === normalise(name))
    ?? wooCatalogue.find((w) => withoutSize(w.name) === withoutSize(name));
}

function erpImage(url: string, alt: string): CatalogueImage {
  return { full: url, width: 0, height: 0, alt, sizes: [] };
}

function fromVertik(p: ShopProduct, rank: number): CatalogueProduct {
  const twin = wooTwin(p.name);
  const base = twin ? fromWoo(twin, rank) : null;
  const pictures = p.images.length ? p.images : p.image ? [p.image] : [];
  const was = p.was !== null && p.was > p.price ? p.was : null;
  const slug = base?.slug ?? p.slug;
  return {
    id: p.id,
    postId: base?.postId ?? p.id,
    slug,
    vertikSlug: p.slug,
    name: p.name,
    permalink: `/product/${slug}/`,
    price: p.price,
    regularPrice: was ?? p.price,
    onSale: was !== null,
    // The ERP keeps one description. It is the long one; the live site's short blurb stays.
    shortDescription: base?.shortDescription ?? '',
    description: p.description || base?.description || '',
    images: pictures.length ? pictures.map((u) => erpImage(u, '')) : base?.images ?? [],
    categories: p.categories.length ? p.categories : base?.categories ?? [],
    brands: base?.brands ?? [],
    averageRating: p.rating ?? base?.averageRating ?? 0,
    reviewCount: p.reviews,
    reviews: [],
    inStock: p.in_stock,
    stock: p.stock,
    sku: '',
    weightGrams: p.weight_grams || 0,
    createdRank: rank,
  };
}

type State =
  | { status: 'loading'; products: CatalogueProduct[]; error: null }
  | { status: 'ready'; products: CatalogueProduct[]; error: null }
  | { status: 'error'; products: CatalogueProduct[]; error: string };

let state: State = DEMO
  ? { status: 'ready', products: wooCatalogue.map(fromWoo), error: null }
  : { status: 'loading', products: [], error: null };
const listeners = new Set<() => void>();
let started = DEMO;

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function load() {
  if (started) return;
  started = true;
  api.getShopProducts()
    .then((list) => set({ status: 'ready', products: list.map(fromVertik), error: null }))
    .catch((e: unknown) => set({ status: 'error', products: [], error: e instanceof Error ? e.message : String(e) }));
}

function subscribe(l: () => void) {
  listeners.add(l);
  load();
  return () => listeners.delete(l);
}

/** The whole catalogue. Synchronous and already `ready` in demo mode; fetched once otherwise. */
export function useCatalogue(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Loads the catalogue outside React, for code that needs a product by id (the cart, checkout). */
export function getCatalogue(): Promise<CatalogueProduct[]> {
  if (state.status === 'ready') return Promise.resolve(state.products);
  return new Promise((resolve, reject) => {
    const off = subscribe(() => {
      if (state.status === 'loading') return;
      off();
      if (state.status === 'ready') resolve(state.products);
      else reject(new Error(state.error));
    });
  });
}

export function findBySlug(products: CatalogueProduct[], slug: string): CatalogueProduct | undefined {
  return products.find((p) => p.slug === slug);
}

/** WooCommerce's default shop order: `menu_order` (all 0 on the live site), then title. */
export function byMenuOrder(a: CatalogueProduct, b: CatalogueProduct) {
  return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
}

export function sortProducts(products: CatalogueProduct[], orderby: string): CatalogueProduct[] {
  const list = [...products];
  switch (orderby) {
    case 'popularity': return list.sort((a, b) => b.reviewCount - a.reviewCount || a.createdRank - b.createdRank);
    case 'rating': return list.sort((a, b) => b.averageRating - a.averageRating || a.createdRank - b.createdRank);
    case 'date': return list.sort((a, b) => a.createdRank - b.createdRank);
    case 'price': return list.sort((a, b) => a.price - b.price || byMenuOrder(a, b));
    case 'price-desc': return list.sort((a, b) => b.price - a.price || byMenuOrder(a, b));
    default: return list.sort(byMenuOrder);
  }
}

/**
 * Four other products, as the live related-products widget shows. WooCommerce draws them at
 * random from the same category; a stable pick seeded by the product keeps a page from
 * reshuffling every time React renders it.
 */
export function relatedProducts(products: CatalogueProduct[], product: CatalogueProduct, limit = 4): CatalogueProduct[] {
  const captured = DEMO ? CAPTURED_RELATED[product.postId] : undefined;
  if (captured) {
    const picked = captured.map((id) => products.find((p) => p.postId === id)).filter((p): p is CatalogueProduct => !!p);
    if (picked.length === captured.length) return picked;
  }
  const cats = new Set(product.categories.map((c) => c.slug));
  const pool = products.filter((p) => p.id !== product.id && (cats.size === 0 || p.categories.some((c) => cats.has(c.slug))));
  let seed = [...product.slug].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  return pool
    .map((p) => ({ p, k: rand() }))
    .sort((a, b) => a.k - b.k)
    .slice(0, limit)
    .map((x) => x.p);
}
