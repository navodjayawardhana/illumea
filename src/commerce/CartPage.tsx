import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PAGE_META } from '../layout/pageMeta';
import { useCart, type CartItem } from './cart';
import { Price } from './money';
import { NoticesWrapper, type Notice } from './notices';
import { WooPage, scrollToNotice } from './WooPage';

/**
 * /cart/ - Elementor Pro's two-column WooCommerce cart widget, element for element.
 *
 * What WooCommerce's `cart.js` does over AJAX happens here in the browser: a changed quantity
 * enables Update Cart, updating reprices the lines and says "Cart updated.", a removed line
 * leaves an "Undo?" notice, and a basket emptied this way turns into the empty-cart message
 * with the removal notice still above it, as it does live.
 *
 * The coupon box is drawn because the live cart draws it. Vertik has no coupons, so every code
 * is answered with WooCommerce's own message for a code that does not exist - which, for this
 * shop, is the truth.
 */
export function CartPage() {
  return (
    <WooPage
      mainClass={PAGE_META.cart.mainClass ?? 'site-main post-9 page type-page status-publish hentry'}
      pageId="9"
      title="Cart"
      hero={{ section: '22b42554', column: '5555afd3', widget: '7c969e24' }}
      body={{ section: '18231539', column: '1ea42bf7', widget: '2912afdb', widgetClass: 'e-cart-layout-two-column elementor-widget elementor-widget-woocommerce-cart' }}
    >
      <CartWidget />
    </WooPage>
  );
}

/** A stable stand-in for WooCommerce's per-render quantity input id (`quantity_6adf75ec7bb33`). */
function inputId(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `quantity_${h.toString(16).padStart(13, '0').slice(0, 13)}`;
}

