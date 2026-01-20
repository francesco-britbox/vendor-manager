/**
 * Email Templates
 *
 * Professional, mobile-responsive HTML email templates for user invitations
 * and password reset functionality.
 */

// ============================================================================
// BASE STYLES
// ============================================================================

const baseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
    -webkit-font-smoothing: antialiased;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  }
  .header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px 30px;
    text-align: center;
  }
  .header h1 {
    margin: 0;
    color: #ffffff;
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.5px;
  }
  .header p {
    margin: 10px 0 0 0;
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
  }
  .content {
    padding: 40px 30px;
    background-color: #ffffff;
  }
  .greeting {
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 20px;
  }
  .message {
    font-size: 15px;
    color: #4a4a4a;
    margin-bottom: 30px;
  }
  .button-container {
    text-align: center;
    margin: 35px 0;
  }
  .button {
    display: inline-block;
    padding: 14px 32px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff !important;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 15px;
    box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
    transition: all 0.2s ease;
  }
  .button:hover {
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    transform: translateY(-1px);
  }
  .info-box {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
    margin: 25px 0;
    border-left: 4px solid #667eea;
  }
  .info-box p {
    margin: 0;
    font-size: 14px;
    color: #4a4a4a;
  }
  .info-box strong {
    color: #1a1a1a;
  }
  .warning-box {
    background-color: #fff8e6;
    border-radius: 8px;
    padding: 20px;
    margin: 25px 0;
    border-left: 4px solid #f0b429;
  }
  .warning-box p {
    margin: 0;
    font-size: 14px;
    color: #6b5900;
  }
  .divider {
    height: 1px;
    background-color: #e5e5e5;
    margin: 30px 0;
  }
  .footer {
    background-color: #f8f9fa;
    padding: 30px;
    text-align: center;
  }
  .footer p {
    margin: 0;
    font-size: 13px;
    color: #666666;
  }
  .footer a {
    color: #667eea;
    text-decoration: none;
  }
  .security-note {
    font-size: 12px;
    color: #888888;
    margin-top: 15px;
  }
  @media only screen and (max-width: 600px) {
    .container {
      width: 100% !important;
    }
    .header {
      padding: 30px 20px !important;
    }
    .content {
      padding: 30px 20px !important;
    }
    .footer {
      padding: 20px !important;
    }
    .button {
      padding: 12px 24px !important;
      font-size: 14px !important;
    }
  }
`;

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
    appName = 'Vendor Management System',
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
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${appName}</h1>
      <p>You've been invited to join the team</p>
    </div>

    <div class="content">
      <p class="greeting">Hello ${userName},</p>

      <p class="message">
        You've been invited to create an account on ${appName}. Click the button below to set up your password and get started.
      </p>

      <div class="button-container">
        <a href="${setupUrl}" class="button" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Set Up Your Password</a>
      </div>

      <div class="info-box">
        <p><strong>Your Account Details:</strong></p>
        <p style="margin-top: 10px;">Email: <strong>${userEmail}</strong></p>
      </div>

      <div class="warning-box">
        <p><strong>Important:</strong> This invitation link will expire in ${expirationHours} hours for security purposes. If you need a new link, please contact your administrator.</p>
      </div>

      <div class="divider"></div>

      <p style="font-size: 13px; color: #666666;">
        If you didn't expect this invitation or believe it was sent in error, you can safely ignore this email.
      </p>

      <p class="security-note">
        For your security, please do not share this link with anyone. If you have any questions, contact your system administrator.
      </p>
    </div>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      <p class="security-note">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  </div>
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
    appName = 'Vendor Management System',
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
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
      <p>${appName}</p>
    </div>

    <div class="content">
      <p class="greeting">Hello ${userName},</p>

      <p class="message">
        We received a request to reset the password for your account associated with <strong>${userEmail}</strong>. Click the button below to create a new password.
      </p>

      <div class="button-container">
        <a href="${resetUrl}" class="button" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Reset Your Password</a>
      </div>

      <div class="warning-box">
        <p><strong>This link expires in ${expirationHours} hours.</strong></p>
        <p style="margin-top: 8px;">For security reasons, password reset links have a short expiration time. If you need more time, you can request a new link from the login page.</p>
      </div>

      <div class="divider"></div>

      <p style="font-size: 13px; color: #666666;">
        <strong>Didn't request this?</strong> If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged and no action will be taken on your account.
      </p>

      <p class="security-note">
        For your security, never share this link with anyone. ${appName} will never ask you to share your password or this link.
      </p>
    </div>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      <p class="security-note">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  </div>
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
