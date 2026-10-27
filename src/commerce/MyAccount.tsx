import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { IslandProps } from '../layout/islands';
import { COUNTRIES } from './countries';
import { Price } from './money';
import { messageOf, NoticesWrapper, type Notice } from './notices';
import { OrderDetails, wpDate } from './OrderReceived';
import {
  accountOrder, accountOrders, login, logout, refreshAccount, updateAccount, useSession,
  type AccountOrder, type AccountOrderSummary, type ShopCustomer,
} from './vertik';

/**
 * /my-account/ and its endpoints, inside the `div.woocommerce` the shell injects.
 *
 * Signed out it is the live page: WooCommerce's login form and nothing else - the live site
 * offers no registration form, so neither does this, although Vertik could take one. Signed in
 * it is WooCommerce's account area (navigation on the left, the endpoint on the right) drawn
 * from the shopper's Vertik account: the dashboard greeting, their orders, one order, their
 * address and their details.
 *
 * What Vertik cannot do is answered in WooCommerce's own words rather than hidden: it keeps no
 * downloads, so Downloads says there are none; it cannot reset a password or change the sign-in
 * email from a browser, so those are refused with a notice.
 */

const SITE = 'ILLUMEA SKIN CARE';

interface Endpoint {
  key: string;
  arg?: string;
}

function parse(pathname: string): Endpoint {
  const rest = pathname.replace(/^\/my-account\/?/, '').replace(/\/$/, '');
  const [key = '', arg] = rest.split('/');
  return { key, arg };
}

const MENU: [key: string, label: string][] = [
  ['dashboard', 'Dashboard'],
  ['orders', 'Orders'],
  ['downloads', 'Downloads'],
  ['edit-address', 'Address'],
  ['edit-account', 'Account details'],
  ['customer-logout', 'Log out'],
];

const href = (key: string) => (key === 'dashboard' ? '/my-account/' : `/my-account/${key}/`);

const STATUS: Record<string, string> = {
  pending: 'Pending payment',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Completed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'on-hold': 'On hold',
  failed: 'Failed',
};
const statusLabel = (s: string) => STATUS[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
const statusSlug = (s: string) => (s === 'delivered' ? 'completed' : s);

/** WooCommerce renames the page heading to the endpoint, so "My account" reads "Orders". */
function useHeading(host: HTMLElement | undefined, title: string) {
  useEffect(() => {
    const h1 = host?.closest('main')?.querySelector('.page-header .entry-title');
    if (h1) h1.textContent = title;
    document.title = `${title} - ${SITE}`;
  }, [host, title]);
}

/**
 * woocommerce.js wraps every password box in `span.password-input` and adds the eye button on
 * document ready. The form here draws both itself, so it waits until that ready handler has run
 * and found nothing to wrap - otherwise a deep link could get the box wrapped twice.
 */
function useAfterDocumentReady(): boolean {
  // 'interactive' is not enough: the module script that mounts React runs while the document is
  // interactive, before DOMContentLoaded, so jQuery's ready handler would still come after this
  // render and wrap the boxes a second time - two nested span.password-input and an eye button
  // 3px off live's. Only 'complete' means that handler has certainly run.
  const [ready, setReady] = useState(document.readyState === 'complete');
  useEffect(() => {
    if (ready) return;
    const go = () => setTimeout(() => setReady(true), 0);
    document.addEventListener('DOMContentLoaded', go, { once: true });
    window.addEventListener('load', go, { once: true });
    return () => {
      document.removeEventListener('DOMContentLoaded', go);
      window.removeEventListener('load', go);
    };
  }, [ready]);
  return ready;
}

function PasswordInput(props: { name: string; id: string; autoComplete: string; required?: boolean; value: string; onChange: (v: string) => void }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="password-input">
      <input
        className="woocommerce-Input woocommerce-Input--text input-text"
        type={shown ? 'text' : 'password'}
        name={props.name}
        id={props.id}
        autoComplete={props.autoComplete}
        required={props.required}
        aria-required={props.required ? 'true' : undefined}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <button
        type="button"
        className={`show-password-input${shown ? ' display-password' : ''}`}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-describedby={props.id}
        onClick={(e) => {
          e.preventDefault();
          setShown((s) => !s);
        }}
      ></button>
    </span>
  );
}

const err = (text: ReactNode): Notice => ({ type: 'error', content: <><strong>Error:</strong> {text}</> });

