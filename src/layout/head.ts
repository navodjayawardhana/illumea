import { PAGE_META, STYLES, type PageKey } from './pageMeta';

/**
 * Each live page links its own set of stylesheets, in its own order: the home page carries the
 * carousel and counter CSS, the contact page MetForm's and the map's, every page its own
 * `post-<id>.css`. index.html holds the home page's list verbatim so the first paint of `/` is
 * already right; on every route this reconciles the managed tags (`data-wp-key`) to that page's
 * list.
 *
 * A stylesheet another page used is switched off with `media="not all"` rather than removed, so
 * going back to that page does not fetch and repaint it again.
 */
export function applyPageHead(key: PageKey): void {
  const head = document.head;
  const existing = new Map<string, HTMLLinkElement | HTMLStyleElement>();
  head.querySelectorAll<HTMLLinkElement | HTMLStyleElement>('[data-wp-key]').forEach((el) => {
    existing.set(el.dataset.wpKey as string, el);
  });

  const wanted = PAGE_META[key].styles;
  const wantedSet = new Set(wanted);
  let prev: Element | null = null;
  const firstManaged = head.querySelector('[data-wp-key]');

  for (const k of wanted) {
    let el = existing.get(k);
    if (!el) {
      el = create(k);
    }
    const item = STYLES[k];
    const media = item.tag === 'link' ? item.media : 'all';
    if (el.getAttribute('media') !== media) el.setAttribute('media', media);

    // Only move a tag that is out of place: moving a loaded stylesheet costs a restyle.
    if (prev) {
      if (prev.nextElementSibling !== el) head.insertBefore(el, prev.nextElementSibling);
    } else if (!el.isConnected) {
      head.insertBefore(el, firstManaged);
    }
    prev = el;
  }

  existing.forEach((el, k) => {
    if (!wantedSet.has(k)) el.setAttribute('media', 'not all');
  });
}

function create(k: string): HTMLLinkElement | HTMLStyleElement {
  const item = STYLES[k];
  if (item.tag === 'link') {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    if (item.id) link.id = item.id;
    link.href = item.href;
    link.media = item.media;
    link.dataset.wpKey = k;
    return link;
  }
  const style = document.createElement('style');
  if (item.id) style.id = item.id;
  style.textContent = item.css;
  style.dataset.wpKey = k;
  return style;
}

const ALL_PAGE_CLASSES = new Set(
  Object.values(PAGE_META).flatMap((m) => m.bodyClass.split(/\s+/)),
);

/**
 * Body classes are what Elementor's CSS keys off, so each route gets the captured value. Classes
 * a script put there itself (Elementor's `e--ua-*`, anything a plugin adds) are kept: they are
 * the ones no captured page carries.
 */
export function applyBodyClass(bodyClass: string): void {
  const added = Array.from(document.body.classList).filter((c) => !ALL_PAGE_CLASSES.has(c));
  document.body.className = [bodyClass, ...added].join(' ');
}

/**
 * A single product page carries the product template's classes with its own `postid-`. The
 * product page calls this once it knows which product it shows.
 */
export function setBodyPostId(id: number | string): void {
  document.body.className = document.body.className.replace(/\bpostid-\d+\b/, `postid-${id}`);
}

export function applyNav(key: PageKey): void {
  for (const [id, cls] of Object.entries(PAGE_META[key].nav)) {
    const li = document.getElementById(id);
    if (li && li.className !== cls) li.className = cls;
  }
}

export function pageKeyFor(pathname: string): PageKey {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return 'home';
  if (p === '/about-us') return 'about';
  if (p === '/contact-us') return 'contact';
  if (p === '/refund-policy') return 'refund';
  if (p === '/terms-and-conditions') return 'terms';
  if (p === '/privacy-policy-2') return 'privacy';
  if (p.startsWith('/my-account')) return 'account';
  if (p === '/shop' || p.startsWith('/product-category/') || p.startsWith('/brand/')) return 'shop';
  if (p.startsWith('/product/')) return 'product';
  if (p === '/cart') return 'cart';
  if (p.startsWith('/checkout')) return 'checkout';
  return 'home';
}

/**
 * The product category and brand archives the single product page links to. On the live site they
 * are the shop page's own Elementor template (`elementor-page-578`, same stylesheets, every
 * product) under a taxonomy body class and the term's name as the title and heading, with Shop
 * no longer marked current in the menu. Term ids are WordPress's, read from the live pages.
 */
export const ARCHIVE_TERMS: Record<string, { taxonomy: 'product_cat' | 'product_brand'; id: number; name: string }> = {
  '/product-category/skin-care': { taxonomy: 'product_cat', id: 22, name: 'Skin Care' },
  '/brand/available-in-sri-lanka-and-italy': { taxonomy: 'product_brand', id: 25, name: 'Available in Sri Lanka and Italy' },
};

export function archiveFor(pathname: string) {
  const p = pathname.replace(/\/+$/, '');
  const term = ARCHIVE_TERMS[p];
  if (!term) return null;
  const slug = p.split('/').pop() as string;
  return { ...term, slug };
}

export function applyPage(key: PageKey, pathname = '/'): void {
  const meta = PAGE_META[key];
  applyPageHead(key);
  const archive = key === 'shop' ? archiveFor(pathname) : null;
  if (archive) {
    applyBodyClass(
      meta.bodyClass
        .replace('archive post-type-archive post-type-archive-product', `archive tax-${archive.taxonomy} term-${archive.slug} term-${archive.id}`)
        .replace(' woocommerce-shop', ''),
    );
    applyNav(key);
    const shop = document.getElementById('menu-item-136');
    if (shop) shop.className = PAGE_META.home.nav['menu-item-136'];
    document.title = `${archive.name} – ILLUMEA SKIN CARE`;
    return;
  }
  applyBodyClass(meta.bodyClass);
  applyNav(key);
  document.title = meta.title;
}
