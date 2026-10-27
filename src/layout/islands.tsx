import { useLayoutEffect, useState, type ComponentType, type ReactPortal, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * The dynamic parts of a page (product grids, the cart count, the forms) live inside markup that
 * is injected verbatim. Each one is marked in that markup with `data-react="<name>"`, and React
 * renders the named component into it through a portal, so the island sits exactly where
 * WordPress put it with no wrapper element of our own.
 *
 * The marked element keeps the live site's markup as its content until a component takes it
 * over. A component flagged `keepFallback` (the stubs) renders nothing and leaves that markup in
 * place; any other component gets an emptied element and renders the markup itself.
 */

export interface IslandProps {
  /** The element's `data-*` attributes, e.g. `query`, `limit`, `columns`, `skin`. */
  dataset: Record<string, string | undefined>;
  /** The captured live markup the element held before React took it over. */
  fallbackHtml: string;
  /** The host element itself. */
  host: HTMLElement;
}

export type IslandComponent = ComponentType<IslandProps> & { keepFallback?: boolean };
export type IslandRegistry = Record<string, IslandComponent>;

const fallbacks = new WeakMap<Element, string>();

export function mountIslands(root: Element, components: IslandRegistry): ReactPortal[] {
  const portals: ReactPortal[] = [];
  root.querySelectorAll<HTMLElement>('[data-react]').forEach((host, i) => {
    const name = host.dataset.react as string;
    const C = components[name];
    if (!C) return;
    if (!fallbacks.has(host)) {
      fallbacks.set(host, host.innerHTML);
      if (!C.keepFallback) host.textContent = '';
    }
    portals.push(
      createPortal(<C dataset={{ ...host.dataset }} fallbackHtml={fallbacks.get(host) as string} host={host} />, host, `${name}-${i}`),
    );
  });
  return portals;
}

/** Portals for every island under `ref`, rescanned whenever `key` changes. */
export function useIslands(ref: RefObject<Element | null>, components: IslandRegistry, key: unknown): ReactPortal[] {
  const [portals, setPortals] = useState<ReactPortal[]>([]);
  useLayoutEffect(() => {
    if (ref.current) setPortals(mountIslands(ref.current, components));
  }, [ref, components, key]);
  return portals;
}
