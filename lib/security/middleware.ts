// ============================================
// Security Middleware for Next.js API Routes
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// ============================================
// Rate Limiting with In-Memory Store
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 600000);

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const { maxRequests, windowMs, keyPrefix = 'rl' } = options;

  return function rateLimitMiddleware(request: NextRequest): { limited: boolean; remaining: number; reset: number } {
    // Get identifier (IP address or user ID if authenticated)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return { limited: false, remaining: maxRequests - 1, reset: now + windowMs };
    }

    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      return { limited: true, remaining: 0, reset: entry.resetTime };
    }

    // Increment count
    entry.count++;
    return { limited: false, remaining: maxRequests - entry.count, reset: entry.resetTime };
  };
}

// ============================================
// Admin Authentication Middleware
// ============================================

export interface AuthResult {
  authorized: boolean;
  userId?: string;
  userEmail?: string;
  method?: 'session' | 'api_key';
  error?: string;
}

export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  try {
    // Option 1: Check Admin Session (preferred)
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (!sessionError && session) {
      // Check if user is admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select(`
          user_id,
          email,
          roles:role_id (
            name
          )
        `)
        .eq('user_id', session.user.id)
        .maybeSingle();

      const role = adminProfile?.roles;
      const roleName = typeof role === 'object' ? (role as any)?.name : role;

      if (roleName === 'admin') {
        return {
          authorized: true,
          userId: session.user.id,
          userEmail: session.user.email || adminProfile?.email,
          method: 'session'
        };
      }
    }

    // Option 2: Check API Key (fallback, but log usage for monitoring)
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
    const validApiKey = process.env.ADMIN_API_KEY || process.env.API_KEY;

    if (apiKey && validApiKey && apiKey === validApiKey) {
      // API key is valid, but we should log this for security monitoring
      console.warn('[SECURITY] Admin API key used from IP:', request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'));

      return {
        authorized: true,
        method: 'api_key',
        userEmail: 'api_key_user'
      };
    }

    return {
      authorized: false,
      error: 'Unauthorized. Admin access required.'
    };
  } catch (error: any) {
    console.error('[SECURITY] Admin auth error:', error);
    return {
      authorized: false,
      error: 'Authentication failed'
    };
  }
}

// ============================================
// Audit Logging
// ============================================

export interface AuditLogEntry {
  user_id?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failure';
  error_message?: string;
}

export async function logAuditEvent(entry: AuditLogEntry) {
  try {
    const supabase = createServerClient();

    // Try to insert into audit_logs table
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        ...entry,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      // If table doesn't exist, log to console (fallback)
      console.log('[AUDIT]', JSON.stringify(entry));
    }
  } catch (error) {
    // Fallback to console logging
    console.log('[AUDIT]', JSON.stringify(entry));
  }
}

// ============================================
// Input Validation
// ============================================

export const ALLOWED_UPDATE_FIELDS = new Set([
  'display_name',
  'full_name',
  'nickname',
  'first_name',
  'bio',
  'headline',
  'avatar_url',
  'phone',
  'address',
  'social_links',
  'role_id',
  'points',
  'level'
]);

export function validateUpdateFields(updates: any): { valid: boolean; invalidFields: string[] } {
  const invalidFields: string[] = [];

  for (const key of Object.keys(updates)) {
    if (!ALLOWED_UPDATE_FIELDS.has(key)) {
      invalidFields.push(key);
    }
  }

  return {
    valid: invalidFields.length === 0,
    invalidFields
  };
}

// Sanitize sensitive fields from being updated
export const SENSITIVE_FIELDS = new Set([
  'user_id',
  'email', // Email should be updated through Supabase Auth, not profiles table
  'created_at',
  'updated_at'
]);

export function sanitizeUpdates(updates: any): any {
  const sanitized = { ...updates };

  for (const field of SENSITIVE_FIELDS) {
    delete sanitized[field];
  }

  return sanitized;
}

// ============================================
// Error Sanitization (prevent information leakage)
// ============================================

export function sanitizeError(error: any): { message: string; code?: string } {
  // In production, don't leak database details
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    return {
      message: error.message || 'An error occurred',
      code: error.code
    };
  }

  // In production, return generic errors
  const errorCode = error.code;

  // Map database error codes to user-friendly messages
  const errorMap: Record<string, string> = {
    '23505': 'A record with this value already exists',
    '23503': 'Referenced record does not exist',
    '23502': 'Required field is missing',
    '42P01': 'Invalid request',
    'PGRST116': 'Record not found',
  };

  return {
    message: errorMap[errorCode] || 'An error occurred. Please try again.',
    code: isDevelopment ? errorCode : undefined
  };
}

// ============================================
// Security Headers
// ============================================

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://player.vimeo.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: http:",
      "font-src 'self' data:",
      "frame-src 'self' https://www.youtube.com https://player.vimeo.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "media-src 'self' https: http: blob:",
    ].join('; ')
  );

  // Other security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

// ============================================
// Combined Admin Middleware
// ============================================

interface AdminMiddlewareOptions {
  rateLimitOptions?: RateLimitOptions;
  logAudit?: boolean;
  auditAction?: string;
  auditResourceType?: string;
}

export async function withAdminMiddleware(
  request: NextRequest,
  options: AdminMiddlewareOptions = {}
): Promise<{ success: true; auth: AuthResult } | { success: false; response: NextResponse }> {
  // 1. Rate limiting
  if (options.rateLimitOptions) {
    const rateLimitCheck = rateLimit(options.rateLimitOptions)(request);

    if (rateLimitCheck.limited) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      response.headers.set('Retry-After', String(Math.ceil((rateLimitCheck.reset - Date.now()) / 1000)));
      return { success: false, response: addSecurityHeaders(response) };
    }
  }

  // 2. Admin authentication
  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    const response = NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: 401 }
    );

    // Log failed auth attempt
    if (options.logAudit) {
      await logAuditEvent({
        action: options.auditAction || 'unauthorized_access_attempt',
        resource_type: options.auditResourceType || 'api',
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        status: 'failure',
        error_message: auth.error
      });
    }

    return { success: false, response: addSecurityHeaders(response) };
  }

  return { success: true, auth };
}
