import { useEffect, useRef } from 'react';
import { PAGE_META, type PageKey } from './pageMeta';
import { runElementorHandlers } from './elementor';
import { useIslands } from './islands';
import { ISLANDS } from './registry';

/**
 * A static page: the live page's `<main>` content, injected verbatim, with its islands mounted
 * and Elementor's handlers run over it once it is in the document.
 */
export default function HtmlPage({ page, html }: { page: PageKey; html: string }) {
  const ref = useRef<HTMLElement>(null);
  const portals = useIslands(ref, ISLANDS, html);

  useEffect(() => {
    if (ref.current) runElementorHandlers(ref.current);
  }, [html]);

  return (
    <>
      <main id="content" ref={ref} className={PAGE_META[page].mainClass} dangerouslySetInnerHTML={{ __html: html }} />
      {portals}
    </>
  );
}
