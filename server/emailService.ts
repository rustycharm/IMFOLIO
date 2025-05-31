import nodemailer from 'nodemailer';
import { createServer } from 'http';
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

// Simple local email queue and notification system
class LocalEmailService extends EventEmitter {
  private emails: EmailMessage[] = [];
  private maxEmails = 100; // Keep last 100 emails

  addEmail(email: Omit<EmailMessage, 'id' | 'timestamp' | 'status'>): string {
    const emailWithMeta: EmailMessage = {
      ...email,
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      status: 'pending'
    };

    this.emails.unshift(emailWithMeta);
    
    // Keep only the most recent emails
    if (this.emails.length > this.maxEmails) {
      this.emails = this.emails.slice(0, this.maxEmails);
    }

    // Mark as delivered immediately since it's local storage
    emailWithMeta.status = 'delivered';
    
    this.emit('newEmail', emailWithMeta);
    return emailWithMeta.id;
  }

  getEmails(): EmailMessage[] {
    return this.emails;
  }

  getEmailById(id: string): EmailMessage | undefined {
    return this.emails.find(email => email.id === id);
  }

  getEmailsForRecipient(email: string): EmailMessage[] {
    return this.emails.filter(e => e.to.toLowerCase() === email.toLowerCase());
  }
}

// Global instance
const localEmailService = new LocalEmailService();

// Create fallback transporter for external email if credentials provided
function createExternalTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendContactNotification(params: ContactEmailParams): Promise<boolean> {
  try {
    // Create formatted email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>From:</strong> ${params.name}</p>
          <p><strong>Email:</strong> <a href="mailto:${params.email}">${params.email}</a></p>
          <p><strong>Subject:</strong> ${params.subject}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <div style="background: #fff; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h3 style="color: #555; margin-top: 0;">Message:</h3>
          <div style="line-height: 1.6; color: #333;">
            ${params.message.replace(/\n/g, '<br>')}
          </div>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          <em>This message was sent through your portfolio contact form. Reply directly to respond to the sender.</em>
        </p>
      </div>
    `;

    const textContent = `
New Contact Form Submission

From: ${params.name}
Email: ${params.email}
Subject: ${params.subject}
Time: ${new Date().toLocaleString()}

Message:
${params.message}

This message was sent through your portfolio contact form.
    `;

    // Store in local email service
    const emailId = localEmailService.addEmail({
      from: `${params.name} <${params.email}>`,
      to: params.adminEmail,
      subject: `Contact Form: ${params.subject}`,
      html: htmlContent,
      text: textContent
    });

    // Log to console for immediate visibility
    console.log('\n📧 Contact Form Submission Received:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📬 To: ${params.adminEmail}`);
    console.log(`👤 From: ${params.name} (${params.email})`);
    console.log(`📝 Subject: Contact Form: ${params.subject}`);
    console.log(`🆔 Email ID: ${emailId}`);
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💬 Message:');
    console.log(params.message);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 Email stored locally - check admin dashboard for full details\n');

    // Try to send external email if configured
    const externalTransporter = createExternalTransporter();
    if (externalTransporter) {
      try {
        await externalTransporter.sendMail({
          from: process.env.GMAIL_USER,
          to: params.adminEmail,
          replyTo: params.email,
          subject: `Contact Form: ${params.subject}`,
          html: htmlContent,
          text: textContent,
        });
        console.log(`✅ External email notification also sent to ${params.adminEmail}`);
      } catch (externalError) {
        console.warn('⚠️ External email failed, but message is stored locally:', externalError);
      }
    }

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