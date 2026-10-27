import { useSyncExternalStore } from 'react';
import { api, ApiError, type OrderPayload, type PlacedOrder } from '../services/api';

/**
 * The parts of Vertik's shop API the commerce pages need beyond what `services/api.ts` already
 * wraps: which payment methods the business has set up, whether it prices delivery at all, the
 * shopper's account, and placing an order as that account.
 *
 * Same base address as `services/api.ts`, read from the same variable, so pointing
 * `VITE_VERTIK_API` at a test installation moves every call together.
 */
const BASE = (import.meta.env.VITE_VERTIK_API || 'https://dr-malalasekara.vertikworkspace.com/api/shop/v1').replace(/\/$/, '');

async function call<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...rest.headers,
      },
    });
  } catch {
    throw new ApiError('We could not reach the shop. Please check your connection and try again.', 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const firstError = body?.errors ? Object.values(body.errors as Record<string, string[]>)[0]?.[0] : null;
    throw new ApiError(firstError || body?.message || 'Something went wrong. Please try again.', res.status);
  }
  return body as T;
}

export interface PaymentGateway {
  name: string;
  instalments: { count: number; label: string } | null;
}

/**
 * Cash on delivery always; a card gateway only once the business has configured one. A
 * failure to ask is answered as "cash only" - a checkout that cannot be paid by card is still a
 * checkout, and one that draws a card button which leads nowhere is not.
 */
export async function getPaymentGateways(): Promise<PaymentGateway[]> {
  try {
    const res = await call<{ gateways: PaymentGateway[] }>('/payments');
    return Array.isArray(res.gateways) ? res.gateways : [];
  } catch {
    return [];
  }
}

/**
 * Whether the business prices delivery at all. With no delivery areas set up every quote comes
 * back "we do not deliver there", which on this site would refuse every order; the live
 * WooCommerce checkout has no shipping row either, so no areas means no shipping row and the
 * order goes in without a fee for the business to add, exactly as it does today.
 */
export async function hasShippingAreas(): Promise<boolean> {
  try {
    const res = await call<unknown[] | { areas?: unknown[]; data?: unknown[] }>('/shipping/areas');
    const list = Array.isArray(res) ? res : (res.areas ?? res.data ?? []);
    return list.length > 0;
  } catch {
    return false;
  }
}

/**
 * Place an order. A guest goes through `api.createOrder`, the one place the order body is
 * built; a signed-in shopper sends the same body with their token so the order lands on their
 * account and shows under My account > Orders - Vertik attaches an order to an account only
 * when the request carries that account's token.
 *
 * Vertik's public `POST /orders` route does not yet run the Sanctum guard, so today it files a
 * signed-in order under the phone number like a guest's and the account's order list stays
 * empty. The token is sent regardless, so the day the route reads it nothing here changes.
 */
export async function placeOrder(order: OrderPayload, token: string | null): Promise<PlacedOrder> {
  if (!token) return api.createOrder(order);
  return call<PlacedOrder>('/orders', {
    method: 'POST',
    token,
    body: JSON.stringify({
      name: order.name,
      phone: order.phone,
      email: order.email || null,
      fulfilment: 'delivery',
      address: order.address,
      city: order.city,
      payment_method: order.paymentMethod,
      notes: order.notes || null,
      delivery_fee: order.deliveryFee,
      items: order.items.map((i) => ({ item_id: i.itemId, quantity: i.quantity, unit_price: i.unitPrice })),
    }),
  });
}

/** A card or instalment gateway: Vertik freezes the checkout and returns a form to post on. */
export async function startGatewayPayment(gateway: string, order: OrderPayload, token: string | null) {
  const res = await call<{ url: string; method?: string; fields: Record<string, string> }>(`/payments/${encodeURIComponent(gateway)}/start`, {
    method: 'POST',
    token,
    body: JSON.stringify({
      name: order.name,
      phone: order.phone,
      email: order.email || null,
      fulfilment: 'delivery',
      address: order.address,
      city: order.city,
      notes: order.notes || null,
      delivery_fee: order.deliveryFee,
      items: order.items.map((i) => ({ item_id: i.itemId, quantity: i.quantity, unit_price: i.unitPrice })),
    }),
  });
  const form = Object.assign(document.createElement('form'), { action: res.url, method: res.method || 'POST' });
  for (const [name, value] of Object.entries(res.fields)) {
    form.append(Object.assign(document.createElement('input'), { type: 'hidden', name, value }));
  }
  document.body.append(form);
  form.submit();
}

/* ------------------------------------------------------------------ the shopper's account */

export interface ShopCustomer {
  name: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
}

export interface AccountOrderSummary {
  order_number: string;
  status: string;
  placed_at: string | null;
  paid: boolean;
  total: number;
  items: number;
}

export interface AccountOrderLine {
  name: string;
  quantity: number;
  price: number;
  total?: number;
}

export interface AccountOrder {
  order_number: string;
  status: string;
  placed_at: string | null;
  paid?: boolean;
  subtotal?: number;
  delivery_fee?: number;
  total: number;
  payment_method?: string | null;
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  items: AccountOrderLine[];
}

interface Session {
  token: string;
  customer: ShopCustomer;
}

/**
 * The signed-in shopper. WooCommerce's "Remember me" decides whether the login outlives the
 * browser session, so a remembered login goes to localStorage and any other to sessionStorage.
 */
const SESSION_KEY = 'illumea_account_v1';

function readSession(): Session | null {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Storage blocked: nobody is signed in.
    }
  }
  return null;
}

let session: Session | null = readSession();
const sessionListeners = new Set<() => void>();

function setSession(next: Session | null, remember = true) {
  session = next;
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (next) (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // Signed in for this page view only.
  }
  sessionListeners.forEach((l) => l());
}

export function useSession(): Session | null {
  return useSyncExternalStore(
    (l) => {
      sessionListeners.add(l);
      return () => sessionListeners.delete(l);
    },
    () => session,
    () => session,
  );
}

export function getSession(): Session | null {
  return session;
}

export async function login(email: string, password: string, remember: boolean): Promise<Session> {
  const res = await call<Session>('/account/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setSession(res, remember);
  return res;
}

export async function logout(): Promise<void> {
  const token = session?.token;
  setSession(null);
  if (token) await call('/account/logout', { method: 'POST', token }).catch(() => undefined);
}

/** A 401 means the token was revoked or expired: sign out here too rather than show an error. */
async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!session) throw new ApiError('Please log in.', 401);
  try {
    return await call<T>(path, { ...init, token: session.token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) setSession(null);
    throw e;
  }
}

export async function refreshAccount(): Promise<ShopCustomer> {
  const res = await authed<{ customer: ShopCustomer }>('/account');
  if (session) setSession({ ...session, customer: res.customer }, !!localStorage.getItem(SESSION_KEY));
  return res.customer;
}

export async function updateAccount(data: Partial<Pick<ShopCustomer, 'name' | 'phone' | 'address' | 'city'>>): Promise<ShopCustomer> {
  const res = await authed<{ customer: ShopCustomer }>('/account', { method: 'PUT', body: JSON.stringify(data) });
  if (session) setSession({ ...session, customer: res.customer }, !!localStorage.getItem(SESSION_KEY));
  return res.customer;
}

export function accountOrders(page: number) {
  return authed<{ orders: AccountOrderSummary[]; meta: { page: number; total: number; pages: number } }>(`/account/orders?page=${page}&per_page=10`);
}

export async function accountOrder(orderNumber: string): Promise<AccountOrder> {
  const res = await authed<{ order: AccountOrder }>(`/account/orders/${encodeURIComponent(orderNumber)}`);
  return res.order;
}
