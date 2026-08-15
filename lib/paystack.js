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

// USD -> NGN is only needed if you price in USD elsewhere in the UI —
// Paystack itself charges whatever currency your account settles in.
// For now this app charges directly in NGN; see billing page for the
// displayed USD-equivalent note.
