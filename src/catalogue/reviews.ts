import { api, ApiError, type ShopReview } from '../services/api';
import { DEMO } from './data';
import { esc, paragraphs } from './markup';
import type { CatalogueProduct, CatalogueReview } from './types';

/**
 * Where a product's reviews come from and go to.
 *
 * They live in Vertik, not WordPress: the list is what the shop has approved, and a new one is
 * proved by an order number and the phone that placed it, then waits for staff to publish it.
 * Under `VITE_DEMO_PRODUCTS=1` nothing leaves the browser, because the demo catalogue is the
 * WooCommerce store's and a test review must never reach the live client's ERP: the list is the
 * product's captured comments, and a submit is answered here.
 */

const DEMO_SAMPLE: ShopReview[] = [
  { id: 'demo-1', name: 'Nimali P.', rating: 5, title: 'Lovely', body: 'Skin feels softer after a week.\n\nWill order again.', verified: true, reply: 'Thank you Nimali, we are glad it works for you.', date: '2026-09-02T08:30:00+05:30' },
  { id: 'demo-2', name: 'Kasun D.', rating: 4, title: null, body: 'Good value.', verified: true, reply: null, date: '2026-08-21T14:05:00+05:30' },
];

const dateText = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

function toCatalogueReview(r: ShopReview): CatalogueReview {
  const title = r.title ? `<p><strong>${esc(r.title)}</strong></p>\n` : '';
  return {
    id: r.id,
    author: r.name,
    rating: r.rating,
    date: r.date ?? '',
    dateText: dateText(r.date),
    html: `${title}${r.body ? paragraphs(r.body) : ''}`,
    reply: r.reply ?? undefined,
  };
}

export async function loadReviews(product: CatalogueProduct): Promise<CatalogueReview[]> {
  if (DEMO) {
    // `?demo-reviews` is for looking at the populated list without a real review existing.
    return new URLSearchParams(window.location.search).has('demo-reviews')
      ? DEMO_SAMPLE.map(toCatalogueReview)
      : product.reviews;
  }
  return (await api.getProductReviews(product.vertikSlug)).map(toCatalogueReview);
}

export interface ReviewForm {
  order_number: string;
  phone: string;
  rating: number;
  body: string;
}

/** Resolves to the message Vertik answers with; rejects with an ApiError carrying its refusal. */
export async function submitReview(product: CatalogueProduct, form: ReviewForm): Promise<string> {
  if (DEMO) {
    await new Promise((r) => setTimeout(r, 300));
    // Order number 0000 plays Vertik's 404 so the error notice can be seen without a network.
    if (form.order_number.trim() === '0000') {
      throw new ApiError('We could not find that order. Please check the order number and the phone number you used.', 404);
    }
    return 'Thank you - your review has been sent. It will appear here after the shop checks it.';
  }
  return (await api.submitProductReview(product.vertikSlug, form)).message;
}
