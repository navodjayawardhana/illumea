import { useEffect, useMemo, useRef } from 'react';
import { getCart } from '../commerce/cart';
import { sortProducts, useCatalogue } from './data';
import { loopItemsHtml, premiumGridItemsHtml } from './markup';
import type { CatalogueProduct } from './types';
import { bindLoopAddToCart } from './woo';

/**
 * A WooCommerce product loop: the `<ul class="products">` and its cards, nothing around it.
 *
 * Two looks exist on the live site and both are here. The shop and related products use
 * WooCommerce's own content-product.php through Elementor (`ul.products.elementor-grid`); the
 * home page's grid is the Premium Addons products widget, skin "grid 6", which prints its own
 * card markup. Which one is drawn follows `skin`.
 *
 * Used two ways. As a component: `<ProductLoop products={…} columns={4} />`. As an island in
 * injected markup: `data-react="ProductLoop"` with `data-query` (`latest` | `menu_order`),
 * `data-limit`, `data-columns` and `data-skin` (`premium-grid-6` | `woo`) on the host, which
 * mountIslands passes through as `dataset`; it then picks its own products from the catalogue.
 * The host is the element whose child the `<ul>` is on the live page, so there is no wrapper.
 */
export interface ProductLoopProps {
  products?: CatalogueProduct[];
  columns?: number | string;
  skin?: 'woo' | 'premium-grid-6';
  /** Where the loop's add to cart links point on the live page, e.g. `/shop/`. */
  addToCartBase?: string;
  dataset?: Record<string, string | undefined>;
}

export function ProductLoop({ products, columns, skin, addToCartBase, dataset }: ProductLoopProps) {
  const catalogue = useCatalogue();
  const cols = Number(columns ?? dataset?.columns ?? 4) || 4;
  const look = skin ?? (dataset?.skin === 'premium-grid-6' ? 'premium-grid-6' : 'woo');

  const list = useMemo(() => {
    if (products) return products;
    const query = dataset?.query ?? 'menu_order';
    const sorted = sortProducts(catalogue.products, query === 'latest' ? 'date' : query);
    const limit = Number(dataset?.limit ?? 0);
    return limit > 0 ? sorted.slice(0, limit) : sorted;
  }, [products, catalogue.products, dataset?.query, dataset?.limit]);

  const html = useMemo(
    () => (look === 'premium-grid-6'
      ? premiumGridItemsHtml(list, cols)
      : loopItemsHtml(list, { columns: cols, addToCartBase: addToCartBase ?? '/shop/', eagerCount: 2 })),
    [look, list, cols, addToCartBase],
  );

  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return bindLoopAddToCart(el, (id) => list.find((p) => p.postId === id), (p, q) => getCart().add(p, q));
  }, [list]);

  const className = look === 'premium-grid-6' ? `products columns-${cols}` : `products elementor-grid columns-${cols}`;
  return <ul ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default ProductLoop;
