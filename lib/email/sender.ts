import nodemailer from 'nodemailer';

export async function sendAuditEmail(email: string, name: string, pdfUrl: string, pdfBuffer: Buffer) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Brand Audit" <noreply@example.com>',
      to: email,
      subject: 'Your Brand Audit is Ready!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Brand Audit is Ready!</h2>
          <p>Hi ${name ? name : 'there'},</p>
          <p>We've finished analyzing your brand presence, and your comprehensive brand audit report is now available.</p>
          <p>You can access your report anytime using this link:</p>
          <p><a href="${pdfUrl}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Report</a></p>
          <p>We have also attached a PDF copy of the report to this email for your convenience.</p>
          <br/>
          <p>Best regards,<br/>The Brand Audit Team</p>
        </div>
      `,
      attachments: [
        {
          filename: 'brand-audit-report.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    console.log('[Email Sender] Message sent: %s', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('[Email Sender] Unexpected error sending email:', error);
    return { success: false, error };
  }
}
