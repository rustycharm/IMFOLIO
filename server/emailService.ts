import nodemailer from 'nodemailer';

interface ContactEmailParams {
  name: string;
  email: string;
  subject: string;
  message: string;
  adminEmail: string;
}

// Create reusable transporter object using Gmail SMTP
function createTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Gmail credentials not configured - email notifications will be logged only");
    return null;
  }

  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendContactNotification(params: ContactEmailParams): Promise<boolean> {
  try {
    // Always log the email details to console for admin visibility
    console.log('\n📧 Contact Form Submission:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📬 To: ${params.adminEmail}`);
    console.log(`👤 From: ${params.name} (${params.email})`);
    console.log(`📝 Subject: Contact Form: ${params.subject}`);
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💬 Message:');
    console.log(params.message);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const transporter = createTransporter();
    
    if (!transporter) {
      console.log("📥 Email stored in database - check admin dashboard for new messages");
      return true; // Still return true as message is saved to database
    }

    // Send actual email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: params.adminEmail,
      replyTo: params.email,
      subject: `Contact Form: ${params.subject}`,
      html: `
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
      `,
      text: `
New Contact Form Submission

From: ${params.name}
Email: ${params.email}
Subject: ${params.subject}
Time: ${new Date().toLocaleString()}

Message:
${params.message}

This message was sent through your portfolio contact form.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email notification sent to ${params.adminEmail}`);
    return true;

  } catch (error) {
    console.error('❌ Email notification error:', error);
    console.log("📥 Message still saved to database - check admin dashboard");
    return true; // Return true as message is still saved to database
  }
}