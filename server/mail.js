import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, PORTAL_URL } = process.env;

export const mailConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = mailConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

const portalUrl = PORTAL_URL || 'http://localhost:5173';

// official TAG brand palette — Mag Red / Steel Grey
const BRAND = '#cb3127';
const BRAND_DARK = '#a92823';
const STEEL = '#727071';
const logoUrl = `${portalUrl.replace(/\/$/, '')}/brand/TAG-logo.png`;

function layout(title, body, { eyebrow } = {}) {
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f5;padding:32px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
      <div style="background:linear-gradient(135deg,${BRAND},${BRAND_DARK});padding:28px 32px;text-align:left">
        <div style="display:inline-block;background:#fff;border-radius:10px;padding:6px 10px;margin-bottom:14px">
          <img src="${logoUrl}" alt="TAG" height="20" style="display:block" />
        </div>
        <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.02em">TIDE</div>
        <div style="color:rgba(255,255,255,0.85);font-size:11px;letter-spacing:2.5px;margin-top:2px">TAG &middot; INTEGRATED &middot; DIGITAL &middot; ENTERPRISE</div>
      </div>
      <div style="height:4px;background:linear-gradient(90deg,${BRAND},${STEEL})"></div>
      <div style="padding:36px 32px">
        ${eyebrow ? `<div style="display:inline-block;background:#fcf3f2;color:${BRAND};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 12px;border-radius:999px;margin-bottom:14px">${eyebrow}</div>` : ''}
        <h2 style="margin:0 0 18px;color:#18181b;font-size:20px;font-weight:800">${title}</h2>
        ${body}
        <p style="margin:28px 0 0">
          <a href="${portalUrl}" style="background:${BRAND};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;display:inline-block;box-shadow:0 4px 14px rgba(203,49,39,0.35)">Open TIDE →</a>
        </p>
      </div>
      <div style="padding:18px 32px;background:#fafafa;color:#a1a1aa;font-size:11.5px;border-top:1px solid #f0f0f0">
        Automated notification from <b style="color:${STEEL}">TIDE</b> &middot; Authorized personnel only &middot; TAG Corporation
      </div>
    </div>
  </div>`;
}

export async function sendMail(to, subject, html) {
  if (!mailConfigured) {
    console.log(`[mail] SMTP not configured — skipped email to ${Array.isArray(to) ? to.join(', ') : to}: "${subject}"`);
    return { skipped: true };
  }
  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM || `"TIDE" <${SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[mail] sent "${subject}" to ${Array.isArray(to) ? to.join(', ') : to}`);
    return info;
  } catch (err) {
    console.error(`[mail] failed to send "${subject}":`, err.message);
    return { error: err.message };
  }
}

function credentialRow(label, value, { mono = false, copyable = false } = {}) {
  return `
    <tr>
      <td style="padding:10px 0;color:#71717a;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;width:110px;vertical-align:top">${label}</td>
      <td style="padding:10px 0">
        <span style="font-family:${mono ? "'Courier New',monospace" : 'inherit'};font-size:15px;font-weight:700;color:#18181b;background:${copyable ? '#fcf3f2' : 'transparent'};padding:${copyable ? '4px 10px' : '0'};border-radius:6px">${value}</span>
      </td>
    </tr>`;
}

export function sendWelcomeMail(user, plainPassword) {
  const body = `
    <p style="color:#3f3f46;font-size:14.5px;line-height:1.7">Hi <b>${user.name}</b>,</p>
    <p style="color:#3f3f46;font-size:14.5px;line-height:1.7">
      Your account on <b style="color:${BRAND}">TIDE</b> — TAG's single sign-on portal — is ready.
      Everything your department needs is now one click away.
    </p>

    <div style="border:1px solid #f0e0df;background:#fefbfb;border-radius:14px;padding:18px 22px;margin:20px 0">
      <table style="width:100%;border-collapse:collapse">
        ${credentialRow('Username', user.username, { copyable: true })}
        ${credentialRow('Password', plainPassword, { mono: true, copyable: true })}
        ${credentialRow('Department', user.department)}
        ${credentialRow('Role', `<span style="text-transform:capitalize">${user.role}</span>`)}
      </table>
    </div>

    <div style="margin:22px 0;padding:16px 18px;background:#fafafa;border-left:3px solid ${STEEL};border-radius:8px">
      <div style="font-size:12px;font-weight:700;color:#3f3f46;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px">Next steps</div>
      <ol style="margin:0;padding-left:18px;color:#52525b;font-size:13.5px;line-height:1.9">
        <li>Sign in with the credentials above</li>
        <li>Change your password from <b>My Profile</b></li>
        <li>Enroll <b>Face Unlock</b> for one-tap sign-in next time</li>
      </ol>
    </div>

    <p style="color:#a1a1aa;font-size:12.5px;line-height:1.6">
      Didn't expect this email? Contact IT immediately at tagis@tagcorporation.net.
    </p>`;
  return sendMail(user.email, 'Welcome to TIDE — your account is ready', layout('Your account is ready 🎉', body, { eyebrow: 'Account created' }));
}

export function sendAppAddedMail(recipients, app) {
  if (!recipients.length) return Promise.resolve({ skipped: true });
  const body = `
    <p style="color:#3f3f46;font-size:14.5px;line-height:1.7">A new application just landed on TIDE:</p>
    <div style="border:1px solid #f0f0f0;border-radius:14px;padding:20px;margin:16px 0;background:linear-gradient(180deg,#fff,#fafafa)">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:12px;background:${app.color};display:inline-block"></div>
      </div>
      <div style="font-size:17px;font-weight:800;color:#18181b;margin-top:14px">${app.name}</div>
      <div style="font-size:13.5px;color:#71717a;margin-top:4px;line-height:1.6">${app.description}</div>
      <div style="margin-top:12px">
        ${JSON.parse(app.departments)
          .map((d) => `<span style="display:inline-block;background:#f4f4f5;color:#52525b;font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;margin-right:6px">${d}</span>`)
          .join('')}
      </div>
    </div>`;
  return sendMail(recipients, `New app on TIDE: ${app.name}`, layout('A new application is available', body, { eyebrow: 'New app' }));
}

export function sendTestMail(to) {
  const body = `<p style="color:#3f3f46;font-size:14.5px;line-height:1.7">This is a test notification from TIDE. Your SMTP configuration is working correctly. ✅</p>`;
  return sendMail(to, 'TIDE — test email', layout('Test email', body, { eyebrow: 'Diagnostics' }));
}
