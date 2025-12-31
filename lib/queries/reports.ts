import { supabase } from '../supabase';
import { createServerClient } from '../supabase-server';

export interface Report {
  id: string;
  title: string;
  content: string;
  user_id: string;
  views: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    display_name?: string;
    avatar_url?: string;
    user_id?: string;
  };
}

// Get all published reports (for carousel)
export async function getAllReports(limit?: number) {
  let query = supabase
    .from('reports')
    .select(`
      *,
      profile:profiles!reports_user_id_fkey (
        display_name,
        avatar_url,
        user_id
      )
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    const errorMessage = String(error.message || '');
    const errorCode = String(error.code || '');
    
    // Check if it's a table doesn't exist error
    const isTableMissing = errorCode === 'PGRST116' || 
        errorCode === '42P01' || 
        errorMessage.includes('relation') || 
        errorMessage.includes('does not exist') ||
        errorMessage.includes('doesn\'t exist');
    
    if (isTableMissing) {
      console.warn('Reports table does not exist yet. Returning empty array.');
      console.warn('To fix: Run the SQL script "supabase-create-reports-table.sql" in Supabase SQL Editor');
      return { data: [], error: null };
    }
    
    // For RLS errors, return empty array
    if (errorMessage.includes('permission denied') ||
        errorMessage.includes('new row violates row-level security') ||
        errorMessage.includes('RLS') ||
        errorMessage.includes('row-level security')) {
      console.warn('Reports RLS issue. Returning empty array.');
      return { data: [], error: null };
    }
    
    console.warn('Error fetching reports, returning empty array:', {
      message: errorMessage,
      code: errorCode
    });
    return { data: [], error: null };
  }

  const reports = data as any[];
  if (!reports || reports.length === 0) {
    return { data: [], error: null };
  }

  // Get unique user IDs
  const userIds = [...new Set(reports.map((r: any) => r.user_id).filter(Boolean))];
  
  // Fetch profiles if we have user IDs
  let profileMap = new Map();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);
    
    profileMap = new Map(
      (profiles || []).map((p: any) => [p.user_id, {
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        user_id: p.user_id
      }])
    );
  }

  // Map reports with profiles
  const reportsWithProfiles = reports.map((report: any) => ({
    ...report,
    profile: profileMap.get(report.user_id) || null
  }));

  return { data: reportsWithProfiles, error: null };
}

// Get a single report by ID
export async function getReportById(id: string) {
  try {
    // First increment views
    await incrementReportViews(id);

    // Then fetch the report with updated views
    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error) {
      console.error('Error fetching report:', error);
      return { data: null, error };
    }

    if (!report) {
      return { data: null, error: null };
    }

    // Fetch profile for this user
    let profile = null;
    if (report.user_id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', report.user_id)
        .single();
      
      if (profileData) {
        profile = {
          display_name: profileData.display_name,
          avatar_url: profileData.avatar_url,
          user_id: profileData.user_id
        };
      }
    }

    return { data: { ...report, profile }, error: null };
  } catch (error: any) {
    console.error('Error in getReportById:', error);
    return { data: null, error };
  }
}

// Create a new report (admin only)
export async function createReport(data: {
  title: string;
  content: string;
  user_id: string;
  is_published?: boolean;
  created_at?: string;
}) {
  try {
    // Use server client for admin operations
    const supabaseServer = createServerClient();

    const insertData: any = {
      title: data.title,
      content: data.content,
      user_id: data.user_id,
      is_published: data.is_published !== undefined ? data.is_published : true
    };

    // Add created_at if provided
    if (data.created_at) {
      insertData.created_at = data.created_at;
    }

    const { data: reportData, error } = await supabaseServer
      .from('reports')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating report:', error);
      return { data: null, error };
    }

    return { data: reportData, error: null };
  } catch (error: any) {
    console.error('Error in createReport:', error);
    return { data: null, error };
  }
}

// Increment report views
export async function incrementReportViews(id: string) {
  try {
    const { error } = await supabase.rpc('increment_report_views', {
      report_id: id
    });

    // If RPC doesn't exist, use update instead
    if (error && error.message?.includes('function') && error.message?.includes('does not exist')) {
      const { data: currentReport } = await supabase
        .from('reports')
        .select('views')
        .eq('id', id)
        .single();

      if (currentReport) {
        const { error: updateError } = await supabase
          .from('reports')
          .update({ views: (currentReport.views || 0) + 1 })
          .eq('id', id);

        if (updateError) {
          console.error('Error incrementing report views:', updateError);
          return { error: updateError };
        }
      }
    } else if (error) {
      console.error('Error incrementing report views:', error);
      return { error };
    }

    return { error: null };
  } catch (error: any) {
    console.error('Error in incrementReportViews:', error);
    return { error };
  }
}

// Update a report (admin only)
export async function updateReport(id: string, data: {
  title?: string;
  content?: string;
  is_published?: boolean;
}) {
  try {
    const supabaseServer = createServerClient();

    const { data: reportData, error } = await supabaseServer
      .from('reports')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating report:', error);
      return { data: null, error };
    }

    return { data: reportData, error: null };
  } catch (error: any) {
    console.error('Error in updateReport:', error);
    return { data: null, error };
  }
}

// Delete a report (admin only)
export async function deleteReport(id: string) {
  try {
    const supabaseServer = createServerClient();

    const { error } = await supabaseServer
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting report:', error);
      return { error };
    }

    return { error: null };
  } catch (error: any) {
    console.error('Error in deleteReport:', error);
    return { error };
  }
}

// Get all reports for admin panel (including unpublished)
export async function getAllReportsForAdmin() {
  try {
    const supabaseServer = createServerClient();

    // First get all reports
    const { data: reports, error: reportsError } = await supabaseServer
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (reportsError) {
      const errorMessage = String(reportsError.message || '');
      const errorCode = String(reportsError.code || '');
      
      // Check if it's a table doesn't exist error
      const isTableMissing = errorCode === 'PGRST116' || 
          errorCode === '42P01' || 
          errorMessage.includes('relation') || 
          errorMessage.includes('does not exist') ||
          errorMessage.includes('doesn\'t exist');
      
      if (isTableMissing) {
        console.warn('Reports table does not exist yet. Returning empty array.');
        console.warn('To fix: Run the SQL script "supabase-create-reports-table.sql" in Supabase SQL Editor');
        return { data: [], error: null };
      }
      
      console.error('Error fetching reports for admin:', reportsError);
      return { data: [], error: reportsError };
    }

    if (!reports || reports.length === 0) {
      return { data: [], error: null };
    }

    // Get unique user IDs
    const userIds = [...new Set(reports.map((r: any) => r.user_id).filter(Boolean))];
    
    if (userIds.length === 0) {
      return { data: Array.isArray(reports) ? reports : [], error: null };
    }

    // Fetch profiles for these users
    const { data: profiles, error: profilesError } = await supabaseServer
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);

    // Create a map of user_id to profile
    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.user_id, {
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        user_id: p.user_id
      }])
    );

    // Map reports with profiles
    const reportsWithProfiles = reports.map((report: any) => ({
      ...report,
      profile: profileMap.get(report.user_id) || null
    }));

    return { data: Array.isArray(reportsWithProfiles) ? reportsWithProfiles : [], error: null };
  } catch (error: any) {
    console.error('Error in getAllReportsForAdmin:', error);
    return { data: [], error };
  }
}

