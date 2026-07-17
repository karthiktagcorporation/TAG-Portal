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

function layout(title, body) {
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;background:#f1f5f9;padding:32px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#1173d4,#0ea5e9);padding:24px 32px">
        <div style="color:#fff;font-size:20px;font-weight:700">TAG Information Systems</div>
        <div style="color:#dbeafe;font-size:12px;letter-spacing:2px">POWER TO PEOPLE</div>
      </div>
      <div style="padding:32px">
        <h2 style="margin:0 0 16px;color:#0f172a;font-size:18px">${title}</h2>
        ${body}
        <p style="margin:24px 0 0"><a href="${portalUrl}" style="background:#1173d4;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;display:inline-block">Open TAG Portal</a></p>
      </div>
      <div style="padding:16px 32px;background:#f8fafc;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0">
        Automated notification from TAG Portal &middot; Authorized personnel only
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
      from: SMTP_FROM || `"TAG Portal" <${SMTP_USER}>`,
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

export function sendWelcomeMail(user, plainPassword) {
  const body = `
    <p style="color:#334155;font-size:14px;line-height:1.6">Hi <b>${user.name}</b>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6">Your TAG Portal account has been created. Use the credentials below to sign in:</p>
    <table style="font-size:14px;color:#334155;border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:6px 16px 6px 0;color:#64748b">Username</td><td><b>${user.username}</b></td></tr>
      <tr><td style="padding:6px 16px 6px 0;color:#64748b">Password</td><td><b>${plainPassword}</b></td></tr>
      <tr><td style="padding:6px 16px 6px 0;color:#64748b">Department</td><td>${user.department}</td></tr>
      <tr><td style="padding:6px 16px 6px 0;color:#64748b">Role</td><td>${user.role}</td></tr>
    </table>
    <p style="color:#64748b;font-size:13px">Please change your password after first login. You can also enroll Face Unlock from your profile.</p>`;
  return sendMail(user.email, 'Welcome to TAG Portal — your account is ready', layout('Your account is ready', body));
}

export function sendAppAddedMail(recipients, app) {
  if (!recipients.length) return Promise.resolve({ skipped: true });
  const body = `
    <p style="color:#334155;font-size:14px;line-height:1.6">A new application is now available on TAG Portal:</p>
    <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:12px 0">
      <div style="font-size:16px;font-weight:700;color:#0f172a">${app.name}</div>
      <div style="font-size:13px;color:#64748b;margin-top:4px">${app.description}</div>
      <div style="font-size:12px;color:#1173d4;margin-top:8px">Departments: ${JSON.parse(app.departments).join(', ')}</div>
    </div>`;
  return sendMail(recipients, `New app on TAG Portal: ${app.name}`, layout('New application added', body));
}

export function sendTestMail(to) {
  const body = `<p style="color:#334155;font-size:14px;line-height:1.6">This is a test notification from TAG Portal. Your SMTP configuration is working correctly. ✅</p>`;
  return sendMail(to, 'TAG Portal — test email', layout('Test email', body));
}
