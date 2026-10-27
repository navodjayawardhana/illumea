import { Fragment } from 'react';
import { Price } from './money';

/**
 * WooCommerce's order-received page (`checkout/thankyou.php` and the order-details templates it
 * pulls in), filled from what the shopper just ordered and the number Vertik gave it.
 *
 * Vertik will not read an order back without the phone number that placed it, so the page is
 * drawn from a receipt kept in this tab when the order went in. Opened anywhere else - a shared
 * link, another browser - it says what WooCommerce says for an order it cannot show: the thank
 * you line and nothing else.
 */
export interface Receipt {
  orderNumber: string;
  placedAt: string;
  email: string;
  subtotal: number;
  deliveryFee: number;
  /** Whether the checkout showed a shipping row, so the receipt matches it. */
  showShipping: boolean;
  total: number;
  paymentTitle: string;
  paymentMethod: string;
  notes: string;
  lines: { name: string; permalink: string; quantity: number; total: number }[];
  billing: { name: string; address1: string; address2: string; city: string; postcode: string; country: string; phone: string; email: string };
}

const RECEIPT_KEY = 'illumea_last_order';

export function saveReceipt(r: Receipt) {
  try {
    sessionStorage.setItem(RECEIPT_KEY, JSON.stringify(r));
  } catch {
    // Without storage the thank-you line still shows; only the summary is lost.
  }
}

function loadReceipt(orderNumber: string): Receipt | null {
  try {
    const r = JSON.parse(sessionStorage.getItem(RECEIPT_KEY) || 'null') as Receipt | null;
    return r && r.orderNumber === orderNumber ? r : null;
  } catch {
    return null;
  }
}

/** WordPress's date format on this site, "October 26, 2026". */
export function wpDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function OrderReceived({ orderNumber }: { orderNumber: string }) {
  const r = loadReceipt(orderNumber);

  if (!r) {
    return (
      <div className="woocommerce">
        <div className="woocommerce-order">
          <p className="woocommerce-notice woocommerce-notice--success woocommerce-thankyou-order-received">Thank you. Your order has been received.</p>
        </div>
      </div>
    );
  }

  const b = r.billing;
  const addressLines = [b.name, b.address1, b.address2, b.city, b.postcode, b.country].filter(Boolean);

  return (
    <div className="woocommerce">
      <div className="woocommerce-order">
        <p className="woocommerce-notice woocommerce-notice--success woocommerce-thankyou-order-received">Thank you. Your order has been received.</p>
        <ul className="woocommerce-order-overview woocommerce-thankyou-order-details order_details">
          <li className="woocommerce-order-overview__order order">
            Order number: <strong>{r.orderNumber}</strong>
          </li>
          <li className="woocommerce-order-overview__date date">
            Date: <strong>{wpDate(r.placedAt)}</strong>
          </li>
          <li className="woocommerce-order-overview__total total">
            Total: <strong><Price value={r.total} /></strong>
          </li>
          <li className="woocommerce-order-overview__payment-method method">
            Payment method: <strong>{r.paymentTitle}</strong>
          </li>
        </ul>
        {r.paymentMethod === 'cod' && <p>Pay with cash upon delivery.</p>}
        <OrderDetails
          lines={r.lines}
          subtotal={r.subtotal}
          shipping={r.showShipping ? r.deliveryFee : null}
          paymentTitle={r.paymentTitle}
          total={r.total}
          note={r.notes}
        />
        <section className="woocommerce-customer-details">
          <h2 className="woocommerce-column__title">Billing address</h2>
          <address>
            {addressLines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </Fragment>
            ))}
            {b.phone && <p className="woocommerce-customer-details--phone">{b.phone}</p>}
            {b.email && <p className="woocommerce-customer-details--email">{b.email}</p>}
          </address>
        </section>
      </div>
    </div>
  );
}

/** `order/order-details.php`: the lines, then Subtotal / Shipping / Payment method / Total. */
export function OrderDetails({
  lines,
  subtotal,
  shipping,
  paymentTitle,
  total,
  note,
}: {
  lines: { name: string; permalink?: string; quantity: number; total: number }[];
  subtotal: number;
  shipping: number | null;
  paymentTitle?: string | null;
  total: number;
  note?: string | null;
}) {
  return (
    <section className="woocommerce-order-details">
      <h2 className="woocommerce-order-details__title">Order details</h2>
      <table className="woocommerce-table woocommerce-table--order-details shop_table order_details">
        <thead>
          <tr>
            <th className="woocommerce-table__product-name product-name">Product</th>
            <th className="woocommerce-table__product-table product-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="woocommerce-table__line-item order_item">
              <td className="woocommerce-table__product-name product-name">
                {l.permalink ? <a href={l.permalink}>{l.name}</a> : l.name} <strong className="product-quantity">&times;&nbsp;{l.quantity}</strong>
              </td>
              <td className="woocommerce-table__product-total product-total">
                <Price value={l.total} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Subtotal:</th>
            <td><Price value={subtotal} /></td>
          </tr>
          {shipping !== null && (
            <tr>
              <th scope="row">Shipping:</th>
              <td>{shipping > 0 ? <><Price value={shipping} />&nbsp;<small className="shipped_via">via Delivery</small></> : 'Free shipping'}</td>
            </tr>
          )}
          {paymentTitle && (
            <tr>
              <th scope="row">Payment method:</th>
              <td>{paymentTitle}</td>
            </tr>
          )}
          <tr>
            <th scope="row">Total:</th>
            <td><Price value={total} /></td>
          </tr>
          {note && (
            <tr>
              <th>Note:</th>
              <td>{note}</td>
            </tr>
          )}
        </tfoot>
      </table>
    </section>
  );
}
