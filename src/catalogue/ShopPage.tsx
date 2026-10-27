import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getCart } from '../commerce/cart';
import { runElementorHandlers } from '../layout/elementor';
import { archiveFor } from '../layout/head';
import { sortProducts, useCatalogue } from './data';
import { esc, shopLoopHtml, ORDERBY_OPTIONS } from './markup';
import { bindLoopAddToCart } from './woo';
import shopTemplate from './html/shop.html?raw';

/**
 * /shop/: Elementor's product-archive template (document 578), as the live shop prints it.
 *
 * The template's three sections are injected verbatim and never re-rendered, so Elementor's
 * entrance animations run once as on a real page load. Only the archive widget's
 * `.woocommerce.columns-4` is ours: the result count, the sort dropdown and the loop, rewritten
 * whenever the catalogue or the chosen order changes.
 *
 * Sorting behaves like WooCommerce's GET form: choosing an order goes to
 * `/shop/?orderby=price&paged=1`, and that URL is what decides the order, so it survives a
 * reload and the back button.
 *
 * The same template is WordPress's category and brand archive (/product-category/skin-care/,
 * /brand/…/): the live pages differ from /shop/ only in the heading, which names the term, and
 * in the loop's add to cart links, which point back at the archive. The grid is the products
 * carrying that term; on the live site every product carries both known terms, so all eleven.
 */
const SHOP_HEADING = '<h1 class="elementor-heading-title elementor-size-default">Shop</h1>';
const staticHtml = (heading: string) => shopTemplate
  .replace('{{SHOP_LOOP}}', '<div class="woocommerce columns-4 "></div>')
  .replace(SHOP_HEADING, `<h1 class="elementor-heading-title elementor-size-default">${esc(heading)}</h1>`);
const VALID = new Set(ORDERBY_OPTIONS.map(([v]) => v));

export function ShopPage() {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get('orderby') ?? 'menu_order';
  const orderby = VALID.has(requested) ? requested : 'menu_order';
  const { pathname } = useLocation();
  const archive = archiveFor(pathname);
  const base = archive ? pathname.replace(/\/*$/, '/') : '/shop/';
  const heading = archive?.name ?? 'Shop';
  const taxonomy = archive?.taxonomy;
  const termSlug = archive?.slug;
  const html = useMemo(() => staticHtml(heading), [heading]);
  const catalogue = useCatalogue();
  const products = useMemo(() => {
    const inArchive = termSlug
      ? catalogue.products.filter((p) => (taxonomy === 'product_brand' ? p.brands : p.categories).some((t) => t.slug === termSlug))
      : catalogue.products;
    return sortProducts(inArchive, orderby);
  }, [catalogue.products, orderby, taxonomy, termSlug]);

  useEffect(() => {
    if (ref.current) runElementorHandlers(ref.current);
  }, []);

  useLayoutEffect(() => {
    const box = ref.current?.querySelector<HTMLElement>('.elementor-element-40a5065 .woocommerce.columns-4');
    if (!box) return;
    // While Vertik is still answering the box stays empty rather than claiming "no products".
    box.innerHTML = catalogue.status === 'loading' ? '' : shopLoopHtml(products, orderby, base);
  }, [products, orderby, base, catalogue.status, html]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const unbind = bindLoopAddToCart(root, (id) => products.find((p) => p.postId === id), (p, q) => getCart().add(p, q));
    const onChange = (e: Event) => {
      const select = e.target as HTMLSelectElement;
      if (!select.matches('select.orderby')) return;
      // Captured on the way down: woocommerce.js may have bound its own handler on the form,
      // which submits it natively and reloads the whole page.
      e.stopPropagation();
      navigate(`${base}?orderby=${encodeURIComponent(select.value)}&paged=1`);
    };
    const onSubmit = (e: Event) => {
      if ((e.target as Element).matches('form.woocommerce-ordering')) e.preventDefault();
    };
    root.addEventListener('change', onChange, true);
    root.addEventListener('submit', onSubmit);
    return () => {
      unbind();
      root.removeEventListener('change', onChange, true);
      root.removeEventListener('submit', onSubmit);
    };
  }, [products, navigate, base]);

  return (
    <div
      ref={ref}
      data-elementor-type="product-archive"
      data-elementor-id="578"
      className="elementor elementor-578 elementor-location-archive product"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default ShopPage;