export function CartWidget() {
  const cart = useCart();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [coupon, setCoupon] = useState('');
  const noticesRef = useRef<HTMLDivElement>(null);
  const [noticeTick, setNoticeTick] = useState(0);

  useEffect(() => {
    if (noticeTick) scrollToNotice(noticesRef.current);
  }, [noticeTick]);

  const say = (n: Notice[]) => {
    setNotices(n);
    setNoticeTick((t) => t + 1);
  };

  const changed = cart.items.some((l) => drafts[l.id] !== undefined && drafts[l.id] !== String(l.quantity));

  const removeLine = (line: CartItem) => {
    const index = cart.items.findIndex((l) => l.id === line.id);
    cart.remove(line.id);
    setDrafts((d) => {
      const { [line.id]: _gone, ...rest } = d;
      void _gone;
      return rest;
    });
    say([
      {
        type: 'success',
        content: (
          <>
            &ldquo;{line.name}&rdquo; removed.{' '}
            <a
              href={`/cart/?undo_item=${encodeURIComponent(line.id)}`}
              className="restore-item"
              onClick={(e) => {
                e.preventDefault();
                cart.restore(line, index);
                setNotices([]);
              }}
            >
              Undo?
            </a>
          </>
        ),
      },
    ]);
  };

  const updateCart = () => {
    for (const line of cart.items) {
      const draft = drafts[line.id];
      if (draft === undefined) continue;
      const q = Number(draft);
      if (!Number.isFinite(q)) continue;
      cart.update(line.id, q);
    }
    setDrafts({});
    say([{ type: 'success', content: 'Cart updated.' }]);
  };

  const applyCoupon = () => {
    const code = coupon.trim().toLowerCase();
    if (!code) {
      say([{ type: 'error', content: 'Please enter a coupon code.' }]);
      return;
    }
    say([{ type: 'error', content: `Coupon "${code}" cannot be applied because it does not exist.` }]);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.name === 'apply_coupon') applyCoupon();
    else if (changed) updateCart();
  };

  if (cart.items.length === 0) {
    return (
      <div className="woocommerce">
        <NoticesWrapper ref={noticesRef} notices={notices} />
        <div className="wc-empty-cart-message">
          <div className="cart-empty woocommerce-info" role="status">Your cart is currently empty.</div>
        </div>
        <p className="return-to-shop">
          <a className="button wc-backward" href="/shop/">Return to shop</a>
        </p>
      </div>
    );
  }

  return (
    <div className="woocommerce">
      <NoticesWrapper ref={noticesRef} notices={notices} />
      <div className="e-cart__container">
        <div className="e-cart__column e-cart__column-start">
          <form className="woocommerce-cart-form" action="/cart/" method="post" onSubmit={onSubmit}>
            <div className="e-shop-table e-cart-section">
              <table className="shop_table shop_table_responsive cart woocommerce-cart-form__contents" cellSpacing={0}>
                <thead>
                  <tr>
                    <th className="product-remove"><span className="screen-reader-text">Remove item</span></th>
                    <th className="product-thumbnail"><span className="screen-reader-text">Thumbnail image</span></th>
                    <th scope="col" className="product-name">Product</th>
                    <th scope="col" className="product-price">Price</th>
                    <th scope="col" className="product-quantity">Quantity</th>
                    <th scope="col" className="product-subtotal">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.items.map((line, i) => {
                    const id = inputId(line.id);
                    return (
                      <tr key={line.id} className="woocommerce-cart-form__cart-item cart_item">
                        <td className="product-remove">
                          <a
                            role="button"
                            href={`/cart/?remove_item=${encodeURIComponent(line.id)}`}
                            className="remove"
                            aria-label={`Remove ${line.name} from cart`}
                            data-product_id={line.postId}
                            data-product_sku={line.sku}
                            onClick={(e) => {
                              e.preventDefault();
                              removeLine(line);
                            }}
                          >
                            &times;
                          </a>
                        </td>
                        <td className="product-thumbnail">
                          <a href={line.permalink}>
                            {line.thumbnail && (
                              <img
                                fetchPriority={i === 0 ? 'high' : undefined}
                                decoding="async"
                                width={line.thumbnail.width}
                                height={line.thumbnail.height}
                                src={line.thumbnail.src}
                                className="attachment-woocommerce_thumbnail size-woocommerce_thumbnail"
                                alt={line.thumbnail.alt}
                                srcSet={line.thumbnail.srcSet}
                                sizes={`(max-width: ${line.thumbnail.width}px) 100vw, ${line.thumbnail.width}px`}
                              />
                            )}
                          </a>
                        </td>
                        <td scope="row" role="rowheader" className="product-name" data-title="Product">
                          <a href={line.permalink}>{line.name}</a>
                        </td>
                        <td className="product-price" data-title="Price">
                          <Price value={line.price} />
                        </td>
                        <td className="product-quantity" data-title="Quantity">
                          <div className="quantity">
                            <label className="screen-reader-text" htmlFor={id}>{line.name} quantity</label>
                            <input
                              type="number"
                              id={id}
                              className="input-text qty text"
                              name={`cart[${line.id}][qty]`}
                              value={drafts[line.id] ?? String(line.quantity)}
                              aria-label="Product quantity"
                              min={0}
                              max={line.stock !== null && line.stock >= 0 ? line.stock : undefined}
                              step={1}
                              placeholder=""
                              inputMode="numeric"
                              autoComplete="off"
                              onChange={(e) => setDrafts((d) => ({ ...d, [line.id]: e.target.value }))}
                            />
                          </div>
                        </td>
                        <td className="product-subtotal" data-title="Subtotal">
                          <Price value={line.price * line.quantity} />
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={6} className="actions">
                      <button type="submit" className="button" name="update_cart" value="Update Cart" disabled={!changed}>
                        Update Cart
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="e-clear"></div>
            <div className="coupon e-cart-section shop_table">
              <div className="form-row coupon-col">
                <div className="coupon-col-start">
                  <input type="text" name="coupon_code" className="input-text" id="coupon_code" value={coupon} placeholder="Coupon code" onChange={(e) => setCoupon(e.target.value)} />
                </div>
                <div className="coupon-col-end">
                  <button className="button e-apply-coupon" name="apply_coupon" type="submit" value="Apply coupon">Apply coupon</button>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="e-cart__column e-cart__column-end">
          <div className="e-cart__column-inner e-sticky-right-column">
            <div className="e-cart-totals e-cart-section">
              <div className="cart-collaterals">
                <div className="cart_totals ">
                  <h2>Cart Totals</h2>
                  <table cellSpacing={0} className="shop_table shop_table_responsive">
                    <tbody>
                      <tr className="cart-subtotal">
                        <th>Subtotal</th>
                        <td data-title="Subtotal"><Price value={cart.subtotal} /></td>
                      </tr>
                      <tr className="order-total">
                        <th>Total</th>
                        <td data-title="Total"><strong><Price value={cart.subtotal} /></strong> </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="wc-proceed-to-checkout">
                    <a href="/checkout/" className="checkout-button button alt wc-forward">
                      Proceed to Checkout
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
