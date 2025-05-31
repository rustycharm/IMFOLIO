import nodemailer from 'nodemailer';
import { EventEmitter } from 'events';

interface ContactEmailParams {
  name: string;
  email: string;
  subject: string;
  message: string;
  adminEmail: string;
}

interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  timestamp: Date;
  status: 'pending' | 'delivered' | 'failed';
}

class LocalEmailService extends EventEmitter {
  private emails: EmailMessage[] = [];
  private maxEmails = 100; // Keep last 100 emails

  addEmail(email: Omit<EmailMessage, 'id' | 'timestamp' | 'status'>): string {
    const emailWithMeta: EmailMessage = {
      ...email,
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      status: 'delivered'
    };

    this.emails.unshift(emailWithMeta);
    
    // Keep only the most recent emails
    if (this.emails.length > this.maxEmails) {
      this.emails = this.emails.slice(0, this.maxEmails);
    }

    this.emit('newEmail', emailWithMeta);
    return emailWithMeta.id;
  }

  getEmails(): EmailMessage[] {
    return [...this.emails];
  }

  getEmailById(id: string): EmailMessage | undefined {
    return this.emails.find(email => email.id === id);
  }

  getEmailsForRecipient(email: string): EmailMessage[] {
    return this.emails.filter(e => e.to.toLowerCase().includes(email.toLowerCase()));
  }
}

const localEmailService = new LocalEmailService();

function createExternalTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    return null;
  }

  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
}

export async function sendContactNotification(params: ContactEmailParams): Promise<boolean> {
  try {
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
              <a href="mailto:${params.email}" style="color: #667eea; text-decoration: none;">${params.email}</a>
            </div>
            <div style="margin-bottom: 15px;">
              <span style="font-weight: 600; color: #555;">Subject:</span> 
              <span style="color: #333;">${params.subject}</span>
            </div>
            <div>
              <span style="font-weight: 600; color: #555;">Time:</span> 
              <span style="color: #333;">${new Date().toLocaleString()}</span>
            </div>
          </div>
          
          <!-- Message Content -->
          <div style="background: #fff; padding: 25px; border: 1px solid #e9ecef; border-radius: 8px;">
            <h3 style="color: #555; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Message:</h3>
            <div style="line-height: 1.6; color: #333; font-size: 15px;">
              ${params.message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <!-- Reply Notice -->
          <div style="margin-top: 30px; padding: 20px; background: #e8f4f8; border-radius: 6px;">
            <p style="margin: 0; color: #666; font-size: 13px; text-align: center;">
              Reply directly to this email to respond to <strong>${params.name}</strong>
            </p>
          </div>
        </div>
        
        <!-- IMFOLIO Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="margin: 0; color: #999; font-size: 12px;">
            Powered by <strong style="color: #667eea;">IMFOLIO.COM</strong> - Professional Photography Portfolio Platform
          </p>
        </div>
      </div>
    `;

    const textContent = `
IMFOLIO - New Contact Form Submission

From: ${params.name}
Email: ${params.email}
Subject: ${params.subject}
Time: ${new Date().toLocaleString()}

Message:
${params.message}

Reply directly to this email to respond to ${params.name}.

---
Powered by IMFOLIO.COM - Professional Photography Portfolio Platform
    `;

    // Try to send real email first (if external credentials are configured)
    const externalTransporter = createExternalTransporter();
    
    if (externalTransporter) {
      try {
        await externalTransporter.sendMail({
          from: '"IMFOLIO Contact Form" <noreply@imfolio.com>',
          to: params.adminEmail,
          replyTo: params.email,
          subject: `IMFOLIO Contact: ${params.subject}`,
          text: textContent,
          html: htmlContent,
        });
        
        console.log(`📧 Real email sent successfully to ${params.adminEmail}`);
        
        // Also store in local service for admin dashboard viewing
        localEmailService.addEmail({
          from: `${params.name} <${params.email}>`,
          to: params.adminEmail,
          subject: `IMFOLIO Contact: ${params.subject}`,
          html: htmlContent,
          text: textContent
        });
        
        return true;
      } catch (externalError) {
        console.warn(`Failed to send external email to ${params.adminEmail}:`, externalError);
        // Fall through to local storage only
      }
    }

    // If external email failed or not configured, store in local service only
    const emailId = localEmailService.addEmail({
      from: `${params.name} <${params.email}>`,
      to: params.adminEmail,
      subject: `IMFOLIO Contact: ${params.subject}`,
      html: htmlContent,
      text: textContent
    });

    // Log to console for immediate visibility
    console.log('\n📧 Contact Form Submission Received:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📬 To: ${params.adminEmail}`);
    console.log(`👤 From: ${params.name} (${params.email})`);
    console.log(`📝 Subject: IMFOLIO Contact: ${params.subject}`);
    console.log(`🆔 Email ID: ${emailId}`);
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💬 Message:');
    console.log(params.message);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 Email stored locally - check admin dashboard for full details\n');

    return true;

  } catch (error) {
    console.error('❌ Email service error:', error);
    return false;
  }
}

// Export local email service for API access
export function getLocalEmails(): EmailMessage[] {
  return localEmailService.getEmails();
}

export function getLocalEmailById(id: string): EmailMessage | undefined {
  return localEmailService.getEmailById(id);
}

export function getLocalEmailsForRecipient(email: string): EmailMessage[] {
  return localEmailService.getEmailsForRecipient(email);
}