/**
 * The catalogue's one product shape, whichever source filled it.
 *
 * It is WooCommerce-shaped on purpose: the site renders WooCommerce's own markup, and the markup
 * wants a slug, a post id for its `post-N` classes, a regular and a sale price, a short and a long
 * description, image sizes for `srcset`, categories and brands. Vertik fills what it holds (id,
 * price, stock, picture, description); the rest falls back to the live site's copy of the same
 * product, matched by name, so a product page does not lose its text the day the ERP takes over.
 */
export interface CatalogueImageSize {
  url: string;
  width: number;
  height: number;
}

export interface CatalogueImage {
  /** The original upload. */
  full: string;
  width: number;
  height: number;
  alt: string;
  /** WordPress's intermediate sizes in its own metadata order, which is the order `srcset` lists them. */
  sizes: CatalogueImageSize[];
}

export interface CatalogueTerm {
  name: string;
  slug: string;
}

export interface CatalogueReview {
  id: number | string;
  author: string;
  rating: number;
  /** ISO date, as WordPress prints it in `<time datetime>`. */
  date: string;
  dateText: string;
  html: string;
  /** Gravatar URL without the size query; WordPress asks for s=60 and s=120 (2x). */
  avatar?: string;
  /** The comment classes WordPress adds for who wrote it, e.g. `byuser comment-author-admin bypostauthor`. */
  authorClass?: string;
  /** The shop's answer, drawn as a threaded reply the way WordPress draws a reply to a comment. */
  reply?: string;
}

export interface CatalogueProduct {
  /** What an order line needs: the Vertik item id, or the WooCommerce id in demo mode. */
  id: string;
  /** The WooCommerce post id when the product exists on the live site, for `post-934` style classes. */
  postId: string;
  slug: string;
  /**
   * The slug Vertik knows the product by. `slug` is the live WooCommerce one (already indexed), so
   * the two differ whenever a product has a twin there; the reviews endpoint only understands this.
   */
  vertikSlug: string;
  name: string;
  /** Root-relative, with WordPress's trailing slash: `/product/illumea-face-wash/`. */
  permalink: string;
  /** What the customer pays now. */
  price: number;
  /** The price before a sale; equal to `price` when nothing is on sale. */
  regularPrice: number;
  onSale: boolean;
  shortDescription: string;
  description: string;
  images: CatalogueImage[];
  categories: CatalogueTerm[];
  brands: CatalogueTerm[];
  averageRating: number;
  reviewCount: number;
  reviews: CatalogueReview[];
  inStock: boolean;
  /** Units on hand when the ERP says; null when it does not track them. */
  stock: number | null;
  sku: string;
  weightGrams: number;
  /** Shop order on the live site is WooCommerce's `menu_order, title`; newest-first is `date`. */
  createdRank: number;
}
