# illumea.lk in React - build contract

Goal: the React site must look and behave **exactly** like the live WordPress site
(https://illumea.lk), pixel for pixel, while products, cart, checkout, contact and newsletter run
on Vertik ERP (`src/services/api.ts`). The client's instruction: not even a small UI change.

## How exactness is achieved

We do not redesign anything. The live site's own markup and CSS are reused:

- `public/wp-content/...`, `public/wp-includes/...` and `public/_ext/...` hold every stylesheet,
  font, image and script the live pages load, mirrored at the **same paths**. Never edit them.
- `capture/<page>.server.html` is the HTML WordPress sends for each page; `capture/<page>.rendered.html`
  is the DOM after scripts ran. Pages: home, shop, product, product-2, about, contact, cart (empty),
  cart-filled, checkout-filled, account, refund, terms, privacy.
- `capture/woo-products.json` is WooCommerce's Store API dump of the 11 live products (names,
  slugs, prices, descriptions, images, categories).
- Reference screenshots of the live site, desktop 1440 and mobile 390, are in
  `qa/reference/<page>-d.png|-m.png` (pages: home, shop, product, about, contact, cart, cart-filled, checkout-filled, account, refund, terms, privacy).

### Rules every agent follows

1. **Same URLs.** Routes are the live paths: `/`, `/shop/`, `/product/:slug/`, `/about-us/`,
   `/contact-us/`, `/cart/`, `/checkout/`, `/my-account/`, `/refund-policy/`,
   `/terms-and-conditions/`, `/privacy-policy-2/`. Links in captured HTML that point at
   `https://illumea.lk/...` become root-relative and are routed by react-router (intercept clicks
   on same-origin `<a>` inside injected HTML and `navigate()`).
2. **Same `<head>`.** `index.html` links the stylesheets in exactly the order the live home page
   does, and keeps the inline `<style>` blocks (moved to `src/styles/wp-inline-*.css` imported in
   the same order). Per-page stylesheets (e.g. `post-<id>.css`) are loaded by that page's route.
3. **Same `<body class>`.** Elementor CSS keys off body classes and element ids. A route sets
   `document.body.className` to the captured value for that page (product pages use the product
   template's classes with the right `postid-`).
4. **Static Elementor sections are injected verbatim** (cleaned of WordPress-only scripts) with
   `dangerouslySetInnerHTML`, from files under `src/pages/html/*.html` imported with `?raw`.
   Do not hand-convert Elementor markup to JSX: that is where pixels get lost.
5. **Dynamic parts are React, rendering WooCommerce's own markup and classes** so the same CSS
   applies: product loops (`ul.products li.product ...`), the single product summary, add to cart,
   mini-cart count in the header, cart table, checkout form, order received. Copy the class names
   and DOM nesting from the captured HTML, element for element.
6. **Elementor behaviour.** Load the same scripts the live page loads (jQuery, Elementor frontend,
   Swiper, ElementsKit, Premium Addons, Ultimate Addons) with the captured inline config
   (`elementorFrontendConfig`, `ElementorProFrontendConfig`, ...). After every route render call
   `window.elementorFrontend.elementsHandler.runReadyTrigger(el)` on each `.elementor` root so
   entrance animations, sliders, tabs, toggles and the mobile menu work. Elements carrying
   `elementor-invisible` must become visible exactly as on the live site.
7. **Data comes from Vertik** through `src/services/api.ts` (`/shop/v1/products`, `/orders`,
   `/shipping/quote`, `/enquiries`). The ERP has no products yet, so for development and visual QA
   a demo adapter maps `capture/woo-products.json` into the same `Product` shape, switched on by
   `VITE_DEMO_PRODUCTS=1`. Product URLs keep the Woo slugs: map ERP product -> slug by name
   (`illumea-face-wash` etc.); unknown products use the ERP slug.
8. **Forms.** MetForm contact form -> `api.submitContact`; newsletter -> `api.subscribeNewsletter`;
   keep the exact form markup and its success/error message markup.
9. **No new UI.** If something cannot be done exactly, stop and report it rather than approximate.
10. Do not run anything from `capture/` or `public/` as code in Node. Only `npx tsc -b`,
    `npx vite build`, `npx oxlint`, and the QA screenshot script. Do not commit.

## Ownership (parallel agents, one repo)

| Agent | Owns |
|---|---|
| A1 shell | `index.html`, `src/main.tsx`, `src/App.tsx` (router), `src/layout/*` (head CSS order, body class, header, footer, Elementor re-init, link interception), static pages: home static sections, about, contact layout, refund, terms, privacy, account shell |
| A2 catalogue | `src/catalogue/*`: product adapter (Vertik + demo), product loop component, shop page, single product page, home product sections (as components A1 mounts into placeholders) |
| A3 commerce | `src/commerce/*`: cart state + mini-cart count, cart page, checkout page, order received, contact form + newsletter wiring, my-account order lookup |
| A4 QA | `qa/compare.cjs`: screenshots localhost vs live per route at 1440 and 390, pixel diff (pixelmatch), report the regions that differ; iterates with the others |

Shared contract: A1 renders `<Outlet />` pages; A2 exports `ShopPage`, `ProductPage`,
`ProductLoop({ products, columns })`; A3 exports `CartPage`, `CheckoutPage`, `MiniCartCount`,
`useCart()`, `ContactForm`, `NewsletterForm`. Placeholders inside injected HTML are elements with
`data-react="<name>"`; A1 provides `mountIslands(root, { name: Component })` which renders React
portals into them.

## Missing assets

If a page references a file under `/wp-content/` or `/wp-includes/` that is not in `public/`,
download it from `https://illumea.lk` to the same path under `public/` (Node `fetch`, retry on
DNS errors, at most a few requests a second - the host runs Imunify and will block bursts).
