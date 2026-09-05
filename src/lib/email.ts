import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendInvitationEmail(toEmail: string, fullName: string, setPasswordLink: string) {
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0f172a; border-radius: 12px;">
      <h1 style="color: #f8fafc; font-size: 24px; margin-bottom: 8px;">Welcome to LinkedIn AI Content Engine</h1>
      <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">Hello ${fullName},</p>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
        Your account has been created by an administrator. Please click the button below to set your password and get started.
      </p>
      <a href="${setPasswordLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Set Your Password
      </a>
      <p style="color: #64748b; font-size: 12px; margin-top: 32px;">
        This link expires in 24 hours. If you did not expect this email, you can safely ignore it.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"LinkedIn AI Engine" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Your LinkedIn AI Content Engine Account - Set Password',
    html,
  });
}

export async function sendPasswordResetEmail(toEmail: string, resetLink: string) {
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0f172a; border-radius: 12px;">
      <h1 style="color: #f8fafc; font-size: 24px; margin-bottom: 8px;">Password Reset Approved</h1>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
        Your password reset request has been approved by an administrator. Click the button below to set a new password.
      </p>
      <a href="${resetLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Reset Your Password
      </a>
      <p style="color: #64748b; font-size: 12px; margin-top: 32px;">
        This link expires in 1 hour. If you did not request this reset, contact your administrator.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"LinkedIn AI Engine" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Password Reset Approved - LinkedIn AI Content Engine',
    html,
  });
}
