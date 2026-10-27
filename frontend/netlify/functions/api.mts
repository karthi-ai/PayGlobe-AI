import type { Config } from '@netlify/functions';

function sampleReceipt() {
  return {
    demo: true,
    merchant_name: 'Cafe Milano · sample receipt',
    currency: 'USD',
    items: [
      { name: 'Margherita Pizza', price: 18.5 },
      { name: 'Garlic Bread', price: 6 },
      { name: 'Iced Tea (2)', price: 9 },
      { name: 'Tax', price: 2.5 },
      { name: 'Tip', price: 5 },
    ],
    total: 41,
  };
}

function previewInvoices(body: any) {
  const rates: Record<string, number> = { USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, INR: 83.2 };
  const { receipt_items: items, payers, base_currency: base = 'USD' } = body;
  if (!Array.isArray(items) || !items.length || !Array.isArray(payers) || !payers.length || !Object.hasOwn(rates, base)) {
    throw new Error('Provide receipt items, payers, and a supported base currency.');
  }
  const prices = new Map<string, number>();
  for (const item of items) {
    if (typeof item?.name !== 'string' || !item.name.trim() || prices.has(item.name) || typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0) {
      throw new Error('Receipt items need unique names and valid nonnegative prices.');
    }
    prices.set(item.name, item.price);
  }
  const assigned = new Set<string>();
  return payers.map((payer: any) => {
    if (typeof payer?.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payer.email) || !Object.hasOwn(rates, payer.currency) || !Array.isArray(payer.items) || !payer.items.length) {
      throw new Error('Every payer needs a valid email, supported currency, and at least one item.');
    }
    let subtotal = 0;
    for (const name of payer.items) {
      if (!prices.has(name) || assigned.has(name)) throw new Error('Each selected receipt item must exist and be assigned only once.');
      assigned.add(name);
      subtotal += prices.get(name)!;
    }
    return {
      payer: payer.email,
      currency: payer.currency,
      amount: Math.round((subtotal * rates[payer.currency] / rates[base] + Number.EPSILON) * 100) / 100,
      demo: true,
    };
  });
}

export default async (request: Request) => {
  const path = new URL(request.url).pathname;
  const known = ['/api/receipts/parse', '/api/invoices/preview', '/api/invoices/drafts'];
  if (!known.includes(path)) return Response.json({ error: 'API route not found.' }, { status: 404 });
  if (request.method !== 'POST') return Response.json({ error: 'Use POST for this endpoint.' }, { status: 405, headers: { Allow: 'POST' } });
  try {
    if (path === '/api/receipts/parse') {
      // Demo intentionally uses fixed sample data; uploaded images are never parsed or stored.
      return Response.json(sampleReceipt());
    }
    const invoices = previewInvoices(await request.json());
    if (path === '/api/invoices/drafts') {
      return Response.json(invoices.map((invoice, index) => ({
        ...invoice,
        id: `DEMO-${index + 1}`,
        status: 'SIMULATED',
      })));
    }
    return Response.json(invoices);
  } catch (error) {
    return Response.json({ error: error instanceof SyntaxError ? 'Send a valid JSON request.' : error instanceof Error ? error.message : 'Invalid request.' }, { status: 400 });
  }
};

export const config: Config = { path: '/api/*' };
