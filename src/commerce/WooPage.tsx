import { useEffect, useRef, type ReactNode } from 'react';
import { runElementorHandlers } from '../layout/elementor';

/**
 * The page WordPress prints around an Elementor Pro WooCommerce widget - the cart and the
 * checkout are both built this way on the live site: a banner section with the page's heading,
 * then one section holding the widget.
 *
 * The banner is the captured markup injected as is, so its fade-in heading animates exactly as
 * it does live once Elementor's handlers run over it. The widget's own element is React and
 * deliberately carries no `data-widget_type`: that attribute is how Elementor Pro decides to
 * attach its cart/checkout script, which would post coupons and totals to a WordPress that is
 * not there. Every class the stylesheets select on is kept.
 */
interface Props {
  mainClass: string;
  pageId: string;
  title: string;
  hero: { section: string; column: string; widget: string };
  body: { section: string; column: string; widget: string; widgetClass: string };
  children: ReactNode;
}

function heroInner(column: string, widget: string, title: string) {
  return `
							<div class="elementor-background-overlay"></div>
							<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-${column}" data-id="${column}" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-${widget} elementor-invisible elementor-widget elementor-widget-heading" data-id="${widget}" data-element_type="widget" data-e-type="widget" data-settings="{&quot;_animation&quot;:&quot;fadeInUp&quot;,&quot;_animation_delay&quot;:200}" data-widget_type="heading.default">
				<div class="elementor-widget-container">
					<h1 class="elementor-heading-title elementor-size-default">${title}</h1>				</div>
				</div>
					</div>
		</div>
					</div>
		`;
}

export function WooPage({ mainClass, pageId, title, hero, body, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current) runElementorHandlers(ref.current);
  }, []);

  return (
    <main id="content" ref={ref} className={mainClass}>
      <div className="page-content">
        <div data-elementor-type="wp-page" data-elementor-id={pageId} className={`elementor elementor-${pageId}`}>
          <section
            className={`elementor-section elementor-top-section elementor-element elementor-element-${hero.section} elementor-section-boxed elementor-section-height-default elementor-section-height-default`}
            data-id={hero.section}
            data-element_type="section"
            data-e-type="section"
            data-settings='{"background_background":"classic"}'
            dangerouslySetInnerHTML={{ __html: heroInner(hero.column, hero.widget, title) }}
          />
          <section
            className={`elementor-section elementor-top-section elementor-element elementor-element-${body.section} elementor-section-boxed elementor-section-height-default elementor-section-height-default`}
            data-id={body.section}
            data-element_type="section"
            data-e-type="section"
          >
            <div className="elementor-container elementor-column-gap-default">
              <div className={`elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-${body.column}`} data-id={body.column} data-element_type="column" data-e-type="column">
                <div className="elementor-widget-wrap elementor-element-populated">
                  <div className={`elementor-element elementor-element-${body.widget} ${body.widgetClass}`} data-id={body.widget} data-element_type="widget" data-e-type="widget">
                    <div className="elementor-widget-container">{children}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

/** `$.scroll_to_notices`: WooCommerce brings a new notice to 100px below the top of the window. */
export function scrollToNotice(el: Element | null) {
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 100;
  window.scrollTo({ top, behavior: 'smooth' });
}
