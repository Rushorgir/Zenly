import { createTransport } from 'nodemailer';

// Create transporter for sending emails
// Using Gmail for development (you can switch to Mailjet or other services later)
const createTransporter = () => {
    // For development, use Gmail SMTP or ethereal for testing
    // For production, use a service like Mailjet, SendGrid, or AWS SES
    
    if (process.env.EMAIL_SERVICE === 'gmail') {
        return createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
            }
        });
    } else if (process.env.EMAIL_SERVICE === 'mailjet') {
        return createTransport({
            host: 'in-v3.mailjet.com',
            port: 587,
            auth: {
                user: process.env.MAILJET_API_KEY,
                pass: process.env.MAILJET_SECRET_KEY
            }
        });
    } else {
        // Default: Use SMTP settings from environment
        return createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }
};

/**
 * Send OTP verification email
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's name
 */
export const sendVerificationEmail = async (email, otp, userName = 'there') => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"Zenly - Mental Health Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Zenly App Email Verification Code',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .container {
                            background-color: #f9f9f9;
                            border-radius: 10px;
                            padding: 30px;
                            border: 1px solid #e0e0e0;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 30px;
                        }
                        .logo {
                            font-size: 32px;
                            font-weight: bold;
                            color: #7c3aed;
                            margin-bottom: 10px;
                        }
                        .otp-box {
                            background-color: #ffffff;
                            border: 2px dashed #7c3aed;
                            border-radius: 8px;
                            padding: 20px;
                            text-align: center;
                            margin: 25px 0;
                        }
                        .otp-code {
                            font-size: 36px;
                            font-weight: bold;
                            color: #7c3aed;
                            letter-spacing: 8px;
                            font-family: 'Courier New', monospace;
                        }
                        .warning {
                            background-color: #fff3cd;
                            border-left: 4px solid #ffc107;
                            padding: 12px;
                            margin: 20px 0;
                            border-radius: 4px;
                        }
                        .footer {
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid #e0e0e0;
                            text-align: center;
                            font-size: 14px;
                            color: #666;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="logo">❤️ Zenly</div>
                            <h2 style="color: #333; margin: 0;">Email Verification</h2>
                        </div>
                        
                        <p>Hi ${userName},</p>
                        
                        <p>Thank you for signing up with Zenly! To complete your registration and access your mental health support dashboard, please verify your email address.</p>
                        
                        <p><strong>Your verification code is:</strong></p>
                        
                        <div class="otp-box">
                            <div class="otp-code">${otp}</div>
                        </div>
                        
                        <p>Please enter this code in the app to complete your registration.</p>
                        
                        <div class="warning">
                            <strong>⏰ Important:</strong> This code will expire in <strong>10 minutes</strong>.
                        </div>
                        
                        <p>If you didn't request this verification code, please ignore this email.</p>
                        
                        <div class="footer">
                            <p><strong>Zenly - Mental Health Support Platform</strong></p>
                            <p>Your mental wellness journey starts here</p>
                            <p style="font-size: 12px; color: #999;">This is an automated email, please do not reply.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Hi ${userName},

Thank you for signing up with Zenly!

Your verification code is: ${otp}

Please enter this code in the app to complete your registration.
This code will expire in 10 minutes.

If you didn't request this verification code, please ignore this email.

Thank you!
Zenly - Mental Health Support Platform
            `.trim()
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Verification email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
};

/**
 * Send welcome email after successful verification
 * @param {string} email - Recipient email address
 * @param {string} userName - User's name
 */
export const sendWelcomeEmail = async (email, userName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"Zenly - Mental Health Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Welcome to Zenly! 🎉',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .container {
                            background-color: #f9f9f9;
                            border-radius: 10px;
                            padding: 30px;
                            border: 1px solid #e0e0e0;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 30px;
                        }
                        .logo {
                            font-size: 32px;
                            font-weight: bold;
                            color: #7c3aed;
                            margin-bottom: 10px;
                        }
                        .feature {
                            background-color: #ffffff;
                            padding: 15px;
                            margin: 10px 0;
                            border-radius: 8px;
                            border-left: 4px solid #7c3aed;
                        }
                        .footer {
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid #e0e0e0;
                            text-align: center;
                            font-size: 14px;
                            color: #666;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="logo">❤️ Zenly</div>
                            <h2 style="color: #333; margin: 0;">Welcome Aboard!</h2>
                        </div>
                        
                        <p>Hi ${userName},</p>
                        
                        <p>🎉 <strong>Congratulations!</strong> Your email has been verified successfully.</p>
                        
                        <p>Welcome to Zenly - your comprehensive mental health support platform designed specifically for college students.</p>
                        
                        <h3>What's available for you:</h3>
                        
                        <div class="feature">
                            <strong>📝 AI Journal Analysis</strong><br>
                            Get personalized insights and support based on your daily reflections.
                        </div>
                        
                        
                        
                        <div class="feature">
                            <strong>👥 Peer Support Forum</strong><br>
                            Connect with fellow students in a safe, moderated environment.
                        </div>
                        
                        <div class="feature">
                            <strong>💬 24/7 AI Support</strong><br>
                            Get immediate help and coping strategies anytime you need.
                        </div>
                        
                        <p>Your mental health journey starts here. We're here to support you every step of the way.</p>
                        
                        <div class="footer">
                            <p><strong>Zenly - Mental Health Support Platform</strong></p>
                            <p>Your mental wellness journey starts here</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
        // Don't throw error for welcome email - it's not critical
        return { success: false, error: error.message };
    }
};

export default {
    sendVerificationEmail,
    sendWelcomeEmail
};
