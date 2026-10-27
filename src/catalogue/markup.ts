import type { CatalogueImage, CatalogueProduct, CatalogueReview } from './types';
import productTemplate from './html/product.html?raw';

/**
 * WooCommerce's own markup, as strings.
 *
 * Every builder here reproduces what the live site's PHP prints, whitespace included, copied from
 * capture/*.server.html. Strings rather than JSX because the whitespace between inline elements
 * is part of the layout (the gap before a price, the space after a label), and JSX would quietly
 * drop it; one stray difference there is a pixel diff on every product card. The React side only
 * decides *which* products, injects the string and handles clicks.
 */

const CURRENCY = '<span class="woocommerce-Price-currencySymbol" translate="no">&#xdbb;&#xdd4;</span>';

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function amountHtml(n: number): string {
  return `<span class="woocommerce-Price-amount amount"><bdi>${CURRENCY}${formatMoney(n)}</bdi></span>`;
}

/** The inside of `.price`: one amount, or WooCommerce 10's struck-through regular price and sale price. */
export function priceInnerHtml(p: CatalogueProduct): string {
  if (!p.onSale || p.regularPrice <= p.price) return amountHtml(p.price);
  const plain = (n: number) => `&#xdbb;&#xdd4;${formatMoney(n)}`;
  return `<del aria-hidden="true">${amountHtml(p.regularPrice)}</del> <span class="screen-reader-text">Original price was: ${plain(p.regularPrice)}.</span><ins aria-hidden="true">${amountHtml(p.price)}</ins><span class="screen-reader-text">Current price is: ${plain(p.price)}.</span>`;
}

function ratingText(r: number, decimals: number) {
  return decimals ? r.toFixed(decimals) : String(r);
}

/** The loop and the review list print the same stars; the loop says 5.00, a review says 5. */
export function starRatingHtml(rating: number, decimals = 2): string {
  const width = `${(rating / 5) * 100}%`;
  const text = ratingText(rating, decimals);
  return `<div class="star-rating" role="img" aria-label="Rated ${text} out of 5"><span style="width:${width}">Rated <strong class="rating">${text}</strong> out of 5</span></div>`;
}

/* ---------- images ---------- */

function sizeOf(img: CatalogueImage, width: number) {
  return img.sizes.find((s) => s.width === width);
}

/** WordPress lists the size it chose first, then the other sizes in metadata order, then the original. */
function srcsetFor(img: CatalogueImage, width: number): string {
  if (!img.sizes.length) return '';
  const chosen = sizeOf(img, width);
  const rest = img.sizes.filter((s) => s !== chosen);
  const list = [...(chosen ? [chosen] : []), ...rest].map((s) => `${s.url} ${s.width}w`);
  list.push(`${img.full} ${img.width}w`);
  return list.join(', ');
}

function sizedImg(img: CatalogueImage, width: number) {
  const s = sizeOf(img, width);
  return { url: s?.url ?? img.full, width: s?.width ?? width, height: s?.height ?? width };
}

/* ---------- the shop / related loop (content-product.php) ---------- */

export interface LoopOptions {
  columns: number;
  /** Where the add to cart link would post on the live site: `/shop/`, `/product/x/`. */
  addToCartBase: string;
  /** WordPress leaves the first images eager and lazy-loads the rest; the shop leaves two eager. */
  eagerCount: number;
  /** The related products widget indents each item; the shop archive does not. */
  related?: boolean;
}

function loopPosition(index: number, columns: number) {
  if (index % columns === 0) return 'first';
  if (index % columns === columns - 1) return 'last';
  return '';
}

export function productClasses(p: CatalogueProduct, position: string, withPostClass = true): string {
  const parts = ['product', 'type-product', `post-${p.postId}`, 'status-publish'];
  if (position) parts.push(position);
  parts.push(p.inStock ? 'instock' : 'outofstock');
  if (p.onSale) parts.push('sale');
  if (withPostClass) {
    p.categories.forEach((c) => parts.push(`product_cat-${c.slug}`));
    if (p.images.length) parts.push('has-post-thumbnail');
  }
  parts.push('shipping-taxable', 'purchasable', 'product-type-simple');
  return parts.join(' ');
}

