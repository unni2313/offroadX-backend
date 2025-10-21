const nodemailer = require('nodemailer');

// Create transporter for sending emails
const createTransporter = () => {
  // First try with port 587 (STARTTLS)
  const config587 = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 75000,
  };

  // Alternative config with port 465 (SSL/TLS) as fallback
  const config465 = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 75000,
  };

  // Use port 465 if FORCE_SSL_EMAIL is set, otherwise use 587
  const useSSL = process.env.FORCE_SSL_EMAIL === 'true';
  return nodemailer.createTransport(useSSL ? config465 : config587);
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
    console.log('Attempting to send email to:', email);
    const useSSL = process.env.FORCE_SSL_EMAIL === 'true';
    console.log('SMTP Configuration - Host: smtp.gmail.com, Port:', useSSL ? '465 (SSL)' : '587 (STARTTLS)');
    console.log('EMAIL_USER configured:', process.env.EMAIL_USER ? 'Yes' : 'No');
    console.log('EMAIL_PASS configured:', process.env.EMAIL_PASS ? 'Yes' : 'No');
    
    // Test connection before sending
    await transporter.verify();
    console.log('SMTP connection verified successfully');
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);
    
    // More detailed error information
    if (error.code === 'ETIMEDOUT') {
      console.error('Connection timeout - check network connectivity and SMTP settings');
    } else if (error.code === 'EAUTH') {
      console.error('Authentication failed - check EMAIL_USER and EMAIL_PASS');
    } else if (error.code === 'ECONNECTION') {
      console.error('Connection failed - check SMTP host and port');
    }
    
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
};