import { loadScript } from '../layout/elementor';
import { addedNoticeHtml, commentsHtml, esc, replyTitleHtml, tabTitleLabel } from './markup';
import { submitReview } from './reviews';
import type { CatalogueProduct, CatalogueReview } from './types';
import photoswipeHtml from './html/photoswipe.html?raw';

/**
 * WooCommerce's own front-end behaviour, borrowed rather than rewritten.
 *
 * The single product page's gallery (zoom on hover, the full-screen PhotoSwipe viewer) and its
 * description/reviews tabs are WooCommerce's single-product.js, loaded from the same mirrored
 * files with the same inline config the live page prints. That script initialises once on
 * document ready; a client-side route arrives later, so `initSingleProduct` repeats exactly what
 * its ready handler does for the freshly rendered product.
 *
 * Add to cart is the one thing done here by hand: the live buttons post to WordPress, which
 * does not exist any more. The handlers below put the product in the Vertik cart (A3's useCart)
 * and then leave the button and the page in the state WooCommerce's add-to-cart.js would.
 */

declare global {
  interface Window {
    jQuery?: JQueryLike;
    wc_single_product_params?: unknown;
  }
}

type JQueryLike = ((sel: unknown) => {
  each(fn: (this: Element) => void): unknown;
  trigger(name: string, args?: unknown[]): unknown;
  wc_product_gallery?: (params: unknown) => unknown;
}) & { fn?: Record<string, unknown> };

const SINGLE_PRODUCT_PARAMS = {"i18n_required_rating_text":"Please select a rating","i18n_rating_options":["1 of 5 stars","2 of 5 stars","3 of 5 stars","4 of 5 stars","5 of 5 stars"],"i18n_product_gallery_trigger_text":"View full-screen image gallery","review_rating_required":"yes","flexslider":{"rtl":false,"animation":"slide","smoothHeight":true,"directionNav":false,"controlNav":"thumbnails","slideshow":false,"animationSpeed":500,"animationLoop":false,"allowOneSlide":false},"zoom_enabled":"1","zoom_options":[],"photoswipe_enabled":"1","photoswipe_options":{"shareEl":false,"closeOnScroll":false,"history":false,"hideAnimationDuration":0,"showAnimationDuration":0},"flexslider_enabled":"1"};

/* In the order the live product page loads them; each depends on jQuery and the one before. */
const SINGLE_PRODUCT_SCRIPTS = [
  '/wp-content/plugins/woocommerce/assets/js/zoom/jquery.zoom.min.js?ver=1.7.21-wc.10.9.4',
  '/wp-content/plugins/woocommerce/assets/js/flexslider/jquery.flexslider.min.js?ver=2.7.2-wc.10.9.4',
  '/wp-content/plugins/woocommerce/assets/js/photoswipe/photoswipe.min.js?ver=4.1.1-wc.10.9.4',
  '/wp-content/plugins/woocommerce/assets/js/photoswipe/photoswipe-ui-default.min.js?ver=4.1.1-wc.10.9.4',
  '/wp-content/plugins/woocommerce/assets/js/frontend/single-product.min.js?ver=10.9.4',
];

let scriptsReady: Promise<void> | null = null;

function waitForJQuery(): Promise<void> {
  return new Promise((resolve) => {
    const tick = () => (window.jQuery ? resolve() : setTimeout(tick, 30));
    tick();
  });
}

/**
 * The dialog lives in <body>, outside React, so leaving the product page does not remove it; its
 * unstyled buttons then sit under the footer of /cart/ and /checkout/, where the PhotoSwipe
 * stylesheet is no longer loaded.
 */
export function removePhotoswipeDialog(): void {
  document.getElementById('photoswipe-fullscreen-dialog')?.remove();
}

function ensureSingleProductScripts(): Promise<void> {
  window.wc_single_product_params ??= SINGLE_PRODUCT_PARAMS;
  // WordPress prints the PhotoSwipe dialog once at the end of <body>; the gallery script opens it.
  // This runs before the scriptsReady shortcut because removePhotoswipeDialog() takes the dialog
  // away on every unmount, and the next product page must find it again.
  if (!document.getElementById('photoswipe-fullscreen-dialog')) {
    const holder = document.createElement('div');
    holder.innerHTML = photoswipeHtml;
    const dialog = holder.firstElementChild;
    if (dialog) document.body.appendChild(dialog);
  }
  if (scriptsReady) return scriptsReady;
  scriptsReady = waitForJQuery().then(() =>
    SINGLE_PRODUCT_SCRIPTS.reduce<Promise<void>>((chain, src) => chain.then(() => loadScript(src)), Promise.resolve()),
  );
  return scriptsReady;
}

/**
 * Gallery, tabs and rating stars for a product just rendered under `root`.
 *
 * Each part is initialised only if it has not been yet: the first time the script loads, its own
 * ready handler may already have done the product on screen, and React's development double
 * effects call this twice. A second zoom or a second row of stars is what a blind re-run gives.
 */
export function initSingleProduct(root: Element): void {
  ensureSingleProductScripts()
    .then(() => {
      if (!root.isConnected) return;
      const $ = window.jQuery!;
      root.querySelectorAll('.wc-tabs-wrapper, .woocommerce-tabs').forEach((tabs) => {
        if (!tabs.querySelector('.wc-tabs li.active, ul.tabs li.active')) $(tabs).trigger('init');
      });
      root.querySelectorAll('#rating').forEach((rating) => {
        if (!rating.previousElementSibling?.matches('p.stars')) $(rating).trigger('init');
      });
      root.querySelectorAll('.woocommerce-product-gallery').forEach((el) => {
        const g = $(el) as ReturnType<JQueryLike> & { data(k: string): unknown };
        if (g.data('product_gallery')) return;
        g.trigger('wc-product-gallery-before-init', [el, SINGLE_PRODUCT_PARAMS]);
        g.wc_product_gallery?.(SINGLE_PRODUCT_PARAMS);
        g.trigger('wc-product-gallery-after-init', [el, SINGLE_PRODUCT_PARAMS]);
      });
    })
    .catch(() => {
      // Without the script the gallery would stay at the opacity:0 WordPress prints for it.
      root.querySelectorAll<HTMLElement>('.woocommerce-product-gallery').forEach((g) => (g.style.opacity = '1'));
    });
}

export type AddToCart = (product: CatalogueProduct, quantity: number) => unknown;

