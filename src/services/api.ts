import { CONTENT } from '../data/products';
import type { Product } from '../data/products';

/**
 * The shop runs on Vertik ERP: products, prices, stock, delivery charges, orders and contact
 * messages all live in Dr. Malalasekara's Vertik account, and this site only reads and writes
 * them through Vertik's public shop API. There is no backend of our own any more.
 *
 * Point VITE_VERTIK_API at another installation to test against it.
 */
const API_BASE_URL = (import.meta.env.VITE_VERTIK_API || 'https://dr-malalasekara.vertikworkspace.com/api/shop/v1').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    });
  } catch {
    throw new ApiError('We could not reach the shop. Please check your connection and try again.', 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // Vertik explains refusals in plain words (out of stock, price changed, missing field).
    const firstError = body?.errors ? Object.values(body.errors as Record<string, string[]>)[0]?.[0] : null;
    throw new ApiError(firstError || body?.message || 'Something went wrong. Please try again.', res.status);
  }
  return body as T;
}

interface ShopProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  was: number | null;
  image: string | null;
  images: string[];
  in_stock: boolean;
  stock: number;
  weight_grams: number;
  is_featured: boolean;
  rating: number | null;
  reviews: number;
  categories: { name: string; slug: string }[];
  meta?: { title: string | null; description: string | null };
  units?: { label?: string; name?: string }[];
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * One ERP product as a card. Price, stock, picture and the id the order needs always come from
 * Vertik; the long copy (benefits, ingredients, how to use) comes from the site's own content
 * when a product of the same name exists there, because the ERP holds one description only.
 */
function toProduct(p: ShopProduct): Product {
  const content = CONTENT.find((c) => normalise(c.name) === normalise(p.name));
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: p.meta?.description || content?.subtitle || '',
    category: p.categories[0]?.name || content?.category || 'Products',
    price: p.price,
    originalPrice: p.was ?? undefined,
    rating: p.rating ?? content?.rating ?? 5,
    reviewCount: p.reviews || content?.reviewCount || 0,
    image: p.image || p.images[0] || content?.image || '/images/placeholder.jpg',
    size: content?.size || p.units?.[0]?.label || '',
    tag: p.is_featured ? 'Featured' : content?.tag,
    isDiscount: p.was !== null && p.was > p.price,
    isBestSeller: p.is_featured || content?.isBestSeller,
    description: p.description || content?.description || '',
    benefits: content?.benefits || [],
    ingredients: content?.ingredients || [],
    usage: content?.usage || '',
    inStock: p.in_stock,
    stock: p.stock,
    weightGrams: p.weight_grams || 0,
  };
}

export interface OrderPayload {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  paymentMethod: 'cod' | 'bank_transfer';
  notes?: string;
  deliveryFee: number | null;
  items: { itemId: string; quantity: number; unitPrice: number }[];
}

export interface PlacedOrder {
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
}

export interface ShippingQuote {
  deliverable: boolean;
  zone?: string;
  fee: number | null;
  free: boolean;
  free_above: number | null;
  message: string;
}

export const api = {
  async getProducts(): Promise<Product[]> {
    const all: Product[] = [];
    for (let page = 1; page <= 20; page++) {
      const res = await request<{ products: ShopProduct[]; meta: { pages: number } }>(`/products?per_page=100&page=${page}`);
      all.push(...res.products.map(toProduct));
      if (page >= res.meta.pages) break;
    }
    return all;
  },

  async getShippingQuote(city: string, weightGrams: number, subtotal: number): Promise<ShippingQuote> {
    const q = new URLSearchParams({ city, weight_grams: String(weightGrams), subtotal: String(subtotal) });
    return request(`/shipping/quote?${q}`);
  },

  /** Vertik prices every line itself and refuses the order if a shown price is out of date. */
  async createOrder(o: OrderPayload): Promise<PlacedOrder> {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        name: o.name,
        phone: o.phone,
        email: o.email || null,
        fulfilment: 'delivery',
        address: o.address,
        city: o.city,
        payment_method: o.paymentMethod,
        notes: o.notes || null,
        delivery_fee: o.deliveryFee,
        items: o.items.map((i) => ({ item_id: i.itemId, quantity: i.quantity, unit_price: i.unitPrice })),
      }),
    });
  },

  async submitContact(data: { name: string; phone: string; email?: string; subject?: string; message: string }) {
    return request<{ reference: string; message: string }>('/enquiries', {
      method: 'POST',
      // `website` is Vertik's honeypot: left empty by people, filled in by bots.
      body: JSON.stringify({ kind: 'contact', ...data, source: 'illumea website', website: '' }),
    });
  },

  /** Vertik keeps no mailing list, so a signup arrives as a contact message in the ERP. */
  async subscribeNewsletter(email: string, phone: string) {
    return request<{ reference: string; message: string }>('/enquiries', {
      method: 'POST',
      body: JSON.stringify({ kind: 'contact', name: email, phone, email, subject: 'Newsletter signup', source: 'illumea website', website: '' }),
    });
  },
};
