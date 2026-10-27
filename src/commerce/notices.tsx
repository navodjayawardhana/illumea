import type { ReactNode, Ref } from 'react';

/**
 * WooCommerce's three notice templates (`notices/success.php`, `error.php`, `notice.php`) as
 * they print in WooCommerce 10: a success is a `.woocommerce-message` div, an error is a
 * `ul.woocommerce-error` with one `li` per message, and information is a `.woocommerce-info`
 * div. `woocommerce.css` draws the coloured bar and icon from those classes alone.
 *
 * A notice's content is React rather than HTML so a product name a shopper can influence never
 * reaches the page as markup.
 */
export interface Notice {
  type: 'success' | 'error' | 'info';
  /** For an error tied to a field, the field's id, which WooCommerce writes as `data-id`. */
  field?: string;
  content: ReactNode;
}

export function Notices({ notices }: { notices: Notice[] }) {
  const errors = notices.filter((n) => n.type === 'error');
  return (
    <>
      {notices.filter((n) => n.type === 'success').map((n, i) => (
        <div key={`s${i}`} className="woocommerce-message" role="alert">{n.content}</div>
      ))}
      {errors.length > 0 && (
        <ul className="woocommerce-error" role="alert">
          {errors.map((n, i) => <li key={i} data-id={n.field}>{n.content}</li>)}
        </ul>
      )}
      {notices.filter((n) => n.type === 'info').map((n, i) => (
        <div key={`i${i}`} className="woocommerce-info" role="status">{n.content}</div>
      ))}
    </>
  );
}

/** `.woocommerce-notices-wrapper`, which every WooCommerce page prints even when it is empty. */
export function NoticesWrapper({ notices, ref }: { notices: Notice[]; ref?: Ref<HTMLDivElement> }) {
  return <div ref={ref} className="woocommerce-notices-wrapper"><Notices notices={notices} /></div>;
}

/** An error from Vertik, the browser or a dead connection, in words a shopper can read. */
export function messageOf(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return 'Something went wrong. Please try again.';
}
