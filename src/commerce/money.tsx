/**
 * A price exactly as WooCommerce prints one on the live site: the Sinhala rupee sign in its own
 * span, two decimals and comma thousands, all inside `<bdi>` so the sign stays on the left in a
 * right-to-left translation.
 *
 * Every price on the cart, checkout, order-received and account pages goes through here, because
 * `woocommerce.css` styles `.woocommerce-Price-amount` and a price drawn any other way is a price
 * that renders in the wrong weight on one page and not the others.
 */
export const CURRENCY_SYMBOL = 'රු';

export function formatAmount(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Price({ value }: { value: number }) {
  return (
    <span className="woocommerce-Price-amount amount">
      <bdi>
        <span className="woocommerce-Price-currencySymbol" translate="no">{CURRENCY_SYMBOL}</span>
        {formatAmount(value)}
      </bdi>
    </span>
  );
}
