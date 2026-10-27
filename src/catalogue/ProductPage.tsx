import { useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getCart } from '../commerce/cart';
import { runElementorHandlers } from '../layout/elementor';
import { findBySlug, relatedProducts, useCatalogue } from './data';
import { NOT_FOUND_BODY_CLASS, NOT_FOUND_HTML, productBodyClass, productDocClass, productPageHtml } from './markup';
import { loadReviews } from './reviews';
import { applyReviews, bindLoopAddToCart, bindSingleProductForms, initSingleProduct, removePhotoswipeDialog } from './woo';

/**
 * /product/:slug/: Elementor's single product template (document 607) filled with one product.
 *
 * As on the live page, the notices wrapper and the template's own `<div data-elementor-type>`
 * sit directly after the header; React renders both elements and the template's inside is the
 * string markup.ts builds from the captured page. An unknown slug gets Hello Elementor's 404
 * template, which is what WordPress answers for a product that does not exist.
 *
 * The layout sets the captured product page's head and body class on every /product/ route;
 * only `postid-` differs between products, so this page swaps that one class, and puts it back
 * when it leaves, because the layout keeps any class it does not recognise as script-added.
 */
const SITE = 'ILLUMEA SKIN CARE';

function useBodyClass(classes: string | null) {
  useEffect(() => {
    if (!classes) return;
    const mine = classes.split(/\s+/);
    const body = document.body.classList;
    const previous = Array.from(body).filter((c) => /^postid-/.test(c));
    previous.forEach((c) => body.remove(c));
    const added = mine.filter((c) => !body.contains(c));
    added.forEach((c) => body.add(c));
    return () => added.forEach((c) => body.remove(c));
  }, [classes]);
}

export function ProductPage() {
  const { slug = '' } = useParams();
  const catalogue = useCatalogue();
  const product = useMemo(() => findBySlug(catalogue.products, slug), [catalogue.products, slug]);
  const related = useMemo(() => (product ? relatedProducts(catalogue.products, product) : []), [catalogue.products, product]);
  const html = useMemo(() => (product ? productPageHtml(product, related) : ''), [product, related]);
  const notFound = catalogue.status !== 'loading' && !product;

  const docRef = useRef<HTMLDivElement>(null);
  const noticesRef = useRef<HTMLDivElement>(null);

  useBodyClass(product ? postIdClass(productBodyClass(product)) : null);

  useEffect(() => {
    if (!notFound) return;
    const body = document.body;
    const before = body.className;
    body.className = NOT_FOUND_BODY_CLASS;
    const title = document.title;
    document.title = `404 - Page not found - ${SITE}`;
    return () => {
      // Only undo it if nothing has replaced it since (the layout does on the next route).
      if (body.className === NOT_FOUND_BODY_CLASS) body.className = before;
      // The layout keeps classes no captured page has, and no captured page has this one.
      else body.classList.remove('error404');
      if (document.title === `404 - Page not found - ${SITE}`) document.title = title;
    };
  }, [notFound]);

  useEffect(() => removePhotoswipeDialog, []);

  useEffect(() => {
    if (product) document.title = `${product.name} – ${SITE}`;
  }, [product]);

  useEffect(() => {
    const root = docRef.current;
    const notices = noticesRef.current;
    if (!root || !notices || !product) return;
    notices.innerHTML = '';
    runElementorHandlers(root);
    initSingleProduct(root);
    const add = (p: typeof product, q: number) => getCart().add(p, q);
    const offLoop = bindLoopAddToCart(root, (id) => related.find((p) => p.postId === id), add);
    const offForms = bindSingleProductForms(root, notices, product, add);
    return () => {
      offLoop();
      offForms();
    };
  }, [html, product, related]);

  useEffect(() => {
    const root = docRef.current;
    if (!root || !product) return;
    let live = true;
    // A failed fetch leaves the page as rendered, "There are no reviews yet.", rather than an error in a tab.
    loadReviews(product)
      .then((reviews) => {
        if (live && reviews.length) applyReviews(root, product, reviews);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [html, product]);

  if (notFound) return <main id="content" className="site-main" dangerouslySetInnerHTML={{ __html: NOT_FOUND_HTML }} />;
  if (!product) return null;

  return (
    <>
      <div ref={noticesRef} className="woocommerce-notices-wrapper" />
      <div
        key={product.slug}
        ref={docRef}
        data-elementor-type="product"
        data-elementor-id="607"
        className={productDocClass(product)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}

function postIdClass(bodyClass: string) {
  return bodyClass.split(/\s+/).filter((c) => c.startsWith('postid-')).join(' ');
}

export default ProductPage;
