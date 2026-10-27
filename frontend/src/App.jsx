import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileImage,
  Globe2,
  LoaderCircle,
  Plus,
  ReceiptText,
  RotateCcw,
  Send,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import './App.css';

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'INR'];

function money(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(value);
  } catch {
    return `${Number(value).toFixed(2)} ${currency}`;
  }
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export default function App() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [payers, setPayers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [created, setCreated] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const setSelectedFile = (nextFile) => {
    if (!nextFile) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(nextFile.type)) {
      setError('Choose a JPEG, PNG, or WEBP image.');
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setError('This image is larger than 10 MB. Choose a smaller file.');
      return;
    }
    setFile(nextFile);
    setReceipt(null);
    setInvoices([]);
    setCreated([]);
    setError('');
    setNotice('');
  };

  const parseReceipt = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Choose a receipt image to continue.');
      return;
    }
    setBusy('parse');
    setError('');
    setNotice('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await requestJson('/api/receipts/parse', {
        method: 'POST',
        body: formData,
      });
      setReceipt(data);
      setPayers([{ id: crypto.randomUUID(), email: '', currency: data.currency, items: [] }]);
      setInvoices([]);
      setCreated([]);
      setNotice('Receipt parsed. Review the line items, then assign each item to a payer.');
    } catch (requestError) {
      setError(`${requestError.message}. Check that the backend is running and GEMINI_API_KEY is configured.`);
    } finally {
      setBusy('');
    }
  };

  const updatePayer = (id, changes) => {
    setPayers((current) => current.map((payer) => payer.id === id ? { ...payer, ...changes } : payer));
    setInvoices([]);
    setCreated([]);
  };

  const addPayer = () => {
    setPayers((current) => [...current, {
      id: crypto.randomUUID(),
      email: '',
      currency: receipt?.currency || 'USD',
      items: [],
    }]);
    setInvoices([]);
  };

  const removePayer = (id) => {
    setPayers((current) => current.filter((payer) => payer.id !== id));
    setInvoices([]);
    setCreated([]);
  };

  const toggleItem = (payerId, itemName) => {
    const owner = payers.find((payer) => payer.id !== payerId && payer.items.includes(itemName));
    if (owner) {
      setError(`${itemName} is already assigned to ${owner.email || 'another payer'}.`);
      return;
    }
    setError('');
    const payer = payers.find((entry) => entry.id === payerId);
    const items = payer.items.includes(itemName)
      ? payer.items.filter((name) => name !== itemName)
      : [...payer.items, itemName];
    updatePayer(payerId, { items });
  };

  const buildPreview = async () => {
    if (!receipt || !payers.length) {
      setError('Parse a receipt and add at least one payer.');
      return;
    }
    if (payers.some((payer) => !payer.email.trim() || !payer.items.length)) {
      setError('Add an email and assign at least one item to every payer.');
      return;
    }
    setBusy('preview');
    setError('');
    setNotice('');
    try {
      const data = await requestJson('/api/invoices/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_items: receipt.items,
          payers: payers.map(({ email, currency, items }) => ({ email: email.trim(), currency, items })),
          base_currency: receipt.currency,
        }),
      });
      setInvoices(data);
      setCreated([]);
      setNotice('Split preview ready. Nothing has been sent to PayPal.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  };

  const createDrafts = async () => {
    if (!invoices.length) return;
    setBusy('drafts');
    setError('');
    setNotice('');
    try {
      const data = await requestJson('/api/invoices/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_items: receipt.items,
          payers: payers.map(({ email, currency, items }) => ({ email: email.trim(), currency, items })),
          base_currency: receipt.currency,
        }),
      });
      setCreated(data);
      setNotice(`${data.length} sandbox draft${data.length === 1 ? '' : 's'} created.`);
    } catch (requestError) {
      setError(`${requestError.message}. Check your PayPal sandbox credentials in backend/.env.`);
    } finally {
      setBusy('');
    }
  };

  const reset = () => {
    setFile(null);
    setReceipt(null);
    setPayers([]);
    setInvoices([]);
    setCreated([]);
    setError('');
    setNotice('');
  };

  const assignedCount = payers.reduce((count, payer) => count + payer.items.length, 0);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="PayGlobe AI home">
          <span className="brand-mark"><Globe2 size={19} strokeWidth={2.2} /></span>
          <span>payglobe<span className="brand-ai">.ai</span></span>
        </a>
        <div className="topbar-right">
          <span className="workspace-label">RECEIPT DESK</span>
          <span className="sandbox-badge"><span />SANDBOX</span>
          <button className="icon-button reset-button" onClick={reset} title="Start a new receipt" aria-label="Start a new receipt">
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      <section className="intro" id="top">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" />MULTI-CURRENCY CHECKOUT</p>
          <h1>One receipt.<br /><span>Everyone pays their way.</span></h1>
          <p className="intro-copy">Read the check, assign the items, and prepare local-currency invoices.</p>
        </div>
        <div className="intro-stamp" aria-hidden="true">
          <span>FX</span>
          <ArrowDownRight size={26} />
          <span>PAY</span>
        </div>
      </section>

      {(error || notice) && (
        <div className={`feedback ${error ? 'feedback-error' : 'feedback-success'}`} role={error ? 'alert' : 'status'}>
          {error ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />}
          <span>{error || notice}</span>
          <button onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss message"><X size={15} /></button>
        </div>
      )}

      <div className="workbench">
        <section className="panel receipt-panel" aria-labelledby="receipt-heading">
          <div className="panel-heading">
            <div className="step-index">01</div>
            <div>
              <p className="panel-kicker">THE SOURCE</p>
              <h2 id="receipt-heading">Receipt details</h2>
            </div>
            {receipt && <span className="state-chip"><Check size={13} />READ</span>}
          </div>

          {!receipt ? (
            <form onSubmit={parseReceipt}>
              <div
                className={`drop-zone ${dragging ? 'drop-zone-active' : ''} ${file ? 'drop-zone-selected' : ''}`}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  setSelectedFile(event.dataTransfer.files[0]);
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setSelectedFile(event.target.files?.[0])}
                  aria-label="Choose a receipt image"
                />
                {previewUrl ? (
                  <img className="receipt-thumb" src={previewUrl} alt="Selected receipt preview" />
                ) : (
                  <span className="upload-symbol"><Upload size={20} /></span>
                )}
                <div className="drop-copy">
                  <strong>{file ? file.name : 'Drop your receipt here'}</strong>
                  <span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Ready to read` : 'or browse files · JPG, PNG, WEBP'}</span>
                </div>
                <button type="button" className="browse-button" onClick={() => inputRef.current?.click()}>
                  {file ? 'Replace' : 'Browse'}
                </button>
              </div>
              <div className="privacy-note"><FileImage size={14} /> Images are processed by Gemini and removed after parsing.</div>
              <button className="primary-button parse-button" type="submit" disabled={!file || busy === 'parse'}>
                {busy === 'parse' ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
                {busy === 'parse' ? 'Reading receipt…' : 'Read receipt'}
                <ArrowUpRight size={16} className="button-end-icon" />
              </button>
            </form>
          ) : (
            <div className="receipt-result">
              <div className="merchant-row">
                {previewUrl && <img className="merchant-thumb" src={previewUrl} alt="Receipt" />}
                <div className="merchant-info">
                  <span className="muted-label">MERCHANT</span>
                  <strong>{receipt.merchant_name}</strong>
                </div>
                <span className="currency-tag">{receipt.currency}</span>
              </div>
              <div className="item-list">
                <div className="item-list-head"><span>ITEM</span><span>AMOUNT</span></div>
                {receipt.items.map((item, index) => (
                  <div className="receipt-item" key={`${item.name}-${index}`}>
                    <span><i>{String(index + 1).padStart(2, '0')}</i>{item.name}</span>
                    <strong>{money(item.price, receipt.currency)}</strong>
                  </div>
                ))}
              </div>
              <div className="receipt-total">
                <div><span>RECEIPT TOTAL</span><strong>{money(receipt.total, receipt.currency)}</strong></div>
                <button className="text-button" onClick={reset}>Change receipt</button>
              </div>
              <p className="receipt-footnote">Check extracted details against the original before creating drafts.</p>
            </div>
          )}
        </section>

        <section className={`panel split-panel ${!receipt ? 'panel-locked' : ''}`} aria-labelledby="split-heading">
          <div className="panel-heading">
            <div className="step-index">02</div>
            <div>
              <p className="panel-kicker">THE SPLIT</p>
              <h2 id="split-heading">Assign the items</h2>
            </div>
            {receipt && <span className="assignment-count">{assignedCount}/{receipt.items.length} assigned</span>}
          </div>

          {!receipt ? (
            <div className="empty-state">
              <span className="empty-icon"><ReceiptText size={22} /></span>
              <strong>Waiting on a receipt</strong>
              <p>Once it’s read, add people and choose which items belong to each person.</p>
            </div>
          ) : (
            <>
              <div className="payer-list">
                {payers.map((payer, payerIndex) => (
                  <div className="payer-block" key={payer.id}>
                    <div className="payer-heading">
                      <span className="payer-number">PAYER {String(payerIndex + 1).padStart(2, '0')}</span>
                      {payers.length > 1 && (
                        <button className="icon-button remove-payer" onClick={() => removePayer(payer.id)} title="Remove payer" aria-label="Remove payer">
                          <X size={15} />
                        </button>
                      )}
                    </div>
                    <div className="payer-fields">
                      <label className="field-label email-field">
                        <span>EMAIL ADDRESS</span>
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={payer.email}
                          onChange={(event) => updatePayer(payer.id, { email: event.target.value })}
                        />
                      </label>
                      <label className="field-label currency-field">
                        <span>INVOICE IN</span>
                        <span className="select-wrap">
                          <select value={payer.currency} onChange={(event) => updatePayer(payer.id, { currency: event.target.value })}>
                            {currencies.map((currency) => <option key={currency}>{currency}</option>)}
                          </select>
                          <ChevronDown size={14} />
                        </span>
                      </label>
                    </div>
                    <div className="assignment-list">
                      <span className="assignment-label">THEIR ITEMS</span>
                      {receipt.items.map((item) => {
                        const checked = payer.items.includes(item.name);
                        const assignedElsewhere = payers.some((other) => other.id !== payer.id && other.items.includes(item.name));
                        return (
                          <label className={`assignment-option ${assignedElsewhere ? 'option-assigned' : ''}`} key={item.name}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={assignedElsewhere}
                              onChange={() => toggleItem(payer.id, item.name)}
                            />
                            <span className="custom-check">{checked && <Check size={12} />}</span>
                            <span className="assignment-name">{item.name}</span>
                            <span className="assignment-price">{money(item.price, receipt.currency)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button className="add-payer-button" onClick={addPayer}><Plus size={16} />Add another payer</button>
              <div className="split-actions">
                <button className="primary-button" onClick={buildPreview} disabled={busy === 'preview' || busy === 'drafts'}>
                  {busy === 'preview' ? <LoaderCircle className="spin" size={17} /> : <ReceiptText size={17} />}
                  {busy === 'preview' ? 'Calculating…' : 'Preview split'}
                  <ArrowUpRight size={16} className="button-end-icon" />
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {(invoices.length > 0 || created.length > 0) && (
        <section className="preview-section" aria-labelledby="preview-heading">
          <div className="preview-header">
            <div>
              <p className="panel-kicker">READY FOR REVIEW</p>
              <h2 id="preview-heading">Invoice preview</h2>
            </div>
            <span className={`preview-state ${created.length ? 'created-state' : ''}`}>
              {created.length ? <CheckCircle2 size={15} /> : <span className="preview-dot" />}
              {created.length ? 'DRAFTS CREATED' : 'PREVIEW ONLY'}
            </span>
          </div>
          <div className="invoice-table">
            <div className="invoice-table-head"><span>RECIPIENT</span><span>AMOUNT DUE</span><span>STATUS</span></div>
            {(created.length ? created : invoices).map((invoice, index) => (
              <div className="invoice-row" key={`${invoice.payer}-${index}`}>
                <div className="invoice-recipient"><span className="avatar-mark">{invoice.payer?.[0]?.toUpperCase() || 'P'}</span><span>{invoice.payer}</span></div>
                <strong className="invoice-amount">{money(invoice.amount, invoice.currency)}</strong>
                <span className={`invoice-status ${created.length ? 'status-created' : ''}`}>
                  {created.length ? `${invoice.status || 'DRAFT'} · ${invoice.id || 'CREATED'}` : 'NOT SENT'}
                </span>
              </div>
            ))}
          </div>
          <div className="preview-footer">
            <span><CircleAlert size={14} />Rates are indicative. Confirm the final amount in PayPal.</span>
            {!created.length && (
              <button className="create-button" onClick={createDrafts} disabled={busy === 'drafts'}>
                {busy === 'drafts' ? <LoaderCircle className="spin" size={16} /> : <Send size={15} />}
                {busy === 'drafts' ? 'Creating drafts…' : 'Create sandbox drafts'}
              </button>
            )}
          </div>
        </section>
      )}

      <footer className="app-footer">
        <span>PAYGLOBE AI <i>·</i> RECEIPT SPLIT WORKSPACE</span>
        <span><span className="footer-status" />Backend connection required</span>
      </footer>
    </main>
  );
}