/**
 * Elementor wires up its widgets once, on document ready, by walking the elements already in the
 * page. Here the page arrives later and changes on every route, so each freshly injected tree is
 * walked the same way: `runReadyTrigger` on every `.elementor-element`, in document order, which
 * is what gives entrance animations, carousels, counters and the mobile menu their behaviour.
 *
 * An element is triggered once. Running a handler twice builds a second Swiper inside the first,
 * and React's development double effects would do exactly that.
 */

interface ElementorFrontend {
  elementsHandler?: { runReadyTrigger(el: Element): void };
}

declare global {
  interface Window {
    elementorFrontend?: ElementorFrontend;
  }
}

const triggered = new WeakSet<Element>();

/**
 * Elementor's frontend initialises itself once, on jQuery ready, over whatever is in the document
 * at that moment. React mounts before that (the module script runs while the document is still
 * 'interactive'), so on a full page load the first route is already in place and Elementor has
 * already given every carousel its Swiper. Walking it again built a second Swiper on each, and
 * two autoplays then drove one carousel: 8 instances where the live page has 4. Whatever exists
 * when Elementor first answers is therefore marked as done; only elements rendered after that,
 * by a later route, are ours to trigger.
 */
let nativePassSeen = false;
function claimElementorsOwnPass(): void {
  if (nativePassSeen) return;
  nativePassSeen = true;
  document.querySelectorAll('.elementor-element').forEach((el) => triggered.add(el));
}

export function whenElementorReady(fn: () => void): void {
  if (window.elementorFrontend?.elementsHandler) {
    fn();
    return;
  }
  const tick = () => {
    if (window.elementorFrontend?.elementsHandler) fn();
    else setTimeout(tick, 30);
  };
  tick();
}

/**
 * An element whose widget container is a React island is left alone: Elementor Pro's form
 * handler would otherwise bind its own AJAX submit to the newsletter form React now owns.
 */
function hostsIsland(el: Element): boolean {
  return !!el.querySelector(':scope > .elementor-widget-container[data-react]') || !!el.closest('[data-react]');
}

export function runElementorHandlers(root: Element, force = false): void {
  whenElementorReady(() => {
    const handler = window.elementorFrontend!.elementsHandler!;
    claimElementorsOwnPass();
    const els = root.matches('.elementor-element') ? [root, ...root.querySelectorAll('.elementor-element')] : Array.from(root.querySelectorAll('.elementor-element'));
    for (const el of els) {
      if (!el.isConnected) continue;
      if (!force && (triggered.has(el) || hostsIsland(el))) continue;
      triggered.add(el);
      try {
        handler.runReadyTrigger(el);
      } catch (e) {
        console.error('Elementor handler failed on', el, e);
      }
    }
    document.dispatchEvent(new Event('elementor/lazyload/observe'));
  });
}

/** Re-run handlers on a subtree whose markup React replaced, e.g. a product grid after its data arrived. */
export function rerunElementorHandlers(root: Element): void {
  runElementorHandlers(root, true);
}

const loading = new Map<string, Promise<void>>();

/** Load a classic script once, for a page that needs one the home page does not load. */
export function loadScript(src: string): Promise<void> {
  const existing = loading.get(src);
  if (existing) return existing;
  const p = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load ' + src));
    document.body.appendChild(s);
  });
  loading.set(src, p);
  return p;
}
