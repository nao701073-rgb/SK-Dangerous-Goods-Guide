import nodemailer from 'nodemailer';
import { config } from './config.js';

const transporter = config.smtp.host ? nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  tls: { rejectUnauthorized: config.smtp.rejectUnauthorized }
}) : null;

export async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    console.log(`[MAIL-DEV] to=${to} subject=${subject}\n${text}`);
    return { developmentPreview: true };
  }
  return transporter.sendMail({ from: config.smtp.from, to, subject, text, html });
}

export function maskEmail(email='') {
  const [name, domain] = String(email).split('@');
  if (!domain) return '登録メールアドレス';
  const shown = name.length <= 2 ? `${name[0] || '*'}*` : `${name.slice(0,2)}${'*'.repeat(Math.min(6,name.length-2))}`;
  return `${shown}@${domain}`;
}