function addToCartLink(p: CatalogueProduct, base: string): string {
  if (!p.inStock) {
    return `<a href="${p.permalink}" aria-describedby="woocommerce_loop_add_to_cart_link_describedby_${p.postId}" data-quantity="1" class="button product_type_simple" data-product_id="${p.postId}" data-product_sku="${esc(p.sku)}" aria-label="Read more about &ldquo;${esc(p.name)}&rdquo;" rel="nofollow" data-success_message="">Read more</a>`;
  }
  return `<a href="${base}?add-to-cart=${p.postId}" aria-describedby="woocommerce_loop_add_to_cart_link_describedby_${p.postId}" data-quantity="1" class="button product_type_simple add_to_cart_button ajax_add_to_cart" data-product_id="${p.postId}" data-product_sku="${esc(p.sku)}" aria-label="Add to cart: &ldquo;${esc(p.name)}&rdquo;" rel="nofollow" data-success_message="&ldquo;${esc(p.name)}&rdquo; has been added to your cart" role="button">Add to cart</a>`;
}

function loopThumbnail(p: CatalogueProduct, lazy: boolean): string {
  const img = p.images[0];
  if (!img) {
    return `<img width="300" height="300" src="/wp-content/uploads/woocommerce-placeholder-300x300.png" class="woocommerce-placeholder wp-post-image" alt="Placeholder" decoding="async" />`;
  }
  const s = sizedImg(img, 300);
  const srcset = srcsetFor(img, 300);
  return `<img ${lazy ? 'loading="lazy" ' : ''}width="300" height="300" src="${s.url}" class="attachment-woocommerce_thumbnail size-woocommerce_thumbnail" alt="${esc(img.alt || p.name)}" decoding="async"${srcset ? ` srcset="${srcset}" sizes="(max-width: 300px) 100vw, 300px"` : ''} />`;
}

export function loopItemHtml(p: CatalogueProduct, index: number, o: LoopOptions): string {
  const sale = p.onSale ? '<span class="onsale">Sale!</span>\n\t' : '';
  const rating = p.averageRating > 0 ? starRatingHtml(p.averageRating) : '';
  const indent = o.related ? '\t\t\t\t\t' : '';
  return `${indent}<li class="${productClasses(p, loopPosition(index, o.columns))}">
\t<a href="${p.permalink}" class="woocommerce-LoopProduct-link woocommerce-loop-product__link">${sale}${loopThumbnail(p, index >= o.eagerCount)}<h2 class="woocommerce-loop-product__title">${esc(p.name)}</h2>${rating}
\t<span class="price">${priceInnerHtml(p)}</span>
</a>${addToCartLink(p, o.addToCartBase)}\t<span id="woocommerce_loop_add_to_cart_link_describedby_${p.postId}" class="screen-reader-text">
\t\t\t</span>
</li>
`;
}

/** The `<li>`s of a loop, without the `<ul>`, joined the way the template prints them. */
export function loopItemsHtml(products: CatalogueProduct[], o: LoopOptions): string {
  if (o.related) return '\n' + products.map((p, i) => `\n\t\t\t\n${loopItemHtml(p, i, o)}`).join('\n') + '\n\t\t\t\n\t\t';
  return '\n' + products.map((p, i) => loopItemHtml(p, i, o)).join('');
}

/* ---------- Premium Addons "grid 6" (the home page's product widget) ---------- */

export function premiumGridItemHtml(p: CatalogueProduct, index: number, columns: number): string {
  const position = loopPosition(index, columns);
  const cls = [' post-' + p.postId, 'product', position, p.inStock ? 'instock' : 'outofstock', ...(p.onSale ? ['sale'] : []), 'shipping-taxable', 'purchasable', 'product-type-simple'].join(' ');
  const img = p.images[0];
  const src = img ? img.full : '/wp-content/uploads/woocommerce-placeholder.png';
  const category = p.categories[0]?.name ?? '';
  const sale = p.onSale ? '<span class="onsale">Sale!</span>' : '';
  const rating = p.averageRating > 0 ? starRatingHtml(p.averageRating) : '';
  return `<li class="${cls}">
\t<div class="premium-woo-product-wrapper premium-con-lq__none">
\t\t<div class="premium-woo-product-thumbnail">${sale}<a href="${p.permalink}" class="woocommerce-LoopProduct-link woocommerce-loop-product__link"><img decoding="async" src="${src}" alt=""></a><div class="premium-woo-product-gallery-images"></div></div><div class="premium-woo-products-details-wrap"><a href="${p.permalink}" class="premium-woo-product__link"><h2 class="woocommerce-loop-product__title">${esc(p.name)}</h2></a>\t\t\t<span class="premium-woo-product-category">
\t\t\t\t${esc(category)}\t\t\t</span>
\t\t\t<div class="premium-woo-product-info">
\t<span class="price">${priceInnerHtml(p)}</span>
${rating}</div><div class="premium-woo-atc-button" >${addToCartLink(p, '/')}\t<span id="woocommerce_loop_add_to_cart_link_describedby_${p.postId}" class="screen-reader-text">
\t\t\t</span>
</div></div>\t</div>
</li>
`;
}

export function premiumGridItemsHtml(products: CatalogueProduct[], columns: number): string {
  return '\n\n' + products.map((p, i) => premiumGridItemHtml(p, i, columns)).join('\n');
}

/* ---------- shop archive controls ---------- */

export const ORDERBY_OPTIONS: [string, string][] = [
  ['menu_order', 'Default sorting'],
  ['popularity', 'Sort by popularity'],
  ['rating', 'Sort by average rating'],
  ['date', 'Sort by latest'],
  ['price', 'Sort by price: low to high'],
  ['price-desc', 'Sort by price: high to low'],
];

export function resultCountHtml(total: number): string {
  const text = total === 1 ? 'Showing the single result' : `Showing all ${total} results`;
  return `<p class="woocommerce-result-count" role="status" aria-relevant="all" >\n\t${text}</p>\n`;
}

export function orderingHtml(orderby: string): string {
  const options = ORDERBY_OPTIONS.map(([v, label]) => `\t\t\t\t\t<option value="${v}" ${v === orderby ? " selected='selected'" : ''}>${label}</option>\n`).join('');
  return `<form class="woocommerce-ordering" method="get">
\t\t<select
\t\tname="orderby"
\t\tclass="orderby"
\t\t\t\t\taria-label="Shop order"
\t\t\t>
${options}\t\t\t</select>
\t<input type="hidden" name="paged" value="1" />
\t</form>
`;
}

/** The inside of the archive widget's `.woocommerce.columns-4`, as the live shop prints it. */
export function shopLoopHtml(products: CatalogueProduct[], orderby: string, addToCartBase = '/shop/', columns = 4): string {
  if (!products.length) {
    return `<div class="woocommerce-notices-wrapper"></div><div class="woocommerce-no-products-found">\n\t\n\t<div class="woocommerce-info" role="status">\n\t\tNo products were found matching your selection.\t</div>\n</div>\n`;
  }
  return `<div class="woocommerce-notices-wrapper"></div>${resultCountHtml(products.length)}${orderingHtml(orderby)}<ul class="products elementor-grid columns-${columns}">${loopItemsHtml(products, { columns, addToCartBase, eagerCount: 2 })}</ul>\n`;
}

/* ---------- single product (Elementor template 607) ---------- */

function galleryItemHtml(p: CatalogueProduct, img: CatalogueImage, main: boolean): string {
  const single = sizedImg(img, 600);
  const thumb = sizedImg(img, 100);
  const alt = esc(img.alt || p.name);
  const thumbSet = srcsetFor(img, 100);
  const singleSet = srcsetFor(img, 600);
  const largeW = img.width || 600;
  const largeH = img.height || 600;
  return `<div data-thumb="${thumb.url}" data-thumb-alt="${alt}" data-thumb-srcset="${thumbSet}"  data-thumb-sizes="(max-width: 100px) 100vw, 100px" class="woocommerce-product-gallery__image"><a href="${img.full}"><img width="600" height="600" src="${single.url}" class="${main ? 'wp-post-image' : ''}" alt="${alt}" data-caption="" data-src="${img.full}" data-large_image="${img.full}" data-large_image_width="${largeW}" data-large_image_height="${largeH}" decoding="async"${singleSet ? ` srcset="${singleSet}" sizes="(max-width: 600px) 100vw, 600px"` : ''} /></a></div>`;
}

