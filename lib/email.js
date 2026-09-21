import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Swap this once you've verified your own domain in Resend — until then,
// onboarding@resend.dev works for testing but looks less legit to brands.
const FROM = process.env.RESEND_FROM_EMAIL || 'TaskGrind <onboarding@resend.dev>';

async function send({ to, subject, text }) {
  if (!process.env.RESEND_API_KEY) {
    console.error('[email] RESEND_API_KEY not set — skipping send to', to);
    return null;
  }
  try {
    return await resend.emails.send({ from: FROM, to, subject, text });
  } catch (err) {
    console.error('[email] send failed:', err.message);
    return null;
  }
}

export async function sendPasswordResetEmail(to, resetUrl) {
  return send({
    to,
    subject: 'Reset your TaskGrind password',
    text: `Hey,

Looks like you asked to reset your TaskGrind password. Click the link below to pick a new one:

${resetUrl}

This link works for 1 hour. If you didn't request this, just ignore this email — your password's still safe.

— TaskGrind`,
  });
}

export async function sendNewApplicantEmail(to, { campaignTitle, testerHandle }) {
  return send({
    to,
    subject: `New applicant for "${campaignTitle}"`,
    text: `Hey,

Someone just applied to your campaign "${campaignTitle}" and answered your screening questions. Worth a quick look when you get a chance:

https://app.taskgrind.app/dashboard

— TaskGrind`,
  });
}

export async function sendProofSubmittedEmail(to, { campaignTitle }) {
  return send({
    to,
    subject: `Proof submitted for "${campaignTitle}"`,
    text: `Hey,

A tester just submitted their proof for "${campaignTitle}" — it's sitting in your dashboard ready for review:

https://app.taskgrind.app/dashboard

— TaskGrind`,
  });
}

export async function sendExistingAccountNoticeEmail(to) {
  return send({
    to,
    subject: 'Someone tried to sign up with your email',
    text: `Hey,

Someone just tried to create a new TaskGrind account using this email address. You already have an account, so nothing changed — if this was you, just log in normally:

https://app.taskgrind.app/login

Forgot your password? You can reset it here:

https://app.taskgrind.app/forgot-password

If this wasn't you, no action needed — your account is safe, nothing was created or changed.

— TaskGrind`,
  });
}
