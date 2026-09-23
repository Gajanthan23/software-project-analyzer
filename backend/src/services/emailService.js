/**
 * services/emailService.js
 * 
 * Service for sending transactional emails (such as OTP verification codes).
 * Supports both SMTP (via nodemailer) and a local "console" mode for development/testing.
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

// Lazy initialize transport if provider is set to smtp
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

const emailService = {
  /**
   * Send an OTP verification email to the user.
   * 
   * @param {string} email - Target email address
   * @param {string} otpCode - 6-digit numeric OTP code
   */
  sendOtpEmail: async (email, otpCode) => {
    const provider = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();

    const subject = 'Your Email Verification Code';
    const textContent = `Your verification code is: ${otpCode}. It will expire in 10 minutes. If you did not request this code, please ignore this email.`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 16px;">Verify Your Email</h2>
        <p style="color: #334155; font-size: 15px; margin-bottom: 20px;">Use the verification code below to complete your registration:</p>
        <div style="background-color: #f1f5f9; padding: 14px 24px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1e293b; text-align: center; border-radius: 6px; margin-bottom: 20px;">
          ${otpCode}
        </div>
        <p style="color: #64748b; font-size: 13px;">This code will expire in 10 minutes. If you did not create an account, please ignore this email.</p>
      </div>
    `;

    if (provider === 'console' || process.env.NODE_ENV === 'test') {
      logger.info(`[CONSOLE EMAIL] Verification OTP for ${email}: ${otpCode}`);
      return { success: true, mode: 'console' };
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"Software Analyzer" <no-reply@analyzer.local>',
        to: email,
        subject,
        text: textContent,
        html: htmlContent,
      };

      const mailTransporter = getTransporter();
      const info = await mailTransporter.sendMail(mailOptions);
      logger.info(`OTP email sent to ${email}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Failed to send OTP email to ${email}: ${error.message}`);
      throw new Error('Failed to send verification email');
    }
  },
};

module.exports = emailService;
