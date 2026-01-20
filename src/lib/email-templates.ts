/**
 * Email Templates
 *
 * Professional, mobile-responsive HTML email templates for user invitations
 * and password reset functionality.
 */

// ============================================================================
// BASE STYLES
// ============================================================================

// Note: Email clients strip <style> tags, so we use inline styles throughout.
// This baseStyles is kept for reference but critical styles are inlined in templates.
const baseStyles = ``;

// ============================================================================
// INVITATION EMAIL TEMPLATE
// ============================================================================

export interface InvitationEmailParams {
  userName: string;
  userEmail: string;
  setupUrl: string;
  appName?: string;
  expirationHours?: number;
}

export function generateInvitationEmail(params: InvitationEmailParams): { html: string; text: string } {
  const {
    userName,
    userEmail,
    setupUrl,
    appName = 'Delivery Manager',
    expirationHours = 48,
  } = params;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to ${appName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #667eea; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600; letter-spacing: -0.5px;">Welcome to ${appName}</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">You've been invited to join the team</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; background-color: #ffffff;">
              <p style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 20px 0;">Hello ${userName},</p>

              <p style="font-size: 15px; color: #4a4a4a; margin: 0 0 30px 0;">
                You've been invited to create an account on ${appName}. Click the button below to set up your password and get started.
              </p>

              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 35px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${setupUrl}" style="display: inline-block; padding: 16px 36px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; mso-padding-alt: 0;">Set Up Your Password</a>
                  </td>
                </tr>
              </table>

              <!-- Info Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
                <tr>
                  <td style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; border-left: 4px solid #667eea;">
                    <p style="margin: 0; font-size: 14px; color: #1a1a1a; font-weight: 600;">Your Account Details:</p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #4a4a4a;">Email: <strong style="color: #1a1a1a;">${userEmail}</strong></p>
                  </td>
                </tr>
              </table>

              <!-- Warning Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
                <tr>
                  <td style="background-color: #fff8e6; border-radius: 8px; padding: 20px; border-left: 4px solid #f0b429;">
                    <p style="margin: 0; font-size: 14px; color: #6b5900;"><strong>Important:</strong> This invitation link will expire in ${expirationHours} hours for security purposes. If you need a new link, please contact your administrator.</p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td style="height: 1px; background-color: #e5e5e5;"></td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #666666; margin: 0 0 15px 0;">
                If you didn't expect this invitation or believe it was sent in error, you can safely ignore this email.
              </p>

              <p style="font-size: 12px; color: #888888; margin: 0;">
                For your security, please do not share this link with anyone. If you have any questions, contact your system administrator.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #666666;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
              <p style="font-size: 12px; color: #888888; margin: 15px 0 0 0;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
Welcome to ${appName}

Hello ${userName},

You've been invited to create an account on ${appName}.

Set up your password by visiting:
${setupUrl}

Your Account Details:
Email: ${userEmail}

IMPORTANT: This invitation link will expire in ${expirationHours} hours for security purposes.

If you didn't expect this invitation, you can safely ignore this email.

For your security, please do not share this link with anyone.

---
This is an automated message from ${appName}.
`;

  return { html, text };
}

// ============================================================================
// PASSWORD RESET EMAIL TEMPLATE
// ============================================================================

export interface PasswordResetEmailParams {
  userName: string;
  userEmail: string;
  resetUrl: string;
  appName?: string;
  expirationHours?: number;
}

export function generatePasswordResetEmail(params: PasswordResetEmailParams): { html: string; text: string } {
  const {
    userName,
    userEmail,
    resetUrl,
    appName = 'Delivery Manager',
    expirationHours = 2,
  } = params;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Password - ${appName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #667eea; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600; letter-spacing: -0.5px;">Password Reset Request</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">${appName}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; background-color: #ffffff;">
              <p style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 20px 0;">Hello ${userName},</p>

              <p style="font-size: 15px; color: #4a4a4a; margin: 0 0 30px 0;">
                We received a request to reset the password for your account associated with <strong style="color: #1a1a1a;">${userEmail}</strong>. Click the button below to create a new password.
              </p>

              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 35px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 36px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; mso-padding-alt: 0;">Reset Your Password</a>
                  </td>
                </tr>
              </table>

              <!-- Warning Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
                <tr>
                  <td style="background-color: #fff8e6; border-radius: 8px; padding: 20px; border-left: 4px solid #f0b429;">
                    <p style="margin: 0; font-size: 14px; color: #6b5900;"><strong>This link expires in ${expirationHours} hours.</strong></p>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b5900;">For security reasons, password reset links have a short expiration time. If you need more time, you can request a new link from the login page.</p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td style="height: 1px; background-color: #e5e5e5;"></td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #666666; margin: 0 0 15px 0;">
                <strong style="color: #4a4a4a;">Didn't request this?</strong> If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged and no action will be taken on your account.
              </p>

              <p style="font-size: 12px; color: #888888; margin: 0;">
                For your security, never share this link with anyone. ${appName} will never ask you to share your password or this link.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #666666;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
              <p style="font-size: 12px; color: #888888; margin: 15px 0 0 0;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
Password Reset Request - ${appName}

Hello ${userName},

We received a request to reset the password for your account associated with ${userEmail}.

Reset your password by visiting:
${resetUrl}

IMPORTANT: This link expires in ${expirationHours} hours.

Didn't request this? If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

For your security, never share this link with anyone.

---
This is an automated message from ${appName}.
`;

  return { html, text };
}

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const emailTemplates = {
  invitation: generateInvitationEmail,
  passwordReset: generatePasswordResetEmail,
};