export function MyAccount({ host }: Partial<IslandProps>) {
  const session = useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const ep = parse(pathname);
  const ready = useAfterDocumentReady();

  useEffect(() => {
    if (ep.key === 'customer-logout') {
      logout().finally(() => navigate('/my-account/', { replace: true }));
    }
  }, [ep.key, navigate]);

  // Keep the saved name and address current with what the shop holds.
  const token = session?.token;
  useEffect(() => {
    if (token) refreshAccount().catch(() => undefined);
  }, [token]);

  const title = !session
    ? ep.key === 'lost-password' ? 'Lost password' : 'My account'
    : ({ orders: 'Orders', 'view-order': `Order #${ep.arg ?? ''}`, downloads: 'Downloads', 'edit-address': 'Addresses', 'edit-account': 'Account details' } as Record<string, string>)[ep.key] ?? 'My account';
  useHeading(host, title);

  if (!ready) return null;
  if (!session) return ep.key === 'lost-password' ? <LostPassword /> : <LoginForm />;

  const active = ep.key === '' ? 'dashboard' : ep.key === 'view-order' ? 'orders' : ep.key;

  return (
    <>
      <nav className="woocommerce-MyAccount-navigation" aria-label="Account pages">
        <ul>
          {MENU.map(([key, label]) => (
            <li key={key} className={`woocommerce-MyAccount-navigation-link woocommerce-MyAccount-navigation-link--${key}${active === key ? ' is-active' : ''}`}>
              <a href={href(key)} aria-current={active === key ? 'page' : undefined}>{label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="woocommerce-MyAccount-content">
        <Endpoint ep={ep} customer={session.customer} />
      </div>
    </>
  );
}

function Endpoint({ ep, customer }: { ep: Endpoint; customer: ShopCustomer }) {
  switch (ep.key) {
    case 'orders':
      return <Orders page={Math.max(1, Number(ep.arg) || 1)} />;
    case 'view-order':
      return <ViewOrder orderNumber={ep.arg ?? ''} customer={customer} />;
    case 'downloads':
      return (
        <>
          <div className="woocommerce-notices-wrapper"></div>
          <div className="woocommerce-info" role="status">
            No downloads available yet. <a className="button wc-forward" href="/shop/">Browse products</a>
          </div>
        </>
      );
    case 'edit-address':
      return ep.arg === 'billing' ? <EditAddress customer={customer} /> : <Addresses customer={customer} />;
    case 'edit-account':
      return <EditAccount customer={customer} />;
    case 'customer-logout':
      return null;
    default:
      return <Dashboard customer={customer} />;
  }
}

function Dashboard({ customer }: { customer: ShopCustomer }) {
  return (
    <>
      <div className="woocommerce-notices-wrapper"></div>
      <p>
        Hello <strong>{customer.name}</strong> (not <strong>{customer.name}</strong>? <a href="/my-account/customer-logout/">Log out</a>)
      </p>
      <p>
        From your account dashboard you can view your <a href="/my-account/orders/">recent orders</a>, manage your <a href="/my-account/edit-address/">billing address</a>, and <a href="/my-account/edit-account/">edit your password and account details</a>.
      </p>
    </>
  );
}

function Orders({ page }: { page: number }) {
  const [state, setState] = useState<{ orders: AccountOrderSummary[]; pages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setState(null);
    accountOrders(page)
      .then((r) => live && setState({ orders: r.orders, pages: r.meta.pages }))
      .catch((e) => live && setError(messageOf(e)));
    return () => {
      live = false;
    };
  }, [page]);

  if (error) return <NoticesWrapper notices={[{ type: 'error', content: error }]} />;
  if (!state) return <div className="woocommerce-notices-wrapper"></div>;

  if (state.orders.length === 0) {
    return (
      <>
        <div className="woocommerce-notices-wrapper"></div>
        <div className="woocommerce-info" role="status">
          No order has been made yet. <a className="woocommerce-Button wc-forward button" href="/shop/">Browse products</a>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="woocommerce-notices-wrapper"></div>
      <table className="woocommerce-orders-table woocommerce-MyAccount-orders shop_table shop_table_responsive my_account_orders account-orders-table">
        <thead>
          <tr>
            <th scope="col" className="woocommerce-orders-table__header woocommerce-orders-table__header-order-number"><span className="nobr">Order</span></th>
            <th scope="col" className="woocommerce-orders-table__header woocommerce-orders-table__header-order-date"><span className="nobr">Date</span></th>
            <th scope="col" className="woocommerce-orders-table__header woocommerce-orders-table__header-order-status"><span className="nobr">Status</span></th>
            <th scope="col" className="woocommerce-orders-table__header woocommerce-orders-table__header-order-total"><span className="nobr">Total</span></th>
            <th scope="col" className="woocommerce-orders-table__header woocommerce-orders-table__header-order-actions"><span className="nobr">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {state.orders.map((o) => {
            const view = `/my-account/view-order/${encodeURIComponent(o.order_number)}/`;
            return (
              <tr key={o.order_number} className={`woocommerce-orders-table__row woocommerce-orders-table__row--status-${statusSlug(o.status)} order`}>
                <th className="woocommerce-orders-table__cell woocommerce-orders-table__cell-order-number" data-title="Order" scope="row">
                  <a href={view} aria-label={`View order number ${o.order_number}`}>#{o.order_number}</a>
                </th>
                <td className="woocommerce-orders-table__cell woocommerce-orders-table__cell-order-date" data-title="Date">
                  <time dateTime={o.placed_at ?? ''}>{wpDate(o.placed_at)}</time>
                </td>
                <td className="woocommerce-orders-table__cell woocommerce-orders-table__cell-order-status" data-title="Status">{statusLabel(o.status)}</td>
                <td className="woocommerce-orders-table__cell woocommerce-orders-table__cell-order-total" data-title="Total">
                  <Price value={o.total} /> for {o.items} {o.items === 1 ? 'item' : 'items'}
                </td>
                <td className="woocommerce-orders-table__cell woocommerce-orders-table__cell-order-actions" data-title="Actions">
                  <a href={view} className="woocommerce-button button view" aria-label={`View order number ${o.order_number}`}>View</a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {state.pages > 1 && (
        <div className="woocommerce-pagination woocommerce-pagination--without-numbers woocommerce-Pagination">
          {page > 1 && (
            <a className="woocommerce-button woocommerce-button--previous woocommerce-Button woocommerce-Button--previous button" href={page === 2 ? '/my-account/orders/' : `/my-account/orders/${page - 1}/`}>Previous</a>
          )}
          {page < state.pages && (
            <a className="woocommerce-button woocommerce-button--next woocommerce-Button woocommerce-Button--next button" href={`/my-account/orders/${page + 1}/`}>Next</a>
          )}
        </div>
      )}
    </>
  );
}

function ViewOrder({ orderNumber, customer }: { orderNumber: string; customer: ShopCustomer }) {
  const [order, setOrder] = useState<AccountOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    accountOrder(orderNumber)
      .then((o) => live && setOrder(o))
      .catch((e) => live && setError(messageOf(e)));
    return () => {
      live = false;
    };
  }, [orderNumber]);

  if (error) {
    return (
      <div className="woocommerce-notices-wrapper">
        <ul className="woocommerce-error" role="alert"><li>Invalid order. <a href="/my-account/" className="wc-forward">My account</a></li></ul>
      </div>
    );
  }
  if (!order) return <div className="woocommerce-notices-wrapper"></div>;

  const lines = order.items.map((l) => ({ name: l.name, quantity: l.quantity, total: l.total ?? l.price * l.quantity }));
  return (
    <>
      <div className="woocommerce-notices-wrapper"></div>
      <p>
        Order #<mark className="order-number">{order.order_number}</mark> was placed on <mark className="order-date">{wpDate(order.placed_at)}</mark> and is currently <mark className="order-status">{statusLabel(order.status)}</mark>.
      </p>
      <OrderDetails
        lines={lines}
        subtotal={order.subtotal ?? lines.reduce((n, l) => n + l.total, 0)}
        shipping={order.delivery_fee ? order.delivery_fee : null}
        paymentTitle={order.payment_method === 'cod' || !order.payment_method ? 'Cash on delivery' : order.payment_method}
        total={order.total}
        note={order.notes}
      />
      <section className="woocommerce-customer-details">
        <h2 className="woocommerce-column__title">Billing address</h2>
        <address>
          {customer.name}
          {order.address && <><br />{order.address}</>}
          {customer.phone && <p className="woocommerce-customer-details--phone">{customer.phone}</p>}
          {customer.email && <p className="woocommerce-customer-details--email">{customer.email}</p>}
        </address>
      </section>
    </>
  );
}

function Addresses({ customer }: { customer: ShopCustomer }) {
  const has = !!(customer.address || customer.city);
  return (
    <>
      <div className="woocommerce-notices-wrapper"></div>
      <p>The following addresses will be used on the checkout page by default.</p>
      <div className="woocommerce-Address">
        <header className="woocommerce-Address-title title">
          <h2>Billing address</h2>
          <a href="/my-account/edit-address/billing/" className="edit">{has ? 'Edit Billing address' : 'Add Billing address'}</a>
        </header>
        <address>
          {has ? (
            <>
              {customer.name}
              {customer.address && <><br />{customer.address}</>}
              {customer.city && <><br />{customer.city}</>}
            </>
          ) : (
            'You have not set up this type of address yet.'
          )}
        </address>
      </div>
    </>
  );
}

function splitName(name: string): [string, string] {
  const [first = '', ...rest] = name.trim().split(/\s+/);
  return [first, rest.join(' ')];
}

function EditAddress({ customer }: { customer: ShopCustomer }) {
  const navigate = useNavigate();
  const [first0, last0] = splitName(customer.name);
  const [v, setV] = useState({
    billing_first_name: first0,
    billing_last_name: last0,
    billing_country: 'LK',
    billing_address_1: customer.address ?? '',
    billing_address_2: '',
    billing_city: customer.city ?? '',
    billing_postcode: '',
    billing_phone: customer.phone ?? '',
    billing_email: customer.email ?? '',
  });
  const [notices, setNotices] = useState<Notice[]>([]);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const missing = (
      [
        ['billing_first_name', 'First Name'],
        ['billing_last_name', 'Last Name'],
        ['billing_address_1', 'Street address'],
        ['billing_city', 'Town / City'],
        ['billing_phone', 'Phone'],
      ] as const
    ).filter(([k]) => !v[k].trim());
    if (missing.length) {
      setNotices(missing.map(([k, label]) => ({ type: 'error', field: k, content: <><strong>{label}</strong> is a required field.</> })));
      return;
    }
    try {
      await updateAccount({
        name: `${v.billing_first_name.trim()} ${v.billing_last_name.trim()}`.trim(),
        phone: v.billing_phone.trim(),
        address: [v.billing_address_1, v.billing_address_2, v.billing_postcode].map((s) => s.trim()).filter(Boolean).join(', '),
        city: v.billing_city.trim(),
      });
      navigate('/my-account/edit-address/');
    } catch (ex) {
      setNotices([{ type: 'error', content: messageOf(ex) }]);
    }
  };

  const text = (k: keyof typeof v, label: ReactNode, cls: string, priority: string, extra: { type?: string; placeholder?: string; autoComplete: string; required?: boolean; readOnly?: boolean }) => (
    <p className={`form-row ${cls}${extra.required ? ' validate-required' : ''}`} id={`${k}_field`} data-priority={priority}>
      <label htmlFor={k} className={extra.required ? 'required_field' : ''}>
        {label}&nbsp;{extra.required ? <span className="required" aria-hidden="true">*</span> : <span className="optional">(optional)</span>}
      </label>
      <span className="woocommerce-input-wrapper">
        <input type={extra.type ?? 'text'} className="input-text " name={k} id={k} placeholder={extra.placeholder ?? ''} value={v[k]} aria-required={extra.required ? 'true' : undefined} autoComplete={extra.autoComplete} readOnly={extra.readOnly} onChange={set(k)} />
      </span>
    </p>
  );

  return (
    <>
      <NoticesWrapper notices={notices} />
      <form method="post" noValidate onSubmit={save}>
        <h2>Billing address</h2>
        <div className="woocommerce-address-fields">
          <div className="woocommerce-address-fields__field-wrapper">
            {text('billing_first_name', 'First Name', 'form-row-first', '10', { placeholder: 'First Name', autoComplete: 'given-name', required: true })}
            {text('billing_last_name', 'Last Name', 'form-row-last', '20', { placeholder: 'Last Name', autoComplete: 'family-name', required: true })}
            <p className="form-row form-row-wide address-field update_totals_on_change validate-required" id="billing_country_field" data-priority="40">
              <label htmlFor="billing_country" className="required_field">Country / Region&nbsp;<span className="required" aria-hidden="true">*</span></label>
              <span className="woocommerce-input-wrapper">
                <select name="billing_country" id="billing_country" className="country_to_state country_select " aria-required="true" autoComplete="country" value={v.billing_country} onChange={set('billing_country')}>
                  <option value="">Select a country / region…</option>
                  {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
              </span>
            </p>
            {text('billing_address_1', 'Street address', 'form-row-wide address-field', '50', { placeholder: 'House number and street name', autoComplete: 'address-line1', required: true })}
            {text('billing_address_2', <span className="screen-reader-text">Apartment, suite, unit, etc.</span>, 'form-row-wide address-field', '60', { placeholder: 'Apartment, suite, unit, etc. (optional)', autoComplete: 'address-line2' })}
            {text('billing_city', 'Town / City', 'form-row-wide address-field', '70', { autoComplete: 'address-level2', required: true })}
            {text('billing_postcode', 'Postcode / ZIP', 'form-row-wide address-field', '90', { autoComplete: 'postal-code' })}
            {text('billing_phone', 'Phone', 'form-row-wide validate-phone', '100', { type: 'tel', placeholder: 'Phone', autoComplete: 'tel', required: true })}
            {text('billing_email', 'Email Address', 'form-row-wide validate-email', '110', { type: 'email', placeholder: 'Email Address', autoComplete: 'email', required: true, readOnly: true })}
          </div>
          <p>
            <button type="submit" className="button" name="save_address" value="Save address">Save address</button>
          </p>
        </div>
      </form>
    </>
  );
}

function EditAccount({ customer }: { customer: ShopCustomer }) {
  const [first0, last0] = splitName(customer.name);
  const [first, setFirst] = useState(first0);
  const [last, setLast] = useState(last0);
  const [display, setDisplay] = useState(customer.name);
  const [email, setEmail] = useState(customer.email);
  const [pw, setPw] = useState({ current: '', one: '', two: '' });
  const [notices, setNotices] = useState<Notice[]>([]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const errors: Notice[] = [];
    if (!first.trim()) errors.push({ type: 'error', field: 'account_first_name', content: <><strong>First name</strong> is a required field.</> });
    if (!last.trim()) errors.push({ type: 'error', field: 'account_last_name', content: <><strong>Last name</strong> is a required field.</> });
    if (!display.trim()) errors.push({ type: 'error', field: 'account_display_name', content: <><strong>Display name</strong> is a required field.</> });
    if (email.trim() !== customer.email) errors.push({ type: 'error', content: 'Your email address is how you sign in and cannot be changed here. Please contact us to change it.' });
    if (pw.current || pw.one || pw.two) errors.push({ type: 'error', content: 'Your password cannot be changed here. Please contact us to change it.' });
    if (errors.length) {
      setNotices(errors);
      return;
    }
    try {
      await updateAccount({ name: `${first.trim()} ${last.trim()}`.trim() });
      setNotices([{ type: 'success', content: 'Account details changed successfully.' }]);
    } catch (ex) {
      setNotices([{ type: 'error', content: messageOf(ex) }]);
    }
  };

  return (
    <>
      <NoticesWrapper notices={notices} />
      <form className="woocommerce-EditAccountForm edit-account" action="" method="post" onSubmit={save}>
        <p className="woocommerce-form-row woocommerce-form-row--first form-row form-row-first">
          <label htmlFor="account_first_name">First name&nbsp;<span className="required" aria-hidden="true">*</span></label>
          <input type="text" className="woocommerce-Input woocommerce-Input--text input-text" name="account_first_name" id="account_first_name" autoComplete="given-name" value={first} aria-required="true" onChange={(e) => setFirst(e.target.value)} />
        </p>
        <p className="woocommerce-form-row woocommerce-form-row--last form-row form-row-last">
          <label htmlFor="account_last_name">Last name&nbsp;<span className="required" aria-hidden="true">*</span></label>
          <input type="text" className="woocommerce-Input woocommerce-Input--text input-text" name="account_last_name" id="account_last_name" autoComplete="family-name" value={last} aria-required="true" onChange={(e) => setLast(e.target.value)} />
        </p>
        <div className="clear"></div>
        <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
          <label htmlFor="account_display_name">Display name&nbsp;<span className="required" aria-hidden="true">*</span></label>
          <input type="text" className="woocommerce-Input woocommerce-Input--text input-text" name="account_display_name" id="account_display_name" aria-describedby="account_display_name_description" value={display} aria-required="true" onChange={(e) => setDisplay(e.target.value)} />{' '}
          <span id="account_display_name_description"><em>This will be how your name will be displayed in the account section and in reviews</em></span>
        </p>
        <div className="clear"></div>
        <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
          <label htmlFor="account_email">Email address&nbsp;<span className="required" aria-hidden="true">*</span></label>
          <input type="email" className="woocommerce-Input woocommerce-Input--text input-text" name="account_email" id="account_email" autoComplete="email" value={email} aria-required="true" onChange={(e) => setEmail(e.target.value)} />
        </p>
        <fieldset>
          <legend>Password change</legend>
          <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
            <label htmlFor="password_current">Current password (leave blank to leave unchanged)</label>
            <PasswordInput name="password_current" id="password_current" autoComplete="off" value={pw.current} onChange={(x) => setPw((s) => ({ ...s, current: x }))} />
          </p>
          <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
            <label htmlFor="password_1">New password (leave blank to leave unchanged)</label>
            <PasswordInput name="password_1" id="password_1" autoComplete="off" value={pw.one} onChange={(x) => setPw((s) => ({ ...s, one: x }))} />
          </p>
          <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
            <label htmlFor="password_2">Confirm new password</label>
            <PasswordInput name="password_2" id="password_2" autoComplete="off" value={pw.two} onChange={(x) => setPw((s) => ({ ...s, two: x }))} />
          </p>
        </fieldset>
        <div className="clear"></div>
        <p>
          <button type="submit" className="woocommerce-Button button" name="save_account_details" value="Save changes">Save changes</button>
          <input type="hidden" name="action" value="save_account_details" />
        </p>
      </form>
    </>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!username.trim()) return setNotices([err('Username is required.')]);
    if (!password) return setNotices([err('The password field is empty.')]);
    setBusy(true);
    try {
      await login(username.trim(), password, remember);
      setNotices([]);
      navigate('/my-account/', { replace: true });
    } catch (ex) {
      setNotices([err(<>{messageOf(ex)} <a href="/my-account/lost-password/">Lost your password?</a></>)]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <NoticesWrapper notices={notices} />
      <h2>Login</h2>
      <form className="woocommerce-form woocommerce-form-login login" method="post" noValidate onSubmit={submit}>
        <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
          <label htmlFor="username">Username or email address&nbsp;<span className="required" aria-hidden="true">*</span><span className="screen-reader-text">Required</span></label>
          <input type="text" className="woocommerce-Input woocommerce-Input--text input-text" name="username" id="username" autoComplete="username" value={username} required aria-required="true" onChange={(e) => setUsername(e.target.value)} />
        </p>
        <p className="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">
          <label htmlFor="password">Password&nbsp;<span className="required" aria-hidden="true">*</span><span className="screen-reader-text">Required</span></label>
          <PasswordInput name="password" id="password" autoComplete="current-password" required value={password} onChange={setPassword} />
        </p>
        <p className="form-row">
          <label className="woocommerce-form__label woocommerce-form__label-for-checkbox woocommerce-form-login__rememberme">
            <input className="woocommerce-form__input woocommerce-form__input-checkbox" name="rememberme" type="checkbox" id="rememberme" value="forever" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> <span>Remember me</span>
          </label>{' '}
          <button type="submit" className="woocommerce-button button woocommerce-form-login__submit" name="login" value="Log in">Log in</button>
        </p>
        <p className="woocommerce-LostPassword lost_password">
          <a href="/my-account/lost-password/">Lost your password?</a>
        </p>
      </form>
    </>
  );
}

function LostPassword() {
  const [login, setLogin] = useState('');
  const [notices, setNotices] = useState<Notice[]>([]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setNotices([login.trim() ? { type: 'error', content: 'Passwords cannot be reset online yet. Please contact us and we will reset it for you.' } : { type: 'error', content: 'Enter a username or email address.' }]);
  };
  return (
    <>
      <NoticesWrapper notices={notices} />
      <form method="post" className="woocommerce-ResetPassword lost_reset_password" onSubmit={submit}>
        <p>Lost your password? Please enter your username or email address. You will receive a link to create a new password via email.</p>
        <p className="woocommerce-form-row woocommerce-form-row--first form-row form-row-first">
          <label htmlFor="user_login">Username or email&nbsp;<span className="required" aria-hidden="true">*</span><span className="screen-reader-text">Required</span></label>
          <input className="woocommerce-Input woocommerce-Input--text input-text" type="text" name="user_login" id="user_login" autoComplete="username" required aria-required="true" value={login} onChange={(e) => setLogin(e.target.value)} />
        </p>
        <div className="clear"></div>
        <p className="woocommerce-form-row form-row">
          <input type="hidden" name="wc_reset_password" value="true" />
          <button type="submit" className="woocommerce-Button button" value="Reset password">Reset password</button>
        </p>
      </form>
    </>
  );
}
