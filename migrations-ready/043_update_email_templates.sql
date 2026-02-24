-- Migration 043: Update Email Templates with Enhanced Designs
-- Ports the enhanced HTML email templates from the legacy monolithic repository

BEGIN;

-- Update Welcome Template
UPDATE public.email_templates
SET html_body = E'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Advancia Pay Ledger</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Welcome to Advancia Pay! 🎉</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">Hi {{user_name}},</p>
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Thank you for joining <strong>Advancia Pay Ledger</strong>! Your account has been successfully created.
              </p>
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                You now have access to:
              </p>
              <ul style="margin: 0 0 30px; padding-left: 20px; color: #333333; font-size: 16px; line-height: 1.8;">
                <li>Secure cryptocurrency payments</li>
                <li>Traditional payment processing</li>
                <li>Real-time transaction tracking</li>
                <li>Multi-currency support</li>
              </ul>
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{dashboard_url}}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">Go to Dashboard</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Need help? Contact our support team anytime.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                <strong>Advancia Pay Ledger Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
WHERE name = 'welcome';

-- Update Password Reset Template
UPDATE public.email_templates
SET html_body = E'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Advancia Pay</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Password Reset Request</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.5;">
                Hi {{user_name}},
              </p>
              <p style="margin: 0 0 20px; color: #666666; font-size: 14px; line-height: 1.5;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                <tr>
                  <td align="center" style="background-color: #667eea; border-radius: 6px;">
                    <a href="{{reset_url}}" style="display: inline-block; padding: 14px 40px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0; color: #666666; font-size: 13px; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 20px; color: #667eea; font-size: 12px; word-break: break-all;">
                {{reset_url}}
              </p>
              <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.5;">
                  <strong>⚠️ Security Notice:</strong><br>
                  This link will expire in {{expiry_time}}. If you didn''t request this reset, please ignore this email or contact support if you have concerns.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                Advancia Pay Ledger | Secure Digital Payments
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
WHERE name = 'password_reset';

-- Insert Generic Notification Template
DELETE FROM public.email_templates WHERE name = 'system_notification';

INSERT INTO public.email_templates (
  name, subject, html_body, text_body, template_type, variables, is_active, is_system
) VALUES (
  'system_notification',
  '{{subject}}',
  E'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0;">{{subject}}</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
      <p>{{message}}</p>
      <center>
        <a href="{{action_url}}" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">{{action_text}}</a>
      </center>
    </div>
    <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
      <p>Advancia Pay Ledger Team</p>
    </div>
  </div>
</body>
</html>',
  E'{{subject}}\n\n{{message}}\n\n{{action_text}}: {{action_url}}\n\n---\nAdvancia Pay Ledger Team',
  'system',
  '["subject", "message", "action_url", "action_text"]'::jsonb,
  true,
  true
);

COMMIT;
