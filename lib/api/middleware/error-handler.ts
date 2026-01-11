/**
 * Error handling middleware for API routes
 */
import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/utils/errorHandler';

/**
 * Wraps API route handler with error handling
 */
export function withErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error: any) {
      logError(error, 'API Route Error');

      // Don't expose internal error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'אירעה שגיאה בשרת',
          ...(isDevelopment && {
            details: error.message,
            stack: error.stack,
          }),
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Rate limiting middleware (simple in-memory implementation)
 * For production, use Redis or a dedicated service
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
) {
  return (
    handler: (req: NextRequest) => Promise<NextResponse>
  ) => {
    return async (req: NextRequest) => {
      const ip = req.headers.get('x-forwarded-for') || 
                 req.headers.get('x-real-ip') || 
                 'unknown';
      
      const now = Date.now();
      const key = `${ip}-${req.nextUrl.pathname}`;
      
      const record = rateLimitMap.get(key);
      
      if (record && record.resetTime > now) {
        if (record.count >= maxRequests) {
          return NextResponse.json(
            { error: 'Too many requests', message: 'יותר מדי בקשות. אנא נסה שוב מאוחר יותר.' },
            { status: 429 }
          );
        }
        record.count++;
      } else {
        rateLimitMap.set(key, {
          count: 1,
          resetTime: now + windowMs,
        });
      }

      // Clean up old entries periodically
      if (Math.random() < 0.01) { // 1% chance
        for (const [k, v] of rateLimitMap.entries()) {
          if (v.resetTime < now) {
            rateLimitMap.delete(k);
          }
        }
      }

      return handler(req);
    };
  };
}