function galleryHtml(p: CatalogueProduct): string {
  const sale = p.onSale ? '\n\t<span class="onsale">Sale!</span>\n\t' : '';
  if (!p.images.length) {
    return `${sale}<div class="woocommerce-product-gallery woocommerce-product-gallery--without-images woocommerce-product-gallery--columns-4 images" data-columns="4" style="opacity: 0; transition: opacity .25s ease-in-out;">
\t<div class="woocommerce-product-gallery__wrapper">
\t\t<div class="woocommerce-product-gallery__image--placeholder"><img src="/wp-content/uploads/woocommerce-placeholder-600x600.png" alt="Awaiting product image" class="wp-post-image" /></div>\t</div>
</div>`;
  }
  const items = p.images.map((img, i) => galleryItemHtml(p, img, i === 0)).join('');
  return `${sale}<div class="woocommerce-product-gallery woocommerce-product-gallery--with-images woocommerce-product-gallery--columns-4 images" data-columns="4" style="opacity: 0; transition: opacity .25s ease-in-out;">
\t<div class="woocommerce-product-gallery__wrapper">
\t\t${items}\t</div>
</div>`;
}

function shortDescriptionWidget(p: CatalogueProduct): string {
  if (!p.shortDescription.trim()) return '';
  return `\t\t\t\t<div class="elementor-element elementor-element-1e7dc54a elementor-widget elementor-widget-woocommerce-product-short-description" data-id="1e7dc54a" data-element_type="widget" data-e-type="widget" data-widget_type="woocommerce-product-short-description.default">
\t\t\t\t<div class="elementor-widget-container">
\t\t\t\t\t<div class="woocommerce-product-details__short-description">
\t${p.shortDescription.replace(/\s+$/, '')}
</div>
\t\t\t\t</div>
\t\t\t\t</div>
`;
}

function cartFormHtml(p: CatalogueProduct, qtyId: string): string {
  if (!p.inStock) return '<p class="stock out-of-stock">Out of stock</p>';
  const max = p.stock !== null && p.stock > 0 ? `\n\t\t\t\tmax="${p.stock}"` : '';
  return `<form class="cart" action="${p.permalink}" method="post" enctype='multipart/form-data'>
\t\t
\t\t<div class="quantity">
\t\t<label class="screen-reader-text" for="${qtyId}">${esc(p.name)} quantity</label>
\t<input
\t\ttype="number"
\t\t\t\tid="${qtyId}"
\t\tclass="input-text qty text"
\t\tname="quantity"
\t\tvalue="1"
\t\taria-label="Product quantity"
\t\t\t\tmin="1"${max}
\t\t\t\t\t\t\tstep="1"
\t\t\tplaceholder=""
\t\t\tinputmode="numeric"
\t\t\tautocomplete="off"
\t\t\t/>
\t</div>

\t\t<button type="submit" name="add-to-cart" value="${p.postId}" class="single_add_to_cart_button button alt">Add to cart</button>

\t\t\t</form>`;
}

function termLinks(terms: { name: string; slug: string }[], base: string) {
  return terms.map((t) => `<a href="/${base}/${t.slug}/" rel="tag">${esc(t.name)}</a>`).join(', ');
}

function metaHtml(p: CatalogueProduct): string {
  const cats = p.categories.length
    ? `\t\t\t\t\t\t\t<span class="posted_in detail-container"><span class="detail-label">${p.categories.length > 1 ? 'Categories' : 'Category'}</span> <span class="detail-content">${termLinks(p.categories, 'product-category')}</span></span>\n`
    : '';
  const brands = p.brands.length
    ? ` <span class="posted_in">${p.brands.length > 1 ? 'Brands' : 'Brand'}: ${termLinks(p.brands, 'brand')}</span>`
    : '';
  return `<div class="product_meta">\n\n\t\t\t\n\t\t\t\n${cats}\t\t\t\n\t\t\t\n\t\t\t${brands}\n\t\t</div>`;
}

/** The tab's inner text; the product page rewrites it once Vertik's real count arrives. */
export function tabTitleLabel(p: CatalogueProduct): string {
  return `Reviews (${p.reviews.length})`;
}

function tabTitlesHtml(p: CatalogueProduct): string {
  const desc = p.description.trim()
    ? `\t\t\t\t\t\t\t<li role="presentation" class="description_tab" id="tab-title-description">
\t\t\t\t\t<a href="#tab-description" role="tab" aria-controls="tab-description">
\t\t\t\t\t\tDescription\t\t\t\t\t</a>
\t\t\t\t</li>
`
    : '';
  return `<ul class="tabs wc-tabs" role="tablist">
${desc}\t\t\t\t\t\t\t<li role="presentation" class="reviews_tab" id="tab-title-reviews">
\t\t\t\t\t<a href="#tab-reviews" role="tab" aria-controls="tab-reviews">
\t\t\t\t\t\t${tabTitleLabel(p)}\t\t\t\t\t</a>
\t\t\t\t</li>
\t\t\t\t\t</ul>`;
}

