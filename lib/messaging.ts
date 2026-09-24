import nodemailer, { type Transporter } from 'nodemailer';
import { APP_NAME } from './config';

export interface Channels {
  email: boolean;
  sms: boolean;
  testMode: boolean;
}

export function channels(): Channels {
  return {
    email: Boolean(process.env.SMTP_HOST),
    sms: Boolean(process.env.ARKESEL_API_KEY),
    // Shows sign-in codes on screen when nothing can be sent. Never use for a real vote.
    testMode: process.env.OTP_TEST_MODE === 'true' || process.env.NODE_ENV !== 'production',
  };
}

let transport: Transporter | null = null;

function mailer(): Transporter {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      pool: true,
      maxConnections: 3,
    });
  }
  return transport;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Plain paragraphs, lightly styled. Lines that start with "  " are shown as a code block.
export function renderEmail(paragraphs: string[]): { text: string; html: string } {
  const text = paragraphs.map((p) => p.trim()).join('\n\n');
  const body = paragraphs
    .map((p) =>
      p.startsWith('  ')
        ? `<p style="font:700 28px/1.2 ui-monospace,Menlo,monospace;letter-spacing:4px;margin:24px 0;color:#13201a">${escapeHtml(p.trim())}</p>`
        : `<p style="margin:0 0 16px">${escapeHtml(p)}</p>`,
    )
    .join('');
  const html = `<div style="font:16px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#13201a;max-width:520px;padding:8px">${body}<p style="margin:32px 0 0;color:#5a6a61;font-size:13px">${escapeHtml(APP_NAME)}</p></div>`;
  return { text, html };
}

export async function sendEmail(to: string, subject: string, paragraphs: string[]): Promise<boolean> {
  if (!channels().email) {
    console.info(`[email not configured] to=${to} subject="${subject}"`);
    return false;
  }
  const { text, html } = renderEmail(paragraphs);
  await mailer().sendMail({
    from: process.env.EMAIL_FROM || `${APP_NAME} <no-reply@${process.env.SMTP_HOST}>`,
    to,
    subject,
    text,
    html,
  });
  return true;
}

// Arkesel (arkesel.com) is a Ghanaian SMS gateway; phones are stored as 233XXXXXXXXX.
export async function sendSms(to: string, message: string): Promise<boolean> {
  if (!channels().sms) {
    console.info(`[sms not configured] to=${to}`);
    return false;
  }
  const res = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
    method: 'POST',
    headers: { 'api-key': process.env.ARKESEL_API_KEY as string, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: (process.env.SMS_SENDER_ID || APP_NAME.replace(/\s/g, '')).slice(0, 11),
      message,
      recipients: [to],
    }),
  });
  if (!res.ok) throw new Error(`SMS failed with status ${res.status}`);
  const body = (await res.json().catch(() => null)) as { status?: string } | null;
  if (body?.status && body.status !== 'success') throw new Error('SMS was not accepted');
  return true;
}
