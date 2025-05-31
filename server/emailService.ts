import nodemailer from 'nodemailer';

interface ContactEmailParams {
  name: string;
  email: string;
  subject: string;
  message: string;
  adminEmail: string;
}

function createGmailTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
}

export async function sendContactNotification(params: ContactEmailParams): Promise<boolean> {
  try {
    const transporter = createGmailTransporter();
    
    if (!transporter) {
      console.warn('Gmail SMTP not configured - skipping real email delivery');
      return false;
    }

    // Create formatted email content with IMFOLIO branding
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- IMFOLIO Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 2px;">
            IMFOLIO
          </h1>
          <p style="color: #e8f4f8; margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">
            Professional Photography Portfolio Platform
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #333; margin: 0 0 25px 0; font-size: 22px; font-weight: 500;">
            New Contact Form Submission
          </h2>
          
          <!-- Contact Details -->
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
            <div style="margin-bottom: 15px;">
              <span style="font-weight: 600; color: #555;">From:</span> 
              <span style="color: #333;">${params.name}</span>
            </div>
            <div style="margin-bottom: 15px;">
              <span style="font-weight: 600; color: #555;">Email:</span> 
              <span style="color: #333;">${params.email}</span>
            </div>
            <div>
              <span style="font-weight: 600; color: #555;">Subject:</span> 
              <span style="color: #333;">${params.subject}</span>
            </div>
          </div>
          
          <!-- Message Content -->
          <div style="background: #ffffff; padding: 25px; border: 1px solid #e9ecef; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">
              Message:
            </h3>
            <div style="color: #555; line-height: 1.6; white-space: pre-wrap;">${params.message}</div>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e9ecef; margin-top: 30px;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              This message was sent from your IMFOLIO portfolio contact form
            </p>
          </div>
        </div>
      </div>`;

    const textContent = `
IMFOLIO - New Contact Form Submission

From: ${params.name}
Email: ${params.email}
Subject: ${params.subject}

Message:
${params.message}

---
This message was sent from your IMFOLIO portfolio contact form`;

    // Send the email
    await transporter.sendMail({
      from: `"IMFOLIO Contact Form" <${process.env.GMAIL_USER}>`,
      to: params.adminEmail,
      replyTo: `"${params.name}" <${params.email}>`,
      subject: `IMFOLIO Contact: ${params.subject}`,
      html: htmlContent,
      text: textContent
    });

    console.log(`📧 Real IMFOLIO email sent successfully to ${params.adminEmail}`);
    return true;

  } catch (error) {
    console.error('Gmail email sending error:', error);
    return false;
  }
}