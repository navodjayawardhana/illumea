import { useEffect, useMemo, useRef, useState, type FocusEvent, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PAGE_META } from '../layout/pageMeta';
import { loadScript } from '../layout/elementor';
import { api, type OrderPayload, type ShippingQuote } from '../services/api';
import { useCart } from './cart';
import { COUNTRIES } from './countries';
import { Price } from './money';
import { messageOf, NoticesWrapper, type Notice } from './notices';
import { OrderReceived, saveReceipt, type Receipt } from './OrderReceived';
import { getPaymentGateways, hasShippingAreas, placeOrder, startGatewayPayment, useSession, type PaymentGateway } from './vertik';
import { WooPage, scrollToNotice } from './WooPage';

/**
 * /checkout/ - Elementor Pro's two-column WooCommerce checkout widget, and the order-received
 * page that follows it at /checkout/order-received/<number>/.
 *
 * The form is the live one field for field: same ids, names, classes, placeholders, the same
 * country select turned into a select2 box by the same selectWoo script, the same order review
 * table and the same payment list. Placing the order posts to Vertik instead of WordPress, and
 * what comes back is drawn the way WooCommerce's `checkout.js` draws its own answer - errors
 * as a `NoticeGroup` at the top of the form with each field marked and explained inline, success
 * as a redirect to the order-received page.
 *
 * Two places where Vertik asks for more than the live form does, kept without changing a pixel:
 * - **Phone.** The live form labels it optional; Vertik refuses an order without one, because a
 *   courier with no number to ring is a parcel that comes back. An empty phone is answered with
 *   WooCommerce's own "is a required field" error, and the label is left as the live site has it.
 * - **Delivery.** The live checkout has no shipping row. When the business has set up delivery
 *   areas in Vertik, the fee Vertik quotes for the town is shown in WooCommerce's shipping row
 *   and sent with the order; with no areas there is no row and no fee, as live.
 */
export function CheckoutPage() {
  return (
    <WooPage
      mainClass={PAGE_META.checkout.mainClass ?? 'site-main post-10 page type-page status-publish hentry'}
      pageId="10"
      title="Checkout"
      hero={{ section: '19fb9036', column: '594e26d9', widget: '18c1cd96' }}
      body={{ section: '252357a1', column: '5f623c5a', widget: '31f3ff12', widgetClass: 'e-checkout-layout-two-column elementor-widget elementor-widget-woocommerce-checkout-page' }}
    >
      <CheckoutWidget />
    </WooPage>
  );
}

const RECEIVED = /^\/checkout\/order-received\/([^/]+)\/?$/;

export function CheckoutWidget() {
  const { pathname } = useLocation();
  const received = RECEIVED.exec(pathname);
  if (received) return <OrderReceived orderNumber={decodeURIComponent(received[1])} />;
  return <CheckoutForm />;
}

type FieldKey =
  | 'billing_first_name' | 'billing_last_name' | 'billing_country' | 'billing_address_1' | 'billing_address_2'
  | 'billing_city' | 'billing_postcode' | 'billing_phone' | 'billing_email' | 'order_comments';

type Values = Record<FieldKey, string>;

type RowState = 'validated' | 'required' | 'email' | 'phone' | undefined;

/** What WooCommerce calls each field in an error - its label with "Billing" in front. */
const ERROR_LABEL: Partial<Record<FieldKey, string>> = {
  billing_first_name: 'Billing First Name',
  billing_last_name: 'Billing Last Name',
  billing_country: 'Billing Country / Region',
  billing_address_1: 'Billing Street address',
  billing_city: 'Billing Town / City',
  billing_postcode: 'Billing Postcode / ZIP',
  billing_phone: 'Billing Phone',
  billing_email: 'Billing Email Address',
};

/** Required on the live form, in the order WooCommerce reports them. Phone is Vertik's addition. */
const REQUIRED: FieldKey[] = ['billing_first_name', 'billing_last_name', 'billing_country', 'billing_address_1', 'billing_city', 'billing_postcode', 'billing_phone', 'billing_email'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS = /[\s#0-9_\-+/().]/g;

/** `checkout.js`'s `validate_field`, which runs on blur and change. */
function validateField(key: FieldKey, value: string, liveRequired: boolean): RowState {
  if (liveRequired && value.trim() === '') return 'required';
  if (key === 'billing_email' && value && !EMAIL.test(value)) return 'email';
  if (key === 'billing_phone' && value.replace(PHONE_CHARS, '').length > 0) return 'phone';
  return 'validated';
}

/** The fields the live form marks `validate-required`; phone is not one of them there. */
const LIVE_REQUIRED = new Set<FieldKey>(REQUIRED.filter((k) => k !== 'billing_phone'));

const ROW_CLASS: Record<Exclude<RowState, undefined>, string> = {
  validated: 'woocommerce-validated',
  required: 'woocommerce-invalid woocommerce-invalid-required-field',
  email: 'woocommerce-invalid woocommerce-invalid-email',
  phone: 'woocommerce-invalid woocommerce-invalid-phone',
};

interface FieldError {
  field?: FieldKey;
  html: ReactNode;
  text: string;
}

/** WooCommerce's place-order blocker: blockUI's white veil over the form while it works. */
function BlockOverlay() {
  return (
    <>
      <div className="blockUI" style={{ display: 'none' }}></div>
      <div
        className="blockUI blockOverlay"
        style={{ zIndex: 1000, border: 'none', margin: 0, padding: 0, width: '100%', height: '100%', top: 0, left: 0, background: 'rgb(255, 255, 255)', opacity: 0.6, cursor: 'wait', position: 'absolute' }}
      ></div>
    </>
  );
}

/** How a gateway Vertik reports is labelled. OnePay is the one the live site already shows. */
function gatewayLabel(g: PaymentGateway): { label: ReactNode; description: string } {
  if (g.name === 'onepay') {
    return {
      label: (
        <>
          Bank card / Bank Account - OnePay <img decoding="async" src="/wp-content/plugins/onepay-payment-gateway-for-woocommerce/assets/img/logo_onepay.png" alt="Bank card / Bank Account - OnePay" />
        </>
      ),
      description: 'Pay by Visa, MasterCard, AMEX, or Lanka QR via onepay.',
    };
  }
  const name = g.name.charAt(0).toUpperCase() + g.name.slice(1);
  return { label: name, description: g.instalments?.label ? `Pay in ${g.instalments.count} ${g.instalments.label}.` : `Pay with ${name}.` };
}

interface JQueryish {
  (el: Element): {
    selectWoo?: (opts?: unknown) => unknown;
    on(ev: string, fn: (...a: unknown[]) => void): unknown;
    off(ev: string): unknown;
    trigger(ev: string): unknown;
    val(): unknown;
    hasClass(c: string): boolean;
  };
  fn: { selectWoo?: unknown };
}

function CheckoutForm() {
  const cart = useCart();
  const session = useSession();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const countryRef = useRef<HTMLSelectElement>(null);

  const [values, setValues] = useState<Values>(() => {
    const c = session?.customer;
    const [first, ...rest] = (c?.name ?? '').trim().split(/\s+/);
    return {
      billing_first_name: first ?? '',
      billing_last_name: rest.join(' '),
      billing_country: 'LK',
      billing_address_1: c?.address ?? '',
      billing_address_2: '',
      billing_city: c?.city ?? '',
      billing_postcode: '',
      billing_phone: c?.phone ?? '',
      billing_email: c?.email ?? '',
      order_comments: '',
    };
  });
  const [rows, setRows] = useState<Partial<Record<FieldKey, RowState>>>({});
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [processing, setProcessing] = useState(false);
  const [payment, setPayment] = useState('cod');
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [pricesDelivery, setPricesDelivery] = useState(false);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [coupon, setCoupon] = useState('');
  const groupRef = useRef<HTMLDivElement>(null);
  const noticesRef = useRef<HTMLDivElement>(null);
  const [errorTick, setErrorTick] = useState(0);

  // An empty basket has nothing to check out: WooCommerce sends the shopper back to the cart.
  useEffect(() => {
    if (cart.items.length === 0 && !processing) navigate('/cart/', { replace: true });
  }, [cart.items.length, processing, navigate]);

  useEffect(() => {
    let live = true;
    getPaymentGateways().then((g) => live && setGateways(g));
    hasShippingAreas().then((a) => live && setPricesDelivery(a));
    return () => {
      live = false;
    };
  }, []);

  // Woo's update_order_review on a changed town: ask Vertik what delivery to that town costs.
  const city = values.billing_city.trim();
  useEffect(() => {
    if (!pricesDelivery || !city) {
      setQuote(null);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      setQuoting(true);
      api
        .getShippingQuote(city, cart.weightGrams, cart.subtotal)
        .then((q) => live && setQuote(q))
        .catch(() => live && setQuote({ deliverable: false, fee: null, free: false, free_above: null, message: 'There are no shipping options available. Please ensure that your address has been entered correctly, or contact us if you need any help.' }))
        .finally(() => live && setQuoting(false));
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [pricesDelivery, city, cart.weightGrams, cart.subtotal]);

  // The country box is select2 on the live site, built by WooCommerce's own selectWoo.
  useEffect(() => {
    const $ = (window as unknown as { jQuery?: JQueryish }).jQuery;
    const el = countryRef.current;
    if (!$ || !el) return;
    let cancelled = false;
    const ready = $.fn.selectWoo ? Promise.resolve() : loadScript('/wp-content/plugins/woocommerce/assets/js/selectWoo/selectWoo.full.min.js?ver=1.0.9-wc.10.9.4');
    ready
      .then(() => {
        if (cancelled || !el.isConnected) return;
        const $el = $(el);
        $el.on('select2:select', () => $el.trigger('focus'));
        $el.on('change', () => {
          const v = String($el.val() ?? '');
          setValues((s) => ({ ...s, billing_country: v }));
          setRows((r) => ({ ...r, billing_country: validateField('billing_country', v, true) }));
        });
        $el.selectWoo?.({
          placeholder: el.getAttribute('data-placeholder') || '',
          label: el.getAttribute('data-label') || null,
          required: el.getAttribute('aria-required') === 'true' || null,
          width: '100%',
          language: { noResults: () => 'No matches found', searching: () => 'Searching…' },
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      const $el = $(el);
      $el.off('change');
      $el.off('select2:select');
      if ($el.hasClass('select2-hidden-accessible')) $el.selectWoo?.('destroy');
    };
  }, []);

  useEffect(() => {
    if (errorTick) scrollToNotice(groupRef.current ?? formRef.current);
  }, [errorTick]);

  const set = (key: FieldKey) => (e: { target: { value: string } }) => {
    const v = e.target.value;
    setValues((s) => ({ ...s, [key]: v }));
    // 'input' clears the row's verdict, and its inline message, until the field is left again.
    setRows((r) => ({ ...r, [key]: undefined }));
    formRef.current?.querySelector(`#${key}_description`)?.remove();
  };
  const blur = (key: FieldKey) => (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!(key in ERROR_LABEL)) return;
    setRows((r) => ({ ...r, [key]: validateField(key, e.target.value, LIVE_REQUIRED.has(key)) }));
  };

  const shippingRow = pricesDelivery;
  const fee = shippingRow && quote?.deliverable ? (quote.free ? 0 : (quote.fee ?? 0)) : 0;
  const total = cart.subtotal + fee;

  // show_inline_errors appends a <p> to the row with the DOM, not the template; a <p> inside the
  // row's own <p> is something HTML cannot parse but the DOM holds happily, so it is done the
  // same way here rather than through JSX.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    form.querySelectorAll('.checkout-inline-error-message').forEach((n) => n.remove());
    for (const err of errors) {
      if (!err.field) continue;
      const row = form.querySelector(`#${err.field}`)?.closest('.form-row');
      if (!row) continue;
      const p = document.createElement('p');
      p.id = `${err.field}_description`;
      p.className = 'checkout-inline-error-message';
      p.textContent = err.text;
      row.append(p);
    }
  }, [errors]);
  const rowClass = (base: string, key: FieldKey) => {
    const s = rows[key];
    return s ? `${base} ${ROW_CLASS[s]}` : base;
  };
  const aria = (key: FieldKey) => (errors.some((e) => e.field === key) ? { 'aria-invalid': true, 'aria-describedby': `${key}_description` } : {});

  const fail = (list: FieldError[]) => {
    setErrors(list);
    // submit_error triggers 'validate' on every field, so every row gets its verdict.
    const next: Partial<Record<FieldKey, RowState>> = {};
    for (const k of Object.keys(ERROR_LABEL) as FieldKey[]) next[k] = validateField(k, values[k], LIVE_REQUIRED.has(k));
    for (const e of list) if (e.field && e.field === 'billing_phone' && !values.billing_phone.trim()) next.billing_phone = 'required';
    setRows(next);
    setErrorTick((t) => t + 1);
  };

  const validateAll = (): FieldError[] => {
    const list: FieldError[] = [];
    for (const key of REQUIRED) {
      const label = ERROR_LABEL[key]!;
      const v = values[key].trim();
      if (!v) {
        list.push({ field: key, html: <><strong>{label}</strong> is a required field.</>, text: `${label} is a required field.` });
      } else if (key === 'billing_email' && !EMAIL.test(v)) {
        list.push({ field: key, html: <><strong>{label}</strong> is not a valid email address.</>, text: `${label} is not a valid email address.` });
      } else if (key === 'billing_phone' && v.replace(PHONE_CHARS, '').length > 0) {
        list.push({ field: key, html: <><strong>{label}</strong> is not a valid phone number.</>, text: `${label} is not a valid phone number.` });
      }
    }
    if (list.length === 0 && shippingRow && quote && !quote.deliverable) {
      list.push({ html: quote.message || 'No shipping method has been selected. Please double check your address, or contact us if you need any help.', text: quote.message });
    }
    return list;
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.name === 'apply_coupon') {
      applyCoupon();
      return;
    }
    if (processing) return;
    setNotices([]);
    const invalid = validateAll();
    if (invalid.length) {
      fail(invalid);
      return;
    }
    setErrors([]);
    setProcessing(true);

    const country = COUNTRIES.find(([c]) => c === values.billing_country)?.[1] ?? values.billing_country;
    const address = [values.billing_address_1, values.billing_address_2, values.billing_postcode, values.billing_country === 'LK' ? '' : country]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(', ');
    const order: OrderPayload = {
      name: `${values.billing_first_name.trim()} ${values.billing_last_name.trim()}`.trim(),
      phone: values.billing_phone.trim(),
      email: values.billing_email.trim(),
      address,
      city: values.billing_city.trim(),
      paymentMethod: 'cod',
      notes: values.order_comments.trim() || undefined,
      deliveryFee: shippingRow && quote?.deliverable ? fee : null,
      items: cart.items.map((l) => ({ itemId: l.id, quantity: l.quantity, unitPrice: l.price })),
    };

    try {
      if (payment !== 'cod') {
        await startGatewayPayment(payment, order, session?.token ?? null);
        return;
      }
      const placed = await placeOrder(order, session?.token ?? null);
      const receipt: Receipt = {
        orderNumber: placed.order_number,
        placedAt: new Date().toISOString(),
        email: order.email ?? '',
        subtotal: placed.subtotal ?? cart.subtotal,
        deliveryFee: placed.delivery_fee ?? 0,
        showShipping: shippingRow,
        total: placed.total ?? total,
        paymentTitle: 'Cash on delivery',
        paymentMethod: 'cod',
        notes: values.order_comments.trim(),
        lines: cart.items.map((l) => ({ name: l.name, permalink: l.permalink, quantity: l.quantity, total: l.price * l.quantity })),
        billing: {
          name: order.name,
          address1: values.billing_address_1.trim(),
          address2: values.billing_address_2.trim(),
          city: values.billing_city.trim(),
          postcode: values.billing_postcode.trim(),
          country: values.billing_country === 'LK' ? '' : country,
          phone: order.phone,
          email: order.email ?? '',
        },
      };
      saveReceipt(receipt);
      navigate(`/checkout/order-received/${encodeURIComponent(placed.order_number)}/`);
      cart.clear();
    } catch (err) {
      const text = messageOf(err);
      setProcessing(false);
      fail([{ html: text, text }]);
    }
  };

  const applyCoupon = () => {
    const code = coupon.trim().toLowerCase();
    setNotices([{ type: 'error', content: code ? `Coupon "${code}" cannot be applied because it does not exist.` : 'Please enter a coupon code.' }]);
    setTimeout(() => scrollToNotice(noticesRef.current), 0);
  };

  // The live checkout lists OnePay whether or not Vertik has been asked yet, so the row is drawn
  // from the first paint rather than popping in (and shifting the privacy text) once /payments
  // answers. Choosing it is cosmetic until the Vertik gateway is wired.
  const methods = useMemo(() => [{ id: 'cod', label: <>Cash on delivery </> as ReactNode, description: 'Pay with cash upon delivery.' }, ...(gateways.some((g) => g.name === 'onepay') ? [] : [{ id: 'onepay', ...gatewayLabel({ name: 'onepay', instalments: null }) }]), ...gateways.map((g) => ({ id: g.name, ...gatewayLabel(g) }))], [gateways]);

  const input = (key: FieldKey, props: { type?: string; placeholder: string; autoComplete: string; required?: boolean }) => (
    <span className="woocommerce-input-wrapper">
      <input
        type={props.type ?? 'text'}
        className="input-text "
        name={key}
        id={key}
        placeholder={props.placeholder}
        value={values[key]}
        aria-required={props.required ? 'true' : undefined}
        autoComplete={props.autoComplete}
        onChange={set(key)}
        onBlur={blur(key)}
        {...aria(key)}
      />
    </span>
  );

  const fieldErrors = errors;

  return (
    <div className="woocommerce">
      <NoticesWrapper ref={noticesRef} notices={notices} />
      <div className="woocommerce-notices-wrapper"></div>
      <form
        ref={formRef}
        name="checkout"
        method="post"
        className={`checkout woocommerce-checkout${processing ? ' processing' : ''}`}
        action="/checkout/"
        encType="multipart/form-data"
        aria-label="Checkout"
        noValidate
        onSubmit={onSubmit}
        style={processing ? { position: 'relative', zoom: 1 } : undefined}
      >
        {fieldErrors.length > 0 && (
          <div ref={groupRef} className="woocommerce-NoticeGroup woocommerce-NoticeGroup-checkout">
            <div role="alert">
              <ul className="woocommerce-error" tabIndex={-1}>
                {fieldErrors.map((err, i) => (
                  <li key={i} data-id={err.field}>
                    {err.field ? <a href={`#${err.field}`}>{err.html}</a> : err.html}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div className="e-checkout__container">
          <div className="e-checkout__column e-checkout__column-start">
            <div className="col2-set" id="customer_details">
              <div className="col-1">
                <div className="woocommerce-billing-fields">
                  <h3>Billing Details</h3>
                  <div className="woocommerce-billing-fields__field-wrapper">
                    <p className={rowClass('form-row form-row-first validate-required', 'billing_first_name')} id="billing_first_name_field" data-priority="10">
                      <label htmlFor="billing_first_name" className="required_field">First Name&nbsp;<span className="required" aria-hidden="true">*</span></label>
                      {input('billing_first_name', { placeholder: 'First Name', autoComplete: 'section-billing billing given-name', required: true })}
                    </p>
                    <p className={rowClass('form-row form-row-last validate-required', 'billing_last_name')} id="billing_last_name_field" data-priority="20">
                      <label htmlFor="billing_last_name" className="required_field">Last Name&nbsp;<span className="required" aria-hidden="true">*</span></label>
                      {input('billing_last_name', { placeholder: 'Last Name', autoComplete: 'section-billing billing family-name', required: true })}
                    </p>
                    <p className={rowClass('form-row form-row-wide address-field update_totals_on_change validate-required', 'billing_country')} id="billing_country_field" data-priority="40">
                      <label htmlFor="billing_country" className="required_field">Country / Region&nbsp;<span className="required" aria-hidden="true">*</span></label>
                      <span className="woocommerce-input-wrapper">
                        <select
                          ref={countryRef}
                          name="billing_country"
                          id="billing_country"
                          className="country_to_state country_select "
                          aria-required="true"
                          autoComplete="section-billing billing country"
                          data-placeholder="Select a country / region…"
                          data-label="Country / Region"
                          value={values.billing_country}
                          onChange={(e) => {
                            const v = e.target.value;
                            setValues((s) => ({ ...s, billing_country: v }));
                            setRows((r) => ({ ...r, billing_country: validateField('billing_country', v, true) }));
                          }}
                          {...aria('billing_country')}
                        >
                          <option value="">Select a country / region…</option>
                          {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                        </select>
                      </span>
                    </p>
                    <p className={rowClass('form-row form-row-wide address-field validate-required', 'billing_address_1')} id="billing_address_1_field" data-priority="50">
                      <label htmlFor="billing_address_1" className="required_field">Street address&nbsp;<span className="required" aria-hidden="true">*</span></label>
                      {input('billing_address_1', { placeholder: 'House number and street name', autoComplete: 'section-billing billing address-line1', required: true })}
                    </p>
                    <p className="form-row form-row-wide address-field" id="billing_address_2_field" data-priority="60">
                      <label htmlFor="billing_address_2" className="screen-reader-text">Apartment, suite, unit, etc.&nbsp;<span className="optional">(optional)</span></label>
                      {input('billing_address_2', { placeholder: 'Apartment, suite, unit, etc. (optional)', autoComplete: 'section-billing billing address-line2' })}
                    </p>
                    <p className={rowClass('form-row form-row-wide address-field validate-required', 'billing_city')} id="billing_city_field" data-priority="70">
                      <label htmlFor="billing_city" className="required_field">Town / City&nbsp;<span className="required" aria-hidden="true">*</span></label>
                      {input('billing_city', { placeholder: '', autoComplete: 'section-billing billing address-level2', required: true })}
                    </p>
                    <p className="form-row form-row-wide address-field validate-state" id="billing_state_field" style={{ display: 'none' }}>
                      <label htmlFor="billing_state" className="">State / County&nbsp;<span className="optional">(optional)</span></label>
                      <span className="woocommerce-input-wrapper">
                        <input type="hidden" className="hidden" name="billing_state" id="billing_state" value="" autoComplete="section-billing billing address-level1" placeholder="" readOnly data-input-classes="" />
                      </span>
                    </p>
                    <p className={rowClass('form-row form-row-wide address-field validate-required validate-postcode', 'billing_postcode')} id="billing_postcode_field" data-priority="90">
                      <label htmlFor="billing_postcode" className="required_field">Postcode / ZIP&nbsp;<span className="required" aria-hidden="true">*</span></label>
                      {input('billing_postcode', { placeholder: '', autoComplete: 'section-billing billing postal-code', required: true })}
                    </p>
                    <p className={rowClass('form-row form-row-wide validate-phone', 'billing_phone')} id="billing_phone_field" data-priority="100">
                      <label htmlFor="billing_phone" className="">Phone&nbsp;<span className="optional">(optional)</span></label>
                      {input('billing_phone', { type: 'tel', placeholder: 'Phone', autoComplete: 'section-billing billing tel' })}
                    </p>
                    <p className={rowClass('form-row form-row-wide validate-required validate-email', 'billing_email')} id="billing_email_field" data-priority="110">
                      <label htmlFor="billing_email" className="required_field">Email Address&nbsp;<span className="required" aria-hidden="true">*</span></label>
                      {input('billing_email', { type: 'email', placeholder: 'Email Address', autoComplete: 'section-billing billing email', required: true })}
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-2">
                <div className="woocommerce-shipping-fields"></div>
                <div className="woocommerce-additional-fields">
                  <h3></h3>
                  <div className="woocommerce-additional-fields__field-wrapper">
                    <p className="form-row notes" id="order_comments_field" data-priority="">
                      <label htmlFor="order_comments" className="">Order notes&nbsp;<span className="optional">(optional)</span></label>
                      <span className="woocommerce-input-wrapper">
                        <textarea name="order_comments" className="input-text " id="order_comments" placeholder="Notes about your order, e.g. special notes for delivery." rows={2} cols={5} value={values.order_comments} onChange={set('order_comments')}></textarea>
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="e-checkout__column e-checkout__column-end">
            <div className="e-checkout__column-inner e-sticky-right-column">
              <div className="e-checkout__order_review">
                <h3 id="order_review_heading">Your Order</h3>
                <div id="order_review" className={`woocommerce-checkout-review-order${quoting ? ' processing' : ''}`} style={quoting ? { position: 'relative', zoom: 1 } : undefined}>
                  <table className="shop_table woocommerce-checkout-review-order-table">
                    <thead>
                      <tr>
                        <th className="product-name">Product</th>
                        <th className="product-total">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.items.map((l) => (
                        <tr key={l.id} className="cart_item">
                          <td className="product-name">
                            {l.name}&nbsp;{' '}<strong className="product-quantity">&times;&nbsp;{l.quantity}</strong>
                          </td>
                          <td className="product-total">
                            <Price value={l.price * l.quantity} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="cart-subtotal">
                        <th>Subtotal</th>
                        <td><Price value={cart.subtotal} /></td>
                      </tr>
                      {shippingRow && (
                        <tr className="woocommerce-shipping-totals shipping">
                          <th>Shipping</th>
                          <td data-title="Shipping">
                            {!city ? (
                              'Enter your address to view shipping options.'
                            ) : quote?.deliverable ? (
                              <ul id="shipping_method" className="woocommerce-shipping-methods">
                                <li>
                                  <input type="hidden" name="shipping_method[0]" data-index="0" id="shipping_method_0_vertik" value="vertik" className="shipping_method" />
                                  <label htmlFor="shipping_method_0_vertik">{quote.free ? 'Free shipping' : <>Delivery: <Price value={fee} /></>}</label>
                                </li>
                              </ul>
                            ) : quote ? (
                              quote.message || 'There are no shipping options available. Please ensure that your address has been entered correctly, or contact us if you need any help.'
                            ) : (
                              'Enter your address to view shipping options.'
                            )}
                          </td>
                        </tr>
                      )}
                      <tr className="order-total">
                        <th>Total</th>
                        <td><strong><Price value={total} /></strong> </td>
                      </tr>
                    </tfoot>
                  </table>
                  {quoting && <BlockOverlay />}
                </div>
              </div>
              <div className="e-coupon-box">
                <p className="e-woocommerce-coupon-nudge e-checkout-secondary-title">
                  Have a coupon?{' '}
                  <a
                    href="#"
                    className="e-show-coupon-form"
                    onClick={(e) => {
                      e.preventDefault();
                      setCouponOpen((o) => !o);
                    }}
                  >
                    Click here to enter your coupon code
                  </a>
                </p>
                <div className="e-coupon-anchor" style={{ display: couponOpen ? 'block' : 'none' }}>
                  <label className="e-coupon-anchor-description">If you have a coupon code, please apply it below.</label>
                  <div className="form-row">
                    <div className="coupon-container-grid">
                      <div className="col coupon-col-1 ">
                        <input type="text" name="coupon_code" className="input-text" placeholder="Coupon code" id="coupon_code" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
                      </div>
                      <div className="col coupon-col-2">
                        <button className="woocommerce-button button e-apply-coupon" name="apply_coupon" type="submit">Apply</button>
                      </div>
                    </div>
                  </div>
                  <div className="clear"></div>
                </div>
              </div>
              <div className="e-checkout__order_review-2">
                <div id="payment" className="woocommerce-checkout-payment">
                  <ul className="wc_payment_methods payment_methods methods">
                    {methods.map((m) => (
                      <li key={m.id} className={`wc_payment_method payment_method_${m.id}`}>
                        <input id={`payment_method_${m.id}`} type="radio" className="input-radio" name="payment_method" value={m.id} checked={payment === m.id} onChange={() => setPayment(m.id)} data-order_button_text="" />
                        <label htmlFor={`payment_method_${m.id}`}>{m.label}</label>
                        <div className={`payment_box payment_method_${m.id}`} style={payment === m.id ? undefined : { display: 'none' }}>
                          <p>{m.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="form-row place-order">
                    <div className="woocommerce-terms-and-conditions-wrapper">
                      <div className="woocommerce-privacy-policy-text">
                        <p>
                          Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our{' '}
                          <a href="/?page_id=3" className="woocommerce-privacy-policy-link" target="_blank">privacy policy</a>.
                        </p>
                      </div>
                    </div>
                    <button type="submit" className="button alt" name="woocommerce_checkout_place_order" id="place_order" value="Place order" data-value="Place order">Place order</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {processing && <BlockOverlay />}
      </form>
    </div>
  );
}

