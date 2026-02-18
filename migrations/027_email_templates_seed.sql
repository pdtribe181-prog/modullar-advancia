-- Migration 027: Email Templates Seed Data
-- Populates the email_templates table with system templates

BEGIN;

-- ============================================================
-- SEED EMAIL TEMPLATES
-- ============================================================

-- Clear existing system templates
DELETE FROM public.email_templates WHERE is_system = true;

-- Payment Confirmation Template
INSERT INTO public.email_templates (
  name, subject, body_html, body_text, template_type, variables, is_active, is_system
) VALUES (
  'payment_confirmation',
  'Payment Confirmed - {{amount}}',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h1 style="color: #2563eb;">Payment Confirmed</h1>\n  <p>Dear {{patient_name}},</p>\n  <p>Your payment of <strong>{{amount}}</strong> has been successfully processed.</p>\n  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">\n    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Transaction ID</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{transaction_id}}</td></tr>\n    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Date</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{date}}</td></tr>\n    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Provider</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{provider_name}}</td></tr>\n    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Service</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{service_description}}</td></tr>\n  </table>\n  <p>Thank you for your payment.</p>\n  <p style="color: #6b7280; font-size: 12px;">This is an automated message from Advancia PayLedger.</p>\n</div>',
  E'Payment Confirmed\n\nDear {{patient_name}},\n\nYour payment of {{amount}} has been successfully processed.\n\nTransaction ID: {{transaction_id}}\nDate: {{date}}\nProvider: {{provider_name}}\nService: {{service_description}}\n\nThank you for your payment.\n\n---\nAdvancia PayLedger',
  'transactional',
  '["patient_name", "amount", "transaction_id", "date", "provider_name", "service_description"]'::jsonb,
  true,
  true
);

-- Payment Failed Template
INSERT INTO public.email_templates (
  name, subject, body_html, body_text, template_type, variables, is_active, is_system
) VALUES (
  'payment_failed',
  'Payment Failed - Action Required',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h1 style="color: #dc2626;">Payment Failed</h1>\n  <p>Dear {{patient_name}},</p>\n  <p>Unfortunately, your payment of <strong>{{amount}}</strong> could not be processed.</p>\n  <p><strong>Reason:</strong> {{failure_reason}}</p>\n  <p>Please update your payment method or try again.</p>\n  <a href="{{retry_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Retry Payment</a>\n  <p style="color: #6b7280; font-size: 12px;">If you need assistance, please contact support.</p>\n</div>',
  E'Payment Failed\n\nDear {{patient_name}},\n\nUnfortunately, your payment of {{amount}} could not be processed.\n\nReason: {{failure_reason}}\n\nPlease update your payment method or try again at: {{retry_url}}\n\n---\nAdvancia PayLedger',
  'transactional',
  '["patient_name", "amount", "failure_reason", "retry_url"]'::jsonb,
  true,
  true
);

-- Appointment Reminder Template
INSERT INTO public.email_templates (
  name, subject, body_html, body_text, template_type, variables, is_active, is_system
) VALUES (
  'appointment_reminder',
  'Appointment Reminder - {{appointment_date}}',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h1 style="color: #2563eb;">Appointment Reminder</h1>\n  <p>Dear {{patient_name}},</p>\n  <p>This is a reminder for your upcoming appointment.</p>\n  <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; padding: 16px;">\n    <tr><td style="padding: 8px;"><strong>Date:</strong></td><td style="padding: 8px;">{{appointment_date}}</td></tr>\n    <tr><td style="padding: 8px;"><strong>Time:</strong></td><td style="padding: 8px;">{{appointment_time}}</td></tr>\n    <tr><td style="padding: 8px;"><strong>Provider:</strong></td><td style="padding: 8px;">{{provider_name}}</td></tr>\n    <tr><td style="padding: 8px;"><strong>Location:</strong></td><td style="padding: 8px;">{{location}}</td></tr>\n  </table>\n  <p>If you need to reschedule, please do so at least 24 hours in advance.</p>\n  <a href="{{manage_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Manage Appointment</a>\n</div>',
  E'Appointment Reminder\n\nDear {{patient_name}},\n\nThis is a reminder for your upcoming appointment.\n\nDate: {{appointment_date}}\nTime: {{appointment_time}}\nProvider: {{provider_name}}\nLocation: {{location}}\n\nIf you need to reschedule, please do so at least 24 hours in advance.\n\nManage your appointment: {{manage_url}}\n\n---\nAdvancia PayLedger',
  'transactional',
  '["patient_name", "appointment_date", "appointment_time", "provider_name", "location", "manage_url"]'::jsonb,
  true,
  true
);

-- Security Alert Template
INSERT INTO public.email_templates (
  name, subject, body_html, body_text, template_type, variables, is_active, is_system
) VALUES (
  'security_alert',
  'Security Alert: {{alert_type}}',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h1 style="color: #dc2626;">Security Alert</h1>\n  <p>Dear {{user_name}},</p>\n  <p>We detected the following security event on your account:</p>\n  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">\n    <strong>{{alert_type}}</strong><br>\n    <span style="color: #6b7280;">{{alert_time}}</span>\n  </div>\n  <p><strong>Details:</strong></p>\n  <ul>\n    <li>IP Address: {{ip_address}}</li>\n    <li>Device: {{device}}</li>\n    <li>Location: {{location}}</li>\n  </ul>\n  <p>If this was not you, please secure your account immediately.</p>\n  <a href="{{secure_account_url}}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Secure My Account</a>\n</div>',
  E'Security Alert\n\nDear {{user_name}},\n\nWe detected the following security event on your account:\n\n{{alert_type}}\n{{alert_time}}\n\nDetails:\n- IP Address: {{ip_address}}\n- Device: {{device}}\n- Location: {{location}}\n\nIf this was not you, please secure your account immediately: {{secure_account_url}}\n\n---\nAdvancia PayLedger Security Team',
  'transactional',
  '["user_name", "alert_type", "alert_time", "ip_address", "device", "location", "secure_account_url"]'::jsonb,
  true,
  true
);

-- Invoice Template
INSERT INTO public.email_templates (
  name, subject, body_html, body_text, template_type, variables, is_active, is_system
) VALUES (
  'invoice',
  'Invoice #{{invoice_number}} - {{amount}} Due',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h1 style="color: #2563eb;">Invoice</h1>\n  <p>Dear {{patient_name}},</p>\n  <p>Please find your invoice details below.</p>\n  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">\n    <tr style="background: #f8fafc;"><td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Invoice Number</strong></td><td style="padding: 12px; border: 1px solid #e5e7eb;">{{invoice_number}}</td></tr>\n    <tr><td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Date Issued</strong></td><td style="padding: 12px; border: 1px solid #e5e7eb;">{{issue_date}}</td></tr>\n    <tr><td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Due Date</strong></td><td style="padding: 12px; border: 1px solid #e5e7eb;">{{due_date}}</td></tr>\n    <tr><td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Provider</strong></td><td style="padding: 12px; border: 1px solid #e5e7eb;">{{provider_name}}</td></tr>\n    <tr style="background: #f8fafc;"><td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Amount Due</strong></td><td style="padding: 12px; border: 1px solid #e5e7eb; font-size: 18px;"><strong>{{amount}}</strong></td></tr>\n  </table>\n  <a href="{{pay_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Pay Now</a>\n</div>',
  E'Invoice #{{invoice_number}}\n\nDear {{patient_name}},\n\nPlease find your invoice details below.\n\nInvoice Number: {{invoice_number}}\nDate Issued: {{issue_date}}\nDue Date: {{due_date}}\nProvider: {{provider_name}}\nAmount Due: {{amount}}\n\nPay now: {{pay_url}}\n\n---\nAdvancia PayLedger',
  'transactional',
  '["patient_name", "invoice_number", "issue_date", "due_date", "provider_name", "amount", "pay_url"]'::jsonb,
  true,
  true
);

-- Welcome Email Template
INSERT INTO public.email_templates (
  name, subject, body_html, body_text, template_type, variables, is_active, is_system
) VALUES (
  'welcome',
  'Welcome to Advancia PayLedger!',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h1 style="color: #2563eb;">Welcome to Advancia PayLedger!</h1>\n  <p>Dear {{user_name}},</p>\n  <p>Thank you for joining Advancia PayLedger. We''re excited to have you on board!</p>\n  <p>With your new account, you can:</p>\n  <ul>\n    <li>Schedule and manage appointments</li>\n    <li>Make secure payments</li>\n    <li>View your payment history</li>\n    <li>Communicate with your healthcare providers</li>\n  </ul>\n  <a href="{{dashboard_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Go to Dashboard</a>\n  <p>If you have any questions, our support team is here to help.</p>\n</div>',
  E'Welcome to Advancia PayLedger!\n\nDear {{user_name}},\n\nThank you for joining Advancia PayLedger. We''re excited to have you on board!\n\nWith your new account, you can:\n- Schedule and manage appointments\n- Make secure payments\n- View your payment history\n- Communicate with your healthcare providers\n\nGo to your dashboard: {{dashboard_url}}\n\nIf you have any questions, our support team is here to help.\n\n---\nAdvancia PayLedger Team',
  'transactional',
  '["user_name", "dashboard_url"]'::jsonb,
  true,
  true
);

-- Password Reset Template
INSERT INTO public.email_templates (
  name, subject, body_html, body_text, template_type, variables, is_active, is_system
) VALUES (
  'password_reset',
  'Reset Your Password',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h1 style="color: #2563eb;">Reset Your Password</h1>\n  <p>Dear {{user_name}},</p>\n  <p>We received a request to reset your password. Click the button below to create a new password:</p>\n  <a href="{{reset_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>\n  <p>This link will expire in {{expiry_time}}.</p>\n  <p style="color: #6b7280; font-size: 12px;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>\n</div>',
  E'Reset Your Password\n\nDear {{user_name}},\n\nWe received a request to reset your password. Click the link below to create a new password:\n\n{{reset_url}}\n\nThis link will expire in {{expiry_time}}.\n\nIf you did not request a password reset, please ignore this email or contact support if you have concerns.\n\n---\nAdvancia PayLedger',
  'transactional',
  '["user_name", "reset_url", "expiry_time"]'::jsonb,
  true,
  true
);

COMMIT;