function descriptionPanelHtml(p: CatalogueProduct): string {
  if (!p.description.trim()) return '';
  return `<div class="woocommerce-Tabs-panel woocommerce-Tabs-panel--description panel entry-content wc-tab" id="tab-description" role="tabpanel" aria-labelledby="tab-title-description">
\t\t\t\t
\t<h2>Description</h2>

${p.description.replace(/\s+$/, '')}
\t\t\t</div>
`;
}

const avatarHtml = (avatar?: string) => avatar
  ? `<img alt='' src='${avatar}?s=60&#038;d=mm&#038;r=g' srcset='${avatar}?s=120&#038;d=mm&#038;r=g 2x' class='avatar avatar-60 photo' height='60' width='60' decoding='async'/>`
  : `<img alt='' src='https://secure.gravatar.com/avatar/?s=60&#038;d=mm&#038;r=g' srcset='https://secure.gravatar.com/avatar/?s=120&#038;d=mm&#038;r=g 2x' class='avatar avatar-60 photo avatar-default' height='60' width='60' decoding='async'/>`;

/** Plain text from the ERP, escaped here and only here; a blank line starts a new paragraph. */
export function paragraphs(text: string): string {
  return text.split(/\n{2,}/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br />')}</p>`).join('\n');
}

/**
 * The shop's answer to a review, drawn as WordPress draws a reply to a comment: a `ul.children`
 * inside the review's own `li`, one level deeper and without stars, because only the customer
 * rated anything.
 */
function replyHtml(r: CatalogueReview): string {
  if (!r.reply) return '';
  const id = `${r.id}-reply`;
  return `<ul class="children">
\t<li class="comment byuser comment-author-admin bypostauthor even depth-2" id="li-comment-${id}">
\t<div id="comment-${id}" class="comment_container">
\t\t${avatarHtml()}
\t\t<div class="comment-text">
\t<p class="meta">
\t\t<strong class="woocommerce-review__author">Reply from the shop </strong>
\t</p>
\t<div class="description">${paragraphs(r.reply)}</div>
\t\t</div>
\t</div>
</li>
</ul>
`;
}

function reviewHtml(r: CatalogueReview, index: number): string {
  const parity = index % 2 === 0 ? 'even thread-even' : 'odd alt thread-odd thread-alt';
  const avatar = avatarHtml(r.avatar);
  return `<li class="review ${r.authorClass ?? ''} ${parity} depth-1" id="li-comment-${r.id}">

\t<div id="comment-${r.id}" class="comment_container">

\t\t${avatar}
\t\t<div class="comment-text">

\t\t\t${starRatingHtml(r.rating, 0)}
\t<p class="meta">
\t\t<strong class="woocommerce-review__author">${esc(r.author)} </strong>
\t\t\t\t<span class="woocommerce-review__dash">&ndash;</span> <time class="woocommerce-review__published-date" datetime="${r.date}">${esc(r.dateText)}</time>
\t</p>

\t<div class="description">${r.html}</div>
\t\t</div>
\t</div>
${replyHtml(r)}</li><!-- #comment-## -->
`;
}

export function commentsHtml(p: CatalogueProduct): string {
  if (!p.reviews.length) {
    return `<div id="comments">
\t\t<h2 class="woocommerce-Reviews-title">
\t\t\tReviews\t\t</h2>

\t\t\t\t\t<p class="woocommerce-noreviews">There are no reviews yet.</p>
\t\t\t</div>
`;
  }
  const n = p.reviews.length;
  return `<div id="comments">
\t\t<h2 class="woocommerce-Reviews-title">
\t\t\t${n} ${n === 1 ? 'review' : 'reviews'} for <span>${esc(p.name)}</span>\t\t</h2>

\t\t\t\t\t<ol class="commentlist">
\t\t\t\t${p.reviews.map(reviewHtml).join('')}\t\t\t</ol>

\t\t\t\t\t\t</div>
`;
}

export function replyTitleHtml(p: CatalogueProduct): string {
  const title = p.reviews.length ? 'Add a review' : `Be the first to review &ldquo;${esc(p.name)}&rdquo;`;
  return `<span id="reply-title" class="comment-reply-title" role="heading" aria-level="3">${title} <small><a rel="nofollow" id="cancel-comment-reply-link" href="${p.permalink}#respond" style="display:none;">Cancel reply</a></small></span>`;
}

function relatedHtml(p: CatalogueProduct, related: CatalogueProduct[]): string {
  if (!related.length) return '';
  return `<section class="related products">

\t\t\t\t\t<h2>Related products</h2>
\t\t\t\t<ul class="products elementor-grid columns-4">${loopItemsHtml(related, { columns: 4, addToCartBase: p.permalink, eagerCount: related.length, related: true })}</ul>

\t</section>`;
}

/** The message WooCommerce shows above the product after the form adds it to the cart. */
export function addedNoticeHtml(p: CatalogueProduct, qty: number): string {
  const item = `${qty > 1 ? `${qty} &times; ` : ''}&ldquo;${esc(p.name)}&rdquo;`;
  return `\n\t<div class="woocommerce-message" role="alert">\n\t\t${item} ${qty > 1 ? 'have' : 'has'} been added to your cart. <a href="/cart/" class="button wc-forward">View cart</a>\t</div>\n`;
}

export function productDocClass(p: CatalogueProduct): string {
  const parts = ['elementor', 'elementor-607', 'elementor-location-single', `post-${p.postId}`, 'product', 'type-product', 'status-publish'];
  if (p.images.length) parts.push('has-post-thumbnail');
  p.brands.forEach((b) => parts.push(`product_brand-${b.slug}`));
  p.categories.forEach((c) => parts.push(`product_cat-${c.slug}`));
  parts.push('first', p.inStock ? 'instock' : 'outofstock');
  if (p.onSale) parts.push('sale');
  parts.push('shipping-taxable', 'purchasable', 'product-type-simple', 'product');
  return parts.join(' ');
}

/** The body class of a single product page; only `postid-` changes between products. */
export function productBodyClass(p: CatalogueProduct): string {
  return `wp-singular product-template-default single single-product postid-${p.postId} wp-embed-responsive wp-theme-hello-elementor theme-hello-elementor woocommerce woocommerce-page woocommerce-js ehf-header ehf-footer ehf-template-hello-elementor ehf-stylesheet-hello-elementor hello-elementor-default elementor-default elementor-template-full-width elementor-kit-64 elementor-page-607`;
}

/**
 * The inside of the product template's `<div data-elementor-type="product">`. The div itself is
 * rendered by React, so it sits directly after the header as it does on the live page.
 */
export function productPageHtml(p: CatalogueProduct, related: CatalogueProduct[]): string {
  const qtyId = `quantity_${p.postId.replace(/[^a-z0-9]/gi, '').slice(0, 13)}`;
  const fill: Record<string, string> = {
    GALLERY: galleryHtml(p),
    TITLE: esc(p.name),
    PRICE: `<p class="price">${priceInnerHtml(p)}</p>`,
    SHORT_DESC: shortDescriptionWidget(p),
    FORM: cartFormHtml(p, qtyId),
    META: metaHtml(p),
    TAB_TITLES: tabTitlesHtml(p),
    DESC_PANEL: descriptionPanelHtml(p),
    COMMENTS: commentsHtml(p),
    REPLY_TITLE: replyTitleHtml(p),
    POST_ID: esc(p.postId),
    RELATED: relatedHtml(p, related),
  };
  return productTemplate.replace(/\{\{([A-Z_]+)\}\}/g, (_, k: string) => fill[k] ?? '');
}

/** Hello Elementor's 404 template (the inside of its <main id="content" class="site-main">), which is what the live site prints for an unknown product. */
export const NOT_FOUND_HTML = `
\t\t\t<div class="page-header">
\t\t\t<h1 class="entry-title">The page can&rsquo;t be found.</h1>
\t\t</div>
\t
\t<div class="page-content">
\t\t<p>It looks like nothing was found at this location.</p>
\t</div>

`;

export const NOT_FOUND_BODY_CLASS = 'error404 wp-embed-responsive wp-theme-hello-elementor theme-hello-elementor woocommerce-js ehf-header ehf-footer ehf-template-hello-elementor ehf-stylesheet-hello-elementor hello-elementor-default elementor-default elementor-kit-64';
