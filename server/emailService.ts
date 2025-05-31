import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set - email notifications will be disabled");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface ContactEmailParams {
  name: string;
  email: string;
  subject: string;
  message: string;
  adminEmail: string;
}

export async function sendContactNotification(params: ContactEmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("SendGrid not configured - skipping email notification");
    return false;
  }

  try {
    await mailService.send({
      to: params.adminEmail,
      from: process.env.SENDGRID_FROM_EMAIL || params.adminEmail,
      subject: `Contact Form: ${params.subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${params.name}</p>
        <p><strong>Email:</strong> ${params.email}</p>
        <p><strong>Subject:</strong> ${params.subject}</p>
        <p><strong>Message:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
          ${params.message.replace(/\n/g, '<br>')}
        </div>
        <p><em>This message was sent through your portfolio contact form.</em></p>
      `,
      text: `
New Contact Form Submission

From: ${params.name}
Email: ${params.email}
Subject: ${params.subject}

Message:
${params.message}

This message was sent through your portfolio contact form.
      `
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}