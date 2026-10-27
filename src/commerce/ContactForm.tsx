import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../services/api';
import { messageOf } from './notices';

/**
 * The MetForm contact form on /contact-us/, as MetForm's own React app renders it into the page:
 * the response box at the top, then form 998's Elementor layout with Full Name, Email and Message.
 *
 * The form is set to answer "alert" style at the top, which is the markup below - a success
 * icon and line, or for an error the warning icon and the messages, shown for a few seconds and
 * then folded away again. None of the three fields is required on the live form; the email is
 * checked for shape only when one is given.
 *
 * It posts to Vertik as an enquiry. Vertik insists on a phone number for every enquiry, and the
 * live form does not ask for one; rather than add a field the client did not have, the enquiry
 * is filed with "not given" in its place, so the shop can see why it cannot ring back and
 * replies by email.
 */
const NO_PHONE = 'not given';
const SUCCESS = 'Thank you! Form submitted successfully.';
const EMAIL_MESSAGE = 'Please enter a valid Email address';
const HIDE_AFTER_MS = 5000;

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<{ ok: boolean; text: string } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const emailInvalid = (v: string) => v !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    if (emailInvalid(email.trim())) {
      setEmailError(true);
      return;
    }
    setSending(true);
    clearTimeout(hideTimer.current);
    try {
      await api.submitContact({
        name: name.trim() || email.trim() || 'Website visitor',
        phone: NO_PHONE,
        email: email.trim() || undefined,
        subject: 'Contact form - illumea.lk',
        message: message.trim(),
      });
      setResponse({ ok: true, text: SUCCESS });
      setName('');
      setEmail('');
      setMessage('');
      setSubmitted(false);
    } catch (err) {
      setResponse({ ok: false, text: messageOf(err) });
    } finally {
      setSending(false);
      hideTimer.current = setTimeout(() => setResponse(null), HIDE_AFTER_MS);
    }
  };

  return (
    <div id="mf-response-props-id-998" data-previous-steps-style="" data-editswitchopen="" data-response_type="alert" data-erroricon="fas fa-exclamation-triangle" data-successicon="fas fa-check" data-messageposition="top" className="   mf-scroll-top-no">
      <div className="formpicker_warper formpicker_warper_editable" data-metform-formpicker-key="998">
        <div className="mf-widget-container">
          <div id="metform-wrap-6248920-998" className="mf-form-wrapper" data-form-id="998" data-action="/wp-json/metform/v1/entries/insert/998" data-quiz-summery="false" data-save-progress="false" data-form-type="general-form" data-stop-vertical-effect="">
            <form className="metform-form-content" onSubmit={onSubmit} noValidate>
              <div className={`mf-main-response-wrap   mf-response-msg-wrap${response && !response.ok ? ' mf-error-res' : ''}`} data-show={response ? '1' : '0'}>
                <div className="mf-response-msg">
                  {response && !response.ok ? (
                    <>
                      <i className="mf-alert-icon fas fa-exclamation-triangle"></i>
                      <p>{response.text + ' '} </p>
                    </>
                  ) : (
                    <>
                      <i className="mf-success-icon fas fa-check"></i>
                      <p>{response?.text ?? ''}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="metform-form-main-wrapper">
                <div data-elementor-type="wp-post" data-elementor-id="998" className="elementor elementor-998">
                  <section className="elementor-section elementor-top-section elementor-element elementor-element-039b794 elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="039b794" data-element_type="section" data-e-type="section">
                    <div className="elementor-container elementor-column-gap-default">
                      <div className="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-6fd3457" data-id="6fd3457" data-element_type="column" data-e-type="column">
                        <div className="elementor-widget-wrap elementor-element-populated">
                          <div className="elementor-element elementor-element-43512a4 elementor-widget elementor-widget-mf-listing-fname" data-id="43512a4" data-element_type="widget" data-e-type="widget" data-settings='{"mf_input_name":"mf-listing-fname"}' data-widget_type="mf-listing-fname.default">
                            <div className="elementor-widget-container">
                              <div className="mf-input-wrapper">
                                <label className="mf-input-label" htmlFor="mf-input-text-43512a4">
                                  {'Full Name \t\t\t\t\t'}
                                  <span className="mf-input-required-indicator"></span>
                                </label>
                                <input type="text" className="mf-input " id="mf-input-text-43512a4" name="mf-listing-fname" placeholder="Full Name " aria-invalid="false" value={name} onChange={(e) => setName(e.target.value)} />
                              </div>
                            </div>
                          </div>
                          <div className="elementor-element elementor-element-cd63634 elementor-widget elementor-widget-mf-email" data-id="cd63634" data-element_type="widget" data-e-type="widget" data-settings='{"mf_input_name":"mf-email"}' data-widget_type="mf-email.default">
                            <div className="elementor-widget-container">
                              <div className="mf-input-wrapper">
                                <label className="mf-input-label" htmlFor="mf-input-email-cd63634">
                                  {'Email \t\t\t\t\t'}
                                  <span className="mf-input-required-indicator"></span>
                                </label>
                                <input
                                  type="email"
                                  className="mf-input "
                                  id="mf-input-email-cd63634"
                                  name="mf-email"
                                  placeholder="Email "
                                  aria-invalid={emailError ? 'true' : 'false'}
                                  value={email}
                                  onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (submitted) setEmailError(emailInvalid(e.target.value.trim()));
                                  }}
                                  onBlur={() => setEmailError(emailInvalid(email.trim()))}
                                />
                                {emailError && <span className="mf-error-message">{EMAIL_MESSAGE}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="elementor-element elementor-element-5c8896d elementor-widget elementor-widget-mf-textarea" data-id="5c8896d" data-element_type="widget" data-e-type="widget" data-settings='{"mf_input_name":"mf-textarea"}' data-widget_type="mf-textarea.default">
                            <div className="elementor-widget-container">
                              <div className="mf-input-wrapper">
                                <label className="mf-input-label" htmlFor="mf-input-text-area-5c8896d">
                                  {'Message \t\t\t\t\t'}
                                  <span className="mf-input-required-indicator"></span>
                                </label>
                                <textarea className="mf-input mf-textarea " id="mf-input-text-area-5c8896d" name="mf-textarea" placeholder="Message " cols={30} rows={10} aria-invalid="false" value={message} onChange={(e) => setMessage(e.target.value)}></textarea>
                              </div>
                            </div>
                          </div>
                          <div className="elementor-element elementor-element-c477acb mf-btn--left elementor-widget elementor-widget-mf-button" data-id="c477acb" data-element_type="widget" data-e-type="widget" data-widget_type="mf-button.default">
                            <div className="elementor-widget-container">
                              <div className="mf-btn-wraper " data-mf-form-conditional-logic-requirement="">
                                <button type="submit" className="metform-btn metform-submit-btn " id="" disabled={sending}>
                                  <span>Submit Button </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
