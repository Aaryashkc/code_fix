const nodemailer = require('nodemailer');

const createTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT) || 587;
  const secure = port === 465;
  const emailUser = process.env.EMAIL_USER?.trim();
  const rawEmailPassword = process.env.EMAIL_PASSWORD || '';
  const isGmailSmtp = host.includes('gmail');
  // Gmail app passwords are often copied with spaces (e.g. "xxxx xxxx xxxx xxxx").
  // Normalize only for Gmail SMTP to avoid accidental auth failures.
  const emailPassword = isGmailSmtp ? rawEmailPassword.replace(/\s+/g, '') : rawEmailPassword;

  if (!emailUser || !emailPassword) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
    debug: process.env.NODE_ENV === 'development', // Enable debug in development
    logger: process.env.NODE_ENV === 'development', // Enable logger in development
  });
};

const sendEmail = async (toOrOptions, subject, html) => {
  // Handle both object format { to, subject, html } and positional args
  let to, emailSubject, emailHtml;
  if (typeof toOrOptions === 'object' && toOrOptions !== null) {
    to = toOrOptions.to;
    emailSubject = toOrOptions.subject;
    emailHtml = toOrOptions.html;
  } else {
    to = toOrOptions;
    emailSubject = subject;
    emailHtml = html;
  }

  const transporter = createTransporter();

  if (!transporter) {
    return { consoleFallback: true };
  }

  const configuredFrom = process.env.EMAIL_FROM?.trim();
  const smtpHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const isGmailSmtp = smtpHost.includes('gmail');
  const authUser = process.env.EMAIL_USER?.trim();
  // Gmail can reject/override a From address that is not the authenticated account.
  // Use auth user as From for Gmail and keep configured address as reply-to.
  const fromAddress = isGmailSmtp ? authUser : (configuredFrom || authUser);

  const mailOptions = {
    from: `"Yatra Nepal" <${fromAddress}>`,
    replyTo: configuredFrom || authUser,
    to,
    subject: emailSubject,
    html: emailHtml,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };
