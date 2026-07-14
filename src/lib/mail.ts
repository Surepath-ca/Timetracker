import nodemailer from "nodemailer";

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    // No SMTP configured (local development): surface the code in the server log.
    console.log(`\n[SurePath Time Tracker] OTP for ${email}: ${code}\n`);
    return;
  }
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "SurePath Time Tracker <no-reply@surepathvaluation.ca>",
    to: email,
    subject: `${code} is your SurePath sign-in code`,
    text: `Your SurePath Time Tracker verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px">
        <h2 style="color:#16324f;margin:0 0 4px">SurePath Valuation &amp; Advisory</h2>
        <p style="color:#475569">Use this code to sign in to the Time Tracker:</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#16324f;text-align:center;margin:24px 0">${code}</p>
        <p style="color:#94a3b8;font-size:13px">This code expires in 10 minutes. If you did not request it, ignore this email.</p>
      </div>`,
  });
}
