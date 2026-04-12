const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTPEmail = async (toEmail, otp, type = 'verify') => {
  const isReset = type === 'reset';
  const subject = isReset ? 'ExamVault - Password Reset OTP' : 'ExamVault - Verify Your Email';
  const heading = isReset ? 'Reset Your Password' : 'Verify Your Email';
  const message = isReset
    ? 'You requested a password reset. Use the OTP below:'
    : 'Thank you for registering! Please verify your email using the OTP below:';

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#10b981;">${heading}</h2>
        <p style="color:#374151;">${message}</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111827;background:#f3f4f6;padding:16px;border-radius:8px;text-align:center;margin:24px 0;">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:13px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#9ca3af;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendOTPEmail };
