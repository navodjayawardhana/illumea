import { useCart } from './cart';

/**
 * The number in the header's cart bubble.
 *
 * The Header Footer Elementor cart widget on the live site is the plain "count only" kind - a
 * link to /cart/ with `span.hfe-cart-count` in it and no dropdown or off-canvas mini cart - so
 * the island is the span's text and nothing else. The span, the link and the bubble's styling
 * stay in the header markup the shell injects. WooCommerce counts items, not lines: two jars of
 * the same cream read 2.
 */
export function MiniCartCount() {
  const { count } = useCart();
  return <>{count}</>;
}
