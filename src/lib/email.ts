/**
 * Lightweight Email Utility
 * Designed to be "superfast" and "light" as per user requirements.
 * Uses Resend API (standard fetch) to avoid heavy dependencies like nodemailer.
 */

export const emailService = {
  async sendNumericOTP(email: string, otp: string) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn('RESEND_API_KEY missing. OTP for', email, 'is:', otp);
      return { success: true, mode: 'console' };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'Quamify Security <security@quammify.sbs>',
          to: email,
          subject: 'Master Access OTP: Verification Required',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
              <h1 style="color: #dc2626; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Verification Required</h1>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">A master email change request was initiated for your admin account. Use the code below to verify this action.</p>
              <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center;">
                <span style="font-family: monospace; font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #0f172a;">${otp}</span>
              </div>
              <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; font-weight: 700;">Code expires in 10 minutes. If you did not request this, please secure your account immediately.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #cbd5e1; font-size: 10px; text-align: center;">© 2026 Quamify Security Nodes</p>
            </div>
          `,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Resend API error');
      
      return { success: true, mode: 'resend', id: result.id };
    } catch (error: any) {
      console.error('Email Delivery Failed:', error.message);
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }
  },

  async sendNewEmailVerification(email: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { success: true, mode: 'console' };

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'Quamify Security <security@quammify.sbs>',
          to: email,
          subject: 'Action Required: Verify New Master Email',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
              <h1 style="color: #16a34a; font-size: 24px; font-weight: 900; text-transform: uppercase;">Verify New Email</h1>
              <p style="color: #666; font-size: 14px;">Your email has been set as the new Master Admin for Quamify. Please check your inbox for the official Supabase verification link to activate this change.</p>
              <p style="color: #94a3b8; font-size: 11px;">Once verified, the previous master email will no longer have access.</p>
            </div>
          `,
        }),
      });
      return { success: true };
    } catch (e) {
      console.warn("New email notification failed");
      return { success: false };
    }
  },

  async sendPasswordResetRequest(adminEmail: string, userEmail: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY missing. Reset request from', userEmail, 'to', adminEmail);
      return { success: true, mode: 'console' };
    }

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'Quamify Security <security@quammify.sbs>',
          to: adminEmail,
          subject: 'Action Required: Password Reset Request',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
              <h1 style="color: #f59e0b; font-size: 24px; font-weight: 900; text-transform: uppercase;">Password Reset Request</h1>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">A user has requested a password reset for their holographic inbox.</p>
              <div style="background: #fffbeb; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fef3c7;">
                <p style="margin: 0; color: #92400e; font-weight: 700; font-size: 12px; text-transform: uppercase;">User Email:</p>
                <p style="margin: 5px 0 0 0; color: #000; font-family: monospace; font-size: 18px;">${userEmail}</p>
              </div>
              <p style="color: #666; font-size: 13px;">Please verify the user's identity and provide them with a new secret key manually via your established secure channels.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #cbd5e1; font-size: 10px; text-align: center;">© 2026 Quamify Security Nodes</p>
            </div>
          `,
        }),
      });
      return { success: true };
    } catch (e) {
      console.warn("Reset request notification failed");
      return { success: false };
    }
  }
};
