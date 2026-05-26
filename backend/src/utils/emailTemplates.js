const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #DC143C, #B91C3B); padding: 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
    .header p { color: #ffcccc; margin: 5px 0 0; font-size: 14px; }
    .content { padding: 30px; }
    .btn { display: inline-block; padding: 14px 32px; background: #DC143C; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .footer { background: #f8f8f8; padding: 20px 30px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; }
    .info-box { background: #f8f9fa; border-left: 4px solid #DC143C; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
    .otp-box { background: #f0f8ff; border: 2px dashed #DC143C; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
    .otp-code { font-size: 32px; font-weight: bold; color: #DC143C; letter-spacing: 5px; margin: 10px 0; }
    .warning { color: #ff6b6b; font-size: 14px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Yatra Nepal</h1>
      <p>Explore the Himalayas</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Yatra Nepal. All rights reserved.</p>
      <p>This is an automated email. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>
`;

const verificationEmailTemplate = (name, verificationUrl) => {
  return baseTemplate(`
    <h2 style="color: #333; margin-top: 0;">Welcome to Yatra, ${name}!</h2>
    <p style="color: #555; line-height: 1.6;">
      Thank you for registering. Please verify your email address to get started on your Nepal adventure.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" class="btn">Verify Email Address</a>
    </div>
    <p style="color: #888; font-size: 13px;">
      If button doesn't work, copy and paste this link into your browser:<br>
      <a href="${verificationUrl}" style="color: #DC143C; word-break: break-all;">${verificationUrl}</a>
    </p>
    <p style="color: #888; font-size: 13px;">This link expires in 24 hours.</p>
  `);
};

const passwordResetTemplate = (name, resetUrl) => {
  return baseTemplate(`
    <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
    <p style="color: #555; line-height: 1.6;">
      Hi ${name}, we received a request to reset your password. Click the button below to set a new password.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </div>
    <p style="color: #888; font-size: 13px;">
      If button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #DC143C; word-break: break-all;">${resetUrl}</a>
    </p>
    <p style="color: #888; font-size: 13px;">This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
  `);
};

const paymentInvoiceTemplate = (booking, tourist, guide) => {
  const startDate = new Date(booking.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const endDate = new Date(booking.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const paymentDate = booking.paymentDate ? new Date(booking.paymentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  return baseTemplate(`
    <h2 style="color: #333; margin-top: 0;">Payment Invoice</h2>
    <p style="color: #555; line-height: 1.6;">
      Hi ${tourist.name}, your payment has been confirmed! Here are your booking details.
    </p>

    <div class="info-box">
      <h3 style="margin-top: 0; color: #DC143C;">Booking Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 5px 0; color: #666;">Guide</td><td style="padding: 5px 0; font-weight: 600;">${guide.name}</td></tr>
        <tr><td style="padding: 5px 0; color: #666;">Dates</td><td style="padding: 5px 0; font-weight: 600;">${startDate} - ${endDate}</td></tr>
        <tr><td style="padding: 5px 0; color: #666;">Duration</td><td style="padding: 5px 0; font-weight: 600;">${booking.numberOfDays} days</td></tr>
        <tr><td style="padding: 5px 0; color: #666;">Package</td><td style="padding: 5px 0; font-weight: 600;">${booking.packageType}</td></tr>
        <tr><td style="padding: 5px 0; color: #666;">Group Size</td><td style="padding: 5px 0; font-weight: 600;">${booking.groupSize} people</td></tr>
      </table>
    </div>

    <div class="info-box">
      <h3 style="margin-top: 0; color: #DC143C;">Payment Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 5px 0; color: #666;">Amount Paid</td><td style="padding: 5px 0; font-weight: 600; font-size: 18px;">Rs. ${booking.totalPrice?.toLocaleString()}</td></tr>
        <tr><td style="padding: 5px 0; color: #666;">Payment Method</td><td style="padding: 5px 0; font-weight: 600;">${booking.paymentMethod || 'Khalti'}</td></tr>
        <tr><td style="padding: 5px 0; color: #666;">Transaction ID</td><td style="padding: 5px 0; font-weight: 600;">${booking.paymentTransactionId || 'N/A'}</td></tr>
        <tr><td style="padding: 5px 0; color: #666;">Payment Date</td><td style="padding: 5px 0; font-weight: 600;">${paymentDate}</td></tr>
      </table>
    </div>

    <div class="info-box">
      <h3 style="margin-top: 0; color: #DC143C;">Guide Contact</h3>
      <p style="margin: 0; color: #555;">${guide.name} - ${guide.email}</p>
    </div>

    <p style="color: #555; line-height: 1.6; margin-top: 20px;">
      Thank you for booking with Yatra Nepal! We hope you have an amazing adventure. 🏔️
    </p>
  `);
};

// OTP Login Email Template
const otpLoginTemplate = (name, otp, expiresIn = 10) => `
  <h2 style="color: #333; margin-bottom: 20px;">🔐 Login Code</h2>
  
  <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
    Hi ${name || 'Traveler'}, here's your one-time password to sign in to your Yatra Nepal account:
  </p>

  <div class="otp-box">
    <p style="margin: 0; color: #666; font-size: 14px; margin-bottom: 10px;">Your verification code is:</p>
    <div class="otp-code">${otp}</div>
    <p class="warning">⚠️ This code expires in ${expiresIn} minutes</p>
  </div>

  <div class="info-box">
    <h3 style="margin-top: 0; color: #DC143C;">Security Notice</h3>
    <ul style="margin: 0; padding-left: 20px; color: #555;">
      <li>Never share this code with anyone</li>
      <li>Yatra Nepal staff will never ask for this code</li>
      <li>This code can only be used once</li>
    </ul>
  </div>

  <p style="color: #555; line-height: 1.6; margin-top: 20px;">
    If you didn't request this code, please ignore this email or contact our support team.
  </p>
`;

module.exports = {
  verificationEmailTemplate,
  passwordResetTemplate,
  paymentInvoiceTemplate,
  otpLoginTemplate
};