function liveRegion(): HTMLElement {
  let el = document.querySelector<HTMLElement>('.widget_shopping_cart_live_region');
  if (!el) {
    el = document.createElement('div');
    el.className = 'widget_shopping_cart_live_region screen-reader-text';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Clicks on loop "Add to cart" buttons under `root`. Handled on the way up, before anything on
 * <body> sees them, so WooCommerce's own add-to-cart.js (if a page loads it) never posts to the
 * WordPress endpoint that no longer exists, and the router never follows the `?add-to-cart=` href.
 */
export function bindLoopAddToCart(root: HTMLElement, find: (postId: string) => CatalogueProduct | undefined, add: AddToCart): () => void {
  const onClick = (e: MouseEvent) => {
    const btn = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('.add_to_cart_button');
    if (!btn || !root.contains(btn)) return;
    const product = find(btn.dataset.product_id ?? '');
    if (!product) return;
    e.preventDefault();
    e.stopPropagation();
    const region = liveRegion();
    region.textContent = '';
    region.removeAttribute('aria-relevant');
    // On the home page Premium Addons' grid handles the click as well as WooCommerce, so the live
    // button shows both: Premium's `adding` and spinning cog, WooCommerce's `loading`.
    const premium = !!btn.closest('.premium-woo-atc-button');
    btn.classList.remove('added');
    btn.classList.add(...(premium ? ['adding', 'loading'] : ['loading']));
    if (premium) btn.insertAdjacentHTML('beforeend', '<span class="premium-woo-cart-loader fas fa-cog"></span>');
    Promise.resolve()
      .then(() => add(product, Number(btn.dataset.quantity) || 1))
      .then(() => {
        btn.classList.remove('loading', 'adding');
        btn.classList.add('added');
        if (btn.parentElement && !btn.parentElement.querySelector('.added_to_cart')) {
          const a = document.createElement('a');
          a.href = '/cart/';
          a.className = 'added_to_cart wc-forward';
          a.title = 'View cart';
          a.textContent = 'View cart';
          btn.after(a);
        }
        if (premium) {
          // Premium then turns the button itself into a link to the cart (observed on the live
          // home page): no longer an add to cart button, so the next click simply navigates.
          btn.classList.remove('add_to_cart_button');
          btn.href = '/cart/';
          btn.textContent = 'View cart';
          btn.setAttribute('data-added-to-cart', 'true');
        }
        const message = btn.dataset.success_message;
        if (message) setTimeout(() => { region.textContent = message; region.setAttribute('aria-relevant', 'all'); }, 1000);
      })
      .catch((err: unknown) => {
        btn.classList.remove('loading', 'adding');
        btn.querySelector('.premium-woo-cart-loader')?.remove();
        console.error('Add to cart failed', err);
      });
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}

/**
 * The single product form. On the live site it posts, the page reloads at the top with
 * WooCommerce's "has been added to your cart" notice above the product and the quantity back at
 * one; this does the same without the reload. The review form goes to Vertik instead of
 * wp-comments-post.php (see submitReview), and answers in a notice rather than a page load.
 */
export function bindSingleProductForms(root: HTMLElement, notices: HTMLElement, product: CatalogueProduct, add: AddToCart): () => void {
  const onSubmit = (e: SubmitEvent) => {
    const form = e.target as HTMLFormElement;
    if (!root.contains(form)) return;
    if (form.id === 'commentform') {
      e.preventDefault();
      sendReview(form, product);
      return;
    }
    if (!form.classList.contains('cart')) return;
    e.preventDefault();
    const input = form.querySelector<HTMLInputElement>('input.qty');
    const qty = Math.max(1, Math.floor(Number(input?.value) || 1));
    Promise.resolve()
      .then(() => add(product, qty))
      .then(() => {
        notices.innerHTML = addedNoticeHtml(product, qty);
        if (input) input.value = '1';
        window.scrollTo(0, 0);
      })
      .catch((err: unknown) => console.error('Add to cart failed', err));
  };
  root.addEventListener('submit', onSubmit);
  return () => root.removeEventListener('submit', onSubmit);
}

/**
 * Puts Vertik's reviews into a product page that was rendered with none. They arrive after the
 * page does, so only the three places that show them are rewritten: replacing the whole template
 * would wipe a review the shopper has already started typing.
 */
export function applyReviews(root: Element, product: CatalogueProduct, reviews: CatalogueReview[]): void {
  const shown = { ...product, reviews };
  const comments = root.querySelector('#comments');
  if (comments) comments.outerHTML = commentsHtml(shown);
  const title = root.querySelector('#reply-title');
  if (title) title.outerHTML = replyTitleHtml(shown);
  const tab = root.querySelector('#tab-title-reviews a');
  if (tab) tab.innerHTML = `
						${tabTitleLabel(shown)}					`;
}

function showReviewNotice(form: HTMLFormElement, kind: 'message' | 'error', text: string): void {
  const wrapper = form.closest('#review_form_wrapper');
  if (!wrapper) return;
  wrapper.querySelector('[data-review-notice]')?.remove();
  const html = kind === 'error'
    ? `<ul class="woocommerce-error" role="alert" data-review-notice><li>${esc(text)}</li></ul>`
    : `<div class="woocommerce-message" role="alert" data-review-notice>${esc(text)}</div>`;
  wrapper.insertAdjacentHTML('afterbegin', html);
  wrapper.querySelector('[data-review-notice]')?.scrollIntoView({ block: 'nearest' });
}

function sendReview(form: HTMLFormElement, product: CatalogueProduct): void {
  const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? '';
  const rating = Number(value('rating'));
  if (!rating) {
    showReviewNotice(form, 'error', 'Please select a rating');
    return;
  }
  const submit = form.querySelector<HTMLInputElement>('input[type=submit]');
  if (submit) submit.disabled = true;
  submitReview(product, { order_number: value('order_number'), phone: value('phone'), rating, body: value('comment') })
    .then((message) => {
      showReviewNotice(form, 'message', message);
      form.reset();
      form.querySelectorAll('p.stars, p.stars a').forEach((el) => el.classList.remove('selected', 'active'));
    })
    .catch((err: unknown) => {
      showReviewNotice(form, 'error', err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    })
    .finally(() => {
      if (submit) submit.disabled = false;
    });
}
