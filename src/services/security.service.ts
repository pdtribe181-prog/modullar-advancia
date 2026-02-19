/**
 * Security Events Service
 * Logs security-related events and sends notifications
 */

import { supabase } from '../lib/supabase.js';
import { logger } from '../middleware/logging.middleware.js';
import { sendSecurityNotification } from './email.service.js';

export type SecurityEventType =
  | 'login'
  | 'logout'
  | 'password_changed'
  | 'email_changed'
  | 'phone_changed'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'mfa_challenged'
  | 'recovery_initiated'
  | 'recovery_completed'
  | 'identity_linked'
  | 'identity_unlinked'
  | 'failed_login'
  | 'suspicious_activity';

interface SecurityEventData {
  userId: string;
  eventType: SecurityEventType;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  location?: {
    city?: string;
    country?: string;
    region?: string;
  };
  metadata?: Record<string, unknown>;
}

interface UserNotificationPrefs {
  email?: string;
  phone?: string;
  name?: string;
  preferences?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    notifyOnLogin?: boolean;
    notifyOnPasswordChange?: boolean;
    notifyOnEmailChange?: boolean;
    notifyOnNewDevice?: boolean;
  };
}

/**
 * Log a security event to the database
 */
export async function logSecurityEvent(data: SecurityEventData): Promise<string | null> {
  try {
    const { data: result, error } = await supabase
      .from('security_events')
      .insert({
        user_id: data.userId,
        event_type: data.eventType,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        device_fingerprint: data.deviceFingerprint,
        location: data.location,
        metadata: data.metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to log security event', error as Error, { eventType: data.eventType });
      return null;
    }

    logger.info('Security event logged', {
      eventId: result.id,
      eventType: data.eventType,
      userId: data.userId.slice(0, 8) + '...',
    });

    return result.id;
  } catch (error) {
    logger.error('Error logging security event', error as Error);
    return null;
  }
}

/**
 * Log event and send notifications based on user preferences
 */
export async function logAndNotify(
  data: SecurityEventData,
  user: UserNotificationPrefs
): Promise<void> {
  // Log the event
  await logSecurityEvent(data);

  // Determine if notification should be sent based on event type and preferences
  const prefs = user.preferences || {};
  const shouldNotify = shouldSendNotification(data.eventType, prefs);

  if (!shouldNotify) {
    return;
  }

  // Prepare notification data
  const notificationData = {
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    device: data.userAgent ? parseUserAgent(data.userAgent) : undefined,
    location: data.location ? formatLocation(data.location) : undefined,
    ipAddress: data.ipAddress,
    ...data.metadata,
  };

  // Map event types to notification types
  const notificationMap: Partial<
    Record<SecurityEventType, Parameters<typeof sendSecurityNotification>[1]>
  > = {
    password_changed: 'password_changed',
    email_changed: 'email_changed',
    login: 'new_login',
    mfa_enabled: 'mfa_enabled',
    mfa_disabled: 'mfa_disabled',
  };

  const notificationType = notificationMap[data.eventType];
  if (notificationType) {
    await sendSecurityNotification(user, notificationType, notificationData);
  }
}

/**
 * Check recent security events for suspicious activity
 */
export async function checkSuspiciousActivity(
  userId: string,
  currentIp?: string
): Promise<{ suspicious: boolean; reason?: string }> {
  try {
    // Get recent login events
    const { data: recentEvents, error } = await supabase
      .from('security_events')
      .select('*')
      .eq('user_id', userId)
      .eq('event_type', 'login')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !recentEvents) {
      return { suspicious: false };
    }

    // Check for multiple failed logins
    const failedLogins = recentEvents.filter(
      (e) =>
        e.event_type === 'failed_login' &&
        new Date(e.created_at) > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );

    if (failedLogins.length >= 5) {
      return { suspicious: true, reason: 'Multiple failed login attempts' };
    }

    // Check for login from new location
    if (currentIp && recentEvents.length > 0) {
      const knownIps = new Set(recentEvents.map((e) => e.ip_address).filter(Boolean));
      if (!knownIps.has(currentIp) && knownIps.size > 0) {
        return { suspicious: true, reason: 'Login from new IP address' };
      }
    }

    return { suspicious: false };
  } catch (error) {
    logger.error('Error checking suspicious activity', error as Error);
    return { suspicious: false };
  }
}

/**
 * Get user's recent security events
 */
export async function getUserSecurityEvents(
  userId: string,
  options: { limit?: number; types?: SecurityEventType[] } = {}
): Promise<Array<Record<string, unknown>>> {
  const { limit = 20, types } = options;

  let query = supabase
    .from('security_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (types && types.length > 0) {
    query = query.in('event_type', types);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching security events', error as Error);
    return [];
  }

  return data || [];
}

/**
 * Get security summary for user
 */
export async function getSecuritySummary(userId: string): Promise<{
  recentLogins: number;
  failedLogins: number;
  mfaEnabled: boolean;
  lastPasswordChange: string | null;
  suspiciousActivity: boolean;
}> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { data: events } = await supabase
    .from('security_events')
    .select('event_type, created_at')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  const recentLogins = events?.filter((e) => e.event_type === 'login').length || 0;
  const failedLogins = events?.filter((e) => e.event_type === 'failed_login').length || 0;

  const mfaEvents =
    events?.filter((e) => e.event_type === 'mfa_enabled' || e.event_type === 'mfa_disabled') || [];
  const mfaEnabled = mfaEvents.length > 0 && mfaEvents[0].event_type === 'mfa_enabled';

  const passwordChanges = events?.filter((e) => e.event_type === 'password_changed') || [];
  const lastPasswordChange = passwordChanges.length > 0 ? passwordChanges[0].created_at : null;

  const { suspicious } = await checkSuspiciousActivity(userId);

  return {
    recentLogins,
    failedLogins,
    mfaEnabled,
    lastPasswordChange,
    suspiciousActivity: suspicious,
  };
}

// Helper functions

function shouldSendNotification(
  eventType: SecurityEventType,
  preferences: UserNotificationPrefs['preferences']
): boolean {
  if (!preferences) return true;

  switch (eventType) {
    case 'login':
      return preferences.notifyOnLogin !== false || preferences.notifyOnNewDevice !== false;
    case 'password_changed':
      return preferences.notifyOnPasswordChange !== false;
    case 'email_changed':
      return preferences.notifyOnEmailChange !== false;
    case 'mfa_enabled':
    case 'mfa_disabled':
    case 'suspicious_activity':
      return true; // Always notify for these
    default:
      return preferences.emailNotifications !== false || preferences.smsNotifications === true;
  }
}

function parseUserAgent(userAgent: string): string {
  // Simple user agent parsing
  if (userAgent.includes('Mobile')) {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('Android')) return 'Android Device';
    return 'Mobile Device';
  }
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux PC';
  return 'Unknown Device';
}

function formatLocation(location: { city?: string; country?: string; region?: string }): string {
  const parts = [location.city, location.region, location.country].filter(Boolean);
  return parts.join(', ') || 'Unknown Location';
}

/**
 * Extract IP address from request
 */
export function extractIPAddress(req: {
  headers?: Record<string, unknown>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string | undefined {
  // Check common proxy headers
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }

  // Fall back to direct IP
  return req.ip || req.socket?.remoteAddress;
}

export default {
  logSecurityEvent,
  logAndNotify,
  checkSuspiciousActivity,
  getUserSecurityEvents,
  getSecuritySummary,
  extractIPAddress,
};
