import { SMTPServer } from 'smtp-server';
import nodemailer from 'nodemailer';
import { EventEmitter } from 'events';

interface EmailData {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  timestamp: Date;
}

class LocalSMTPService extends EventEmitter {
  private server: SMTPServer | null = null;
  private port: number = 2525;
  private sentEmails: EmailData[] = [];
  private transporter: any = null;

  constructor() {
    super();
    this.setupTransporter();
    this.startServer();
  }

  private setupTransporter() {
    // Create a transporter that uses our local SMTP server
    this.transporter = nodemailer.createTransport({
      host: 'localhost',
      port: this.port,
      secure: false,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  private startServer() {
    this.server = new SMTPServer({
      secure: false,
      authOptional: true,
      allowInsecureAuth: true,
      disabledCommands: ['STARTTLS'],
      
      onConnect: (session, callback) => {
        console.log(`📧 SMTP Connection from ${session.remoteAddress}`);
        return callback();
      },

      onMailFrom: (address, session, callback) => {
        console.log(`📧 SMTP Mail from: ${address.address}`);
        return callback();
      },

      onRcptTo: (address, session, callback) => {
        console.log(`📧 SMTP Mail to: ${address.address}`);
        return callback();
      },

      onData: (stream, session, callback) => {
        let emailData = '';
        
        stream.on('data', (chunk) => {
          emailData += chunk;
        });

        stream.on('end', () => {
          console.log('📧 SMTP Email received and processed');
          
          // Parse basic email data for logging
          const lines = emailData.split('\n');
          let from = '';
          let to = '';
          let subject = '';
          
          for (const line of lines) {
            if (line.startsWith('From:')) from = line.substring(5).trim();
            if (line.startsWith('To:')) to = line.substring(3).trim();
            if (line.startsWith('Subject:')) subject = line.substring(8).trim();
          }

          const email: EmailData = {
            from,
            to: [to],
            subject,
            text: emailData,
            html: emailData,
            timestamp: new Date()
          };

          this.sentEmails.push(email);
          this.emit('emailSent', email);

          console.log('\n📧 IMFOLIO Email Sent Successfully:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`📬 From: ${from}`);
          console.log(`📬 To: ${to}`);
          console.log(`📝 Subject: ${subject}`);
          console.log(`⏰ Time: ${new Date().toLocaleString()}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          return callback();
        });
      }
    });

    this.server.listen(this.port, () => {
      console.log(`📧 Local SMTP server started on port ${this.port}`);
    });

    this.server.on('error', (err) => {
      console.error('📧 SMTP server error:', err);
    });
  }

  async sendEmail(options: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
  }): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail(options);
      console.log(`📧 Email sent via local SMTP: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('📧 Failed to send email via local SMTP:', error);
      return false;
    }
  }

  getSentEmails(): EmailData[] {
    return [...this.sentEmails];
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('📧 Local SMTP server stopped');
    }
  }
}

export const localSMTPService = new LocalSMTPService();