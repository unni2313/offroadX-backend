const nodemailer = require('nodemailer');

// Create transporter for sending emails
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetUrl, firstName) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'OffroadX - Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #1f2937; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #10b981; margin: 0 0 20px 0;">🏔️ OffroadX</h1>
          <h2 style="color: #ffffff; margin: 0 0 20px 0;">Password Reset Request</h2>
          <p style="color: #d1d5db; margin: 0 0 30px 0;">Hi ${firstName},</p>
          <p style="color: #d1d5db; margin: 0 0 30px 0;">
            We received a request to reset your password for your OffroadX account. 
            Click the button below to reset your password:
          </p>
          
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px; margin: 20px 0;">
            This link will expire in 30 minutes for security reasons.
          </p>
          
          <p style="color: #9ca3af; font-size: 14px; margin: 20px 0;">
            If you didn't request this password reset, please ignore this email. 
            Your password will remain unchanged.
          </p>
          
          <div style="border-top: 1px solid #374151; margin: 30px 0; padding-top: 20px;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #10b981; font-size: 12px; word-break: break-all; margin: 10px 0;">
              ${resetUrl}
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <p style="color: #6b7280; font-size: 12px;">
            This email was sent by OffroadX. If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
};