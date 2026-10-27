import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import headerHtml from './html/header.html?raw';
import footerHtml from './html/footer.html?raw';
import { applyPage, pageKeyFor } from './head';
import { runElementorHandlers } from './elementor';
import { useIslands } from './islands';
import { ISLANDS } from './registry';

/**
 * The shell every page shares, as WordPress prints it: `#page`, the Header Footer Elementor
 * header and footer injected verbatim, and the route's page between them.
 *
 * The header and footer are injected once and never re-rendered; a route change only swaps the
 * head stylesheets, the body class and the menu item marked current, the way a fresh page load
 * on the live site would.
 */

const Chrome = memo(function Chrome({ tag }: { tag: 'header' | 'footer' }) {
  const ref = useRef<HTMLElement>(null);
  const portals = useIslands(ref, ISLANDS, tag);
  useEffect(() => {
    if (ref.current) runElementorHandlers(ref.current);
  }, []);
  return (
    <>
      {tag === 'header' ? (
        <header id="masthead" ref={ref} itemScope itemType="https://schema.org/WPHeader" dangerouslySetInnerHTML={{ __html: headerHtml }} />
      ) : (
        <footer ref={ref} itemType="https://schema.org/WPFooter" itemScope id="colophon" role="contentinfo" dangerouslySetInnerHTML={{ __html: footerHtml }} />
      )}
      {portals}
    </>
  );
});

const SKIP = /^\/(wp-content|wp-includes|wp-admin|wp-json|xmlrpc\.php)/;

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    applyPage(pageKeyFor(location.pathname), location.pathname);
  }, [location.pathname]);

  // WordPress redirects /shop to /shop/; the router would match both, so normalise here.
  useLayoutEffect(() => {
    if (!location.pathname.endsWith('/')) {
      navigate(location.pathname + '/' + location.search + location.hash, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  // Links inside injected markup are plain <a> tags; same-site ones become client navigations.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || SKIP.test(url.pathname)) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
      e.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [navigate]);

  return (
    <div id="page" className="hfeed site">
      <Chrome tag="header" />
      <Outlet />
      <Chrome tag="footer" />
    </div>
  );
}
