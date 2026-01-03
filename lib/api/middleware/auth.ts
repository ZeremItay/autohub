/**
 * Authentication middleware for API routes
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email?: string;
  };
}

/**
 * Middleware to require authentication
 */
export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const supabase = createServerClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session?.user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'נדרשת התחברות' },
          { status: 401 }
        );
      }

      // Attach user to request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = {
        id: session.user.id,
        email: session.user.email,
      };

      return handler(authenticatedReq);
    } catch (error: any) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: 'שגיאה בשרת' },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware to require admin role
 */
export async function withAdmin(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (req) => {
    try {
      const supabase = createServerClient();
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role_id, roles:role_id(name)')
        .eq('user_id', req.user!.id)
        .single();

      if (error || !profile) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'גישה נדחתה' },
          { status: 403 }
        );
      }

      const roles = profile.roles;
      let roleName: string | null = null;
      
      if (Array.isArray(roles) && roles.length > 0) {
        roleName = roles[0]?.name || null;
      } else if (roles && typeof roles === 'object' && !Array.isArray(roles)) {
        roleName = (roles as any).name || null;
      } else if (typeof roles === 'string') {
        roleName = roles;
      }

      if (roleName !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden', message: 'נדרשת הרשאת מנהל' },
          { status: 403 }
        );
      }

      return handler(req);
    } catch (error: any) {
      console.error('Admin middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: 'שגיאה בשרת' },
        { status: 500 }
      );
    }
  });
}

