import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/api.mts';

function post(path, body) {
  return handler(new Request(`https://payglobe.test/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

test('public demo supports sample receipt, converted split, and simulated drafts without external services', async () => {
  const receiptResponse = await post('receipts/parse', {});
  assert.equal(receiptResponse.status, 200);
  const receipt = await receiptResponse.json();
  assert.equal(receipt.demo, true);
  assert.equal(receipt.items.reduce((sum, item) => sum + item.price, 0), receipt.total);
  const body = {
    receipt_items: receipt.items,
    base_currency: receipt.currency,
    payers: [{ email: 'mira@example.com', currency: 'EUR', items: receipt.items.map(item => item.name) }],
  };
  const previewResponse = await post('invoices/preview', body);
  assert.equal(previewResponse.status, 200);
  const preview = await previewResponse.json();
  assert.equal(preview[0].amount, 37.72);
  const drafts = await (await post('invoices/drafts', body)).json();
  assert.equal(drafts[0].status, 'SIMULATED');
  assert.equal(drafts[0].demo, true);
  assert.match(drafts[0].id, /^DEMO-/);
});

test('rejects unknown, duplicate, and invalid payer assignments', async () => {
  const payer = { email: 'mira@example.com', currency: 'USD', items: ['Lunch'] };
  const body = { receipt_items: [{ name: 'Lunch', price: 12 }], payers: [payer] };
  for (const invalid of [
    { ...body, payers: [{ ...payer, items: ['Missing'] }] },
    { ...body, payers: [payer, payer] },
    { ...body, payers: [{ ...payer, email: 'invalid' }] },
    { ...body, base_currency: 'XYZ' },
    { ...body, receipt_items: [{ name: 'Lunch', price: -12 }] },
  ]) {
    assert.equal((await post('invoices/preview', invalid)).status, 400);
  }
});

test('API returns JSON errors for invalid JSON, unknown routes, and unsupported methods', async () => {
  assert.equal((await handler(new Request('https://payglobe.test/api/invoices/preview', { method: 'POST', body: '{' }))).status, 400);
  assert.equal((await post('missing', {})).status, 404);
  const response = await handler(new Request('https://payglobe.test/api/receipts/parse'));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'POST');
});
