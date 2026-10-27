import { useMemo, useState, type FormEvent } from 'react';
import { api } from '../services/api';
import { messageOf } from './notices';
import type { IslandProps } from '../layout/islands';

/**
 * The footer's "Claim Exclusive Offer!" signup: an Elementor Pro form with one email field.
 *
 * Its submit behaves the way Elementor Pro's form handler does - the form fades to 45% and the
 * button gains a spinner while it works, then a `.elementor-message` line is appended under
 * the fields saying it worked or why not. The shell does not let Elementor's own handler attach
 * here (it would post to a WordPress that is not there), so this is the only submit.
 *
 * Vertik keeps no mailing list; `api.subscribeNewsletter` files the address as an enquiry, which
 * Vertik will not take without a phone number. The live form asks for none, so it is sent as
 * "not given" rather than adding a field.
 */
const NO_PHONE = 'not given';
const SUCCESS = 'Your submission was successful.';

function hidden(fallbackHtml: string | undefined, name: string, otherwise: string): string {
  if (!fallbackHtml) return otherwise;
  const m = new RegExp(`name="${name}" value="([^"]*)"`).exec(fallbackHtml);
  return m ? m[1].replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"') : otherwise;
}

export function NewsletterForm({ fallbackHtml }: Partial<IslandProps>) {
  const fields = useMemo(
    () => ({
      postId: hidden(fallbackHtml, 'post_id', '96'),
      formId: hidden(fallbackHtml, 'form_id', '46c9f267'),
      refererTitle: hidden(fallbackHtml, 'referer_title', document.title),
      queriedId: hidden(fallbackHtml, 'queried_id', '128'),
    }),
    [fallbackHtml],
  );
  const [email, setEmail] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (waiting) return;
    setResult(null);
    setWaiting(true);
    try {
      await api.subscribeNewsletter(email.trim(), NO_PHONE);
      setEmail('');
      setResult({ ok: true, text: SUCCESS });
    } catch (err) {
      setResult({ ok: false, text: messageOf(err) });
    } finally {
      setWaiting(false);
    }
  };

  return (
    <form className={`elementor-form${waiting ? ' elementor-form-waiting' : ''}`} method="post" name="New Form" onSubmit={onSubmit} style={waiting ? { opacity: 0.45 } : result ? { opacity: 1 } : undefined}>
      <input type="hidden" name="post_id" value={fields.postId} />
      <input type="hidden" name="form_id" value={fields.formId} />
      <input type="hidden" name="referer_title" value={fields.refererTitle} />
      <input type="hidden" name="queried_id" value={fields.queriedId} />
      <div className="elementor-form-fields-wrapper elementor-labels-">
        <div className="elementor-field-type-email elementor-field-group elementor-column elementor-field-group-email elementor-col-100 elementor-field-required">
          <label htmlFor="form-field-email" className="elementor-field-label elementor-screen-only">
            Email
          </label>
          <input
            size={1}
            type="email"
            name="form_fields[email]"
            id="form-field-email"
            className="elementor-field elementor-size-md  elementor-field-textual"
            placeholder="Email"
            required
            aria-required="true"
            aria-invalid={result ? 'false' : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="elementor-field-group elementor-column elementor-field-type-submit elementor-col-100 e-form__buttons">
          <button type="submit" className="elementor-button elementor-size-md" disabled={waiting}>
            <span>
              {waiting && (
                <span className="elementor-button-text elementor-form-spinner">
                  <i className="fa fa-spinner fa-spin"></i>&nbsp;
                </span>
              )}
              <span className=" elementor-button-icon"></span>
              <span className="elementor-button-text">Claim Exclusive Offer!</span>
            </span>
          </button>
        </div>
      </div>
      {result && (
        <div className={`elementor-message ${result.ok ? 'elementor-message-success' : 'elementor-message-danger'}`} role="alert">
          {result.text}
        </div>
      )}
    </form>
  );
}
