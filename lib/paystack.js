const PAYSTACK_BASE = 'https://api.paystack.co';

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
}

// Kicks off a payment — returns an authorization_url to redirect the brand
// to Paystack's hosted checkout page.
export async function initializeTransaction({ email, amountNaira, reference, metadata, plan, callbackUrl }) {
  const body = {
    email,
    amount: Math.round(amountNaira * 100), // Paystack expects kobo, not naira
    reference,
    metadata,
  };
  if (plan) body.plan = plan;
  if (callbackUrl) body.callback_url = callbackUrl;

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Paystack initialize failed');
  return data.data; // { authorization_url, access_code, reference }
}

// Confirms a transaction actually succeeded — always call this from the
// webhook or callback handler, never trust the client alone.
export async function verifyTransaction(reference) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Paystack verify failed');
  return data.data; // includes status, amount, customer, authorization, plan_object, etc.
}

export async function disableSubscription(subscriptionCode, emailToken) {
  const res = await fetch(`${PAYSTACK_BASE}/subscription/disable`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
  });
  return res.json();
}

// ── Payouts (tester withdrawals to Nigerian bank accounts) ──────────────
// Everything below requires Transfers to actually be enabled on the
// Paystack account, separate from being able to accept payments — check
// the Paystack dashboard if these start failing with a permissions error.

export async function listBanks() {
  const res = await fetch(`${PAYSTACK_BASE}/bank?currency=NGN`, { headers: authHeaders() });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Could not fetch bank list');
  return data.data; // [{ name, code, ... }]
}

// Confirms an account number actually belongs to a real account before
// anyone gets paid to it — this is what catches typos before they become
// lost money.
export async function resolveAccount(accountNumber, bankCode) {
  const res = await fetch(
    `${PAYSTACK_BASE}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    { headers: authHeaders() }
  );
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Could not resolve this account — double-check the number and bank.');
  return data.data; // { account_number, account_name }
}

// A "recipient" only needs to be created once per bank account — reuse
// the returned recipient_code for every future transfer to the same
// person instead of recreating it each time.
export async function createTransferRecipient({ name, accountNumber, bankCode }) {
  const res = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ type: 'nuban', name, account_number: accountNumber, bank_code: bankCode, currency: 'NGN' }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Could not register this bank account with Paystack');
  return data.data; // { recipient_code, ... }
}

// Actually moves money out of your Paystack balance to the recipient.
// amountNaira is whole naira — converted to kobo here, same as payments.
export async function initiateTransfer({ amountNaira, recipientCode, reason, reference }) {
  const res = await fetch(`${PAYSTACK_BASE}/transfer`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      source: 'balance',
      amount: Math.round(amountNaira * 100),
      recipient: recipientCode,
      reason,
      reference,
    }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Transfer could not be started');
  return data.data; // { reference, status ('success'|'pending'|'otp'), transfer_code, ... }
}

// Transfers aren't always instant — this is how the bot checks back on
// one that was left 'pending' or wasn't confirmed by webhook yet.
export async function verifyTransfer(reference) {
  const res = await fetch(`${PAYSTACK_BASE}/transfer/verify/${encodeURIComponent(reference)}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Could not verify transfer status');
  return data.data; // { status: 'success' | 'failed' | 'pending' | 'reversed', ... }
}

// USD -> NGN is only needed if you price in USD elsewhere in the UI —
// Paystack itself charges whatever currency your account settles in.
// For now this app charges directly in NGN; see billing page for the
// displayed USD-equivalent note.
