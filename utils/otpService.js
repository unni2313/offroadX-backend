const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Create transporter for sending emails
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // You can change this to your preferred email service
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASS, // Your email password or app password
    },
  });
};

// Generate a 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp, firstName) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'OffroadX - Email Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #1f2937; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #10b981; margin: 0 0 20px 0;">🏔️ OffroadX</h1>
          <h2 style="color: #ffffff; margin: 0 0 20px 0;">Email Verification</h2>
          <p style="color: #d1d5db; margin: 0 0 30px 0;">Hi ${firstName},</p>
          <p style="color: #d1d5db; margin: 0 0 30px 0;">
            Thank you for registering with OffroadX! Please use the following OTP to verify your email address:
          </p>
          <div style="background-color: #374151; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #10b981; font-size: 36px; margin: 0; letter-spacing: 8px;">${otp}</h1>
          </div>
          <p style="color: #9ca3af; font-size: 14px; margin: 20px 0 0 0;">
            This OTP will expire in 10 minutes. If you didn't request this verification, please ignore this email.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <p style="color: #6b7280; font-size: 12px;">
            © 2024 OffroadX. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail,
};