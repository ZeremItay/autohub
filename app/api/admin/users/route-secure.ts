// ============================================
// SECURE Admin Users API
// ============================================
// This is the SECURE version with:
// - Rate limiting
// - Audit logging
// - Input validation
// - Error sanitization
// - Security headers

import { createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  withAdminMiddleware,
  logAuditEvent,
  validateUpdateFields,
  sanitizeUpdates,
  sanitizeError,
  addSecurityHeaders,
  ALLOWED_UPDATE_FIELDS
} from '@/lib/security/middleware';

// Rate limit: 100 requests per 15 minutes per IP
const RATE_LIMIT_CONFIG = {
  maxRequests: 100,
  windowMs: 15 * 60 * 1000,
  keyPrefix: 'admin_users'
};

// ============================================
// GET - List Users
// ============================================
export async function GET(request: NextRequest) {
  try {
    // Apply security middleware
    const middlewareResult = await withAdminMiddleware(request, {
      rateLimitOptions: RATE_LIMIT_CONFIG,
      logAudit: true,
      auditAction: 'admin_users_list',
      auditResourceType: 'users'
    });

    if (!middlewareResult.success) {
      return middlewareResult.response;
    }

    const auth = middlewareResult.auth;
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const search = searchParams.get('search');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 1000) : 100; // Max 1000

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[SECURITY] Missing Supabase configuration');
      const response = NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    let query = supabaseAdmin
      .from('profiles')
      .select(`
        id,
        user_id,
        display_name,
        full_name,
        nickname,
        email,
        avatar_url,
        points,
        level,
        created_at,
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (email) {
      query = query.eq('email', email);
    } else if (search) {
      query = query.or(`display_name.ilike.%${search}%,nickname.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      await logAuditEvent({
        user_id: auth.userId,
        user_email: auth.userEmail,
        action: 'admin_users_list',
        resource_type: 'users',
        details: { search, email, limit },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        status: 'failure',
        error_message: error.message
      });

      const response = NextResponse.json(
        { error: sanitizeError(error).message },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    await logAuditEvent({
      user_id: auth.userId,
      user_email: auth.userEmail,
      action: 'admin_users_list',
      resource_type: 'users',
      details: { search, email, count: data?.length || 0 },
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      status: 'success'
    });

    const response = NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('[ERROR] Admin users GET:', error);
    const response = NextResponse.json(
      { error: sanitizeError(error).message },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// ============================================
// POST - Create User
// ============================================
export async function POST(request: NextRequest) {
  try {
    const middlewareResult = await withAdminMiddleware(request, {
      rateLimitOptions: { ...RATE_LIMIT_CONFIG, maxRequests: 20 }, // Stricter for creates
      logAudit: true,
      auditAction: 'admin_user_create',
      auditResourceType: 'user'
    });

    if (!middlewareResult.success) {
      return middlewareResult.response;
    }

    const auth = middlewareResult.auth;
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.user_id) {
      const response = NextResponse.json(
        { error: 'Email and user_id are required' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Sanitize input
    const sanitizedBody = sanitizeUpdates(body);

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .insert([sanitizedBody])
      .select()
      .single();

    if (error) {
      await logAuditEvent({
        user_id: auth.userId,
        user_email: auth.userEmail,
        action: 'admin_user_create',
        resource_type: 'user',
        details: { email: body.email },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        status: 'failure',
        error_message: error.message
      });

      const response = NextResponse.json(
        { error: sanitizeError(error).message },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    await logAuditEvent({
      user_id: auth.userId,
      user_email: auth.userEmail,
      action: 'admin_user_create',
      resource_type: 'user',
      resource_id: data.id,
      details: { email: data.email, display_name: data.display_name },
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      status: 'success'
    });

    const response = NextResponse.json({ data });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('[ERROR] Admin users POST:', error);
    const response = NextResponse.json(
      { error: sanitizeError(error).message },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// ============================================
// PUT - Update User(s)
// ============================================
export async function PUT(request: NextRequest) {
  try {
    const middlewareResult = await withAdminMiddleware(request, {
      rateLimitOptions: { ...RATE_LIMIT_CONFIG, maxRequests: 50 }, // Stricter for updates
      logAudit: true,
      auditAction: 'admin_user_update',
      auditResourceType: 'user'
    });

    if (!middlewareResult.success) {
      return middlewareResult.response;
    }

    const auth = middlewareResult.auth;
    const body = await request.json();

    // Bulk update
    if (body.ids && Array.isArray(body.ids)) {
      const { ids, ...updates } = body;

      if (!ids || ids.length === 0) {
        const response = NextResponse.json(
          { error: 'No user IDs provided' },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      // Validate update fields
      const validation = validateUpdateFields(updates);
      if (!validation.valid) {
        await logAuditEvent({
          user_id: auth.userId,
          user_email: auth.userEmail,
          action: 'admin_user_bulk_update',
          resource_type: 'user',
          details: { ids, invalidFields: validation.invalidFields },
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
          user_agent: request.headers.get('user-agent') || undefined,
          status: 'failure',
          error_message: `Invalid fields: ${validation.invalidFields.join(', ')}`
        });

        const response = NextResponse.json(
          {
            error: 'Invalid fields in update',
            invalidFields: validation.invalidFields,
            allowedFields: Array.from(ALLOWED_UPDATE_FIELDS)
          },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      // Sanitize updates
      const sanitizedUpdates = sanitizeUpdates(updates);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        const response = NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
        return addSecurityHeaders(response);
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // Handle points history if points are being updated
      if (sanitizedUpdates.points !== undefined) {
        const { data: currentProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, points')
          .in('id', ids);

        if (currentProfiles) {
          const newPoints = parseInt(sanitizedUpdates.points) || 0;
          const pointsHistoryEntries = currentProfiles
            .map(profile => {
              const currentPoints = profile.points || 0;
              const pointsDifference = newPoints - currentPoints;
              if (pointsDifference !== 0) {
                return {
                  user_id: profile.id,
                  points: pointsDifference,
                  action: pointsDifference > 0 ? 'תוספת ידנית מאדמין' : 'הפחתה ידנית מאדמין'
                };
              }
              return null;
            })
            .filter(Boolean);

          if (pointsHistoryEntries.length > 0) {
            await supabaseAdmin
              .from('points_history')
              .insert(pointsHistoryEntries);
          }
        }
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(sanitizedUpdates)
        .in('id', ids)
        .select(`
          id,
          display_name,
          email,
          roles:role_id (name)
        `);

      if (error) {
        await logAuditEvent({
          user_id: auth.userId,
          user_email: auth.userEmail,
          action: 'admin_user_bulk_update',
          resource_type: 'user',
          details: { ids, updates: sanitizedUpdates, count: ids.length },
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
          user_agent: request.headers.get('user-agent') || undefined,
          status: 'failure',
          error_message: error.message
        });

        const response = NextResponse.json(
          { error: sanitizeError(error).message },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      await logAuditEvent({
        user_id: auth.userId,
        user_email: auth.userEmail,
        action: 'admin_user_bulk_update',
        resource_type: 'user',
        details: { ids, updates: sanitizedUpdates, count: data?.length || 0 },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        status: 'success'
      });

      const response = NextResponse.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      });
      return addSecurityHeaders(response);
    }

    // Single user update
    const { id, ...updates } = body;

    if (!id) {
      const response = NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Validate update fields
    const validation = validateUpdateFields(updates);
    if (!validation.valid) {
      await logAuditEvent({
        user_id: auth.userId,
        user_email: auth.userEmail,
        action: 'admin_user_update',
        resource_type: 'user',
        resource_id: id,
        details: { invalidFields: validation.invalidFields },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        status: 'failure',
        error_message: `Invalid fields: ${validation.invalidFields.join(', ')}`
      });

      const response = NextResponse.json(
        {
          error: 'Invalid fields in update',
          invalidFields: validation.invalidFields,
          allowedFields: Array.from(ALLOWED_UPDATE_FIELDS)
        },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Sanitize updates
    const sanitizedUpdates = sanitizeUpdates(updates);
    const supabase = createServerClient();

    // Handle points history
    if (sanitizedUpdates.points !== undefined) {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('points, id')
        .eq('id', id)
        .single();

      if (currentProfile) {
        const currentPoints = currentProfile.points || 0;
        const newPoints = parseInt(sanitizedUpdates.points) || 0;
        const pointsDifference = newPoints - currentPoints;

        if (pointsDifference !== 0) {
          await supabase
            .from('points_history')
            .insert([{
              user_id: currentProfile.id,
              points: pointsDifference,
              action: pointsDifference > 0 ? 'תוספת ידנית מאדמין' : 'הפחתה ידנית מאדמין'
            }]);
        }
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select(`
        id,
        display_name,
        email,
        roles:role_id (name)
      `)
      .single();

    if (error) {
      await logAuditEvent({
        user_id: auth.userId,
        user_email: auth.userEmail,
        action: 'admin_user_update',
        resource_type: 'user',
        resource_id: id,
        details: { updates: sanitizedUpdates },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        status: 'failure',
        error_message: error.message
      });

      const response = NextResponse.json(
        { error: sanitizeError(error).message },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    await logAuditEvent({
      user_id: auth.userId,
      user_email: auth.userEmail,
      action: 'admin_user_update',
      resource_type: 'user',
      resource_id: data.id,
      details: { updates: sanitizedUpdates, email: data.email },
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      status: 'success'
    });

    const response = NextResponse.json({ data });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('[ERROR] Admin users PUT:', error);
    const response = NextResponse.json(
      { error: sanitizeError(error).message },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// ============================================
// DELETE - Delete User
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const middlewareResult = await withAdminMiddleware(request, {
      rateLimitOptions: { ...RATE_LIMIT_CONFIG, maxRequests: 10 }, // Very strict for deletes
      logAudit: true,
      auditAction: 'admin_user_delete',
      auditResourceType: 'user'
    });

    if (!middlewareResult.success) {
      return middlewareResult.response;
    }

    const auth = middlewareResult.auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      const response = NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      const response = NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get profile info before deletion for audit log
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, display_name')
      .eq('id', id)
      .maybeSingle();

    if (!profile) {
      const response = NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // Delete user from Auth (cascades to profile)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(profile.user_id);

    if (authDeleteError) {
      // Try to delete profile manually if auth delete fails
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', id);

      await logAuditEvent({
        user_id: auth.userId,
        user_email: auth.userEmail,
        action: 'admin_user_delete',
        resource_type: 'user',
        resource_id: id,
        details: { email: profile.email, display_name: profile.display_name },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        status: profileDeleteError ? 'failure' : 'success',
        error_message: profileDeleteError ? `Auth delete failed: ${authDeleteError.message}. Profile delete: ${profileDeleteError.message}` : `Auth delete failed but profile deleted: ${authDeleteError.message}`
      });

      if (profileDeleteError) {
        const response = NextResponse.json(
          { error: sanitizeError(profileDeleteError).message },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      const response = NextResponse.json({
        success: true,
        warning: 'User deleted from profiles but failed to delete from Auth'
      });
      return addSecurityHeaders(response);
    }

    await logAuditEvent({
      user_id: auth.userId,
      user_email: auth.userEmail,
      action: 'admin_user_delete',
      resource_type: 'user',
      resource_id: id,
      details: { email: profile.email, display_name: profile.display_name },
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      status: 'success'
    });

    const response = NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('[ERROR] Admin users DELETE:', error);
    const response = NextResponse.json(
      { error: sanitizeError(error).message },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
