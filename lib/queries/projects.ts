import { supabase } from '../supabase'
import { getCached, setCached, invalidateCache } from '../cache'

export interface Project {
  id: string
  user_id: string | null
  guest_name?: string | null
  guest_email?: string | null
  title: string
  description: string
  status: 'open' | 'in_progress' | 'completed' | 'closed'
  budget_min?: number
  budget_max?: number
  budget_currency?: string
  technologies?: string[]
  offers_count?: number
  views?: number
  created_at?: string
  updated_at?: string
  user?: {
    user_id: string
    display_name?: string
    avatar_url?: string
  }
}

export interface ProjectOffer {
  id: string
  project_id: string
  user_id: string
  offer_amount?: number
  offer_currency?: string
  message?: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at?: string
  updated_at?: string
  user?: {
    user_id: string
    display_name?: string
    avatar_url?: string
  }
}

// Get all projects
export async function getAllProjects() {
  const cacheKey = 'projects:all';
  const cached = getCached(cacheKey);
  if (cached) {
    return { data: Array.isArray(cached) ? cached : [], error: null };
  }

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, user_id, guest_name, guest_email, title, description, status, budget_min, budget_max, budget_currency, technologies, offers_count, views, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50) // Limit to improve performance

  if (error) {
    console.error('Error fetching projects:', error)
    return { data: null, error }
  }

  // Fetch user profiles for each project (only for projects with user_id)
  if (projects && projects.length > 0) {
    const userIds = [...new Set(projects.map((p: any) => p.user_id).filter((id: any): id is string => id !== null))]
    let profileMap = new Map();
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds)
      
      profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || [])
    }

    const projectsWithUsers = projects.map((project: any) => ({
      ...project,
      user: project.user_id ? (profileMap.get(project.user_id) || null) : null
    }))

    setCached(cacheKey, projectsWithUsers);
    return { data: Array.isArray(projectsWithUsers) ? projectsWithUsers : [], error: null }
  }

  return { data: [], error: null }
}

// Get project by ID
export async function getProjectById(id: string) {
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, user_id, guest_name, guest_email, title, description, status, budget_min, budget_max, budget_currency, technologies, offers_count, views, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching project:', error)
    return { data: null, error }
  }

  // Fetch user profile (only if user_id exists)
  if (project && project.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .eq('user_id', project.user_id)
      .single()

    return { 
      data: { ...project, user: profile || null }, 
      error: null 
    }
  } else if (project) {
    // Guest project - no user profile needed
    return {
      data: {
        ...project,
        user: null
      },
      error: null
    }
  }

  return { data: null, error: null }
}

// Create project
export async function createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('projects')
    .insert([project])
    .select()
    .single()

  if (error) {
    console.error('Error creating project:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

// Update project
export async function updateProject(id: string, updates: Partial<Project>) {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating project:', error)
    return { data: null, error }
  }

  // Invalidate cache
  if (data) {
    invalidateCache('projects:all');
    invalidateCache(`projects:user:${data.user_id}`);
  }

  return { data, error: null }
}

// Get project offers
export async function getProjectOffers(projectId: string) {
  const { data: offers, error } = await supabase
    .from('project_offers')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching offers:', error)
    return { data: null, error }
  }

  // Fetch user profiles
  if (offers && offers.length > 0) {
    const userIds = [...new Set(offers.map((o: any) => o.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds)

    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || [])

    const offersWithUsers = offers.map((offer: any) => ({
      ...offer,
      user: profileMap.get(offer.user_id) || null
    }))

    return { data: Array.isArray(offersWithUsers) ? offersWithUsers : [], error: null }
  }

  return { data: [], error: null }
}

// Create project offer
export async function createProjectOffer(offer: Omit<ProjectOffer, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('project_offers')
    .insert([offer])
    .select()
    .single()

  if (error) {
    console.error('Error creating offer:', error)
    return { data: null, error }
  }

  // Increment offers_count in project
  const { data: projectData } = await supabase
    .from('projects')
    .select('offers_count, user_id')
    .eq('id', offer.project_id)
    .single()

  if (projectData) {
    await supabase
      .from('projects')
      .update({ offers_count: (projectData.offers_count || 0) + 1 })
      .eq('id', offer.project_id)
    
    // Invalidate cache to ensure fresh data
    invalidateCache('projects:all');
    if (projectData.user_id) {
      invalidateCache(`projects:user:${projectData.user_id}`);
      
      // Send email notification to project owner
      // Get offerer and project details
      const [offererResult, projectResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, first_name')
          .eq('user_id', offer.user_id)
          .single(),
        supabase
          .from('projects')
          .select('title')
          .eq('id', offer.project_id)
          .single()
      ]);
      
      const offererProfile = offererResult.data;
      const projectDetails = projectResult.data;
      
      if (projectDetails && offererProfile) {
        const offererName = offererProfile.display_name || offererProfile.first_name || 'משתמש';
        
        // Send email via API route (server-side)
        const siteUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        
        fetch(`${siteUrl}/api/projects/send-offer-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectOwnerId: projectData.user_id,
            projectTitle: projectDetails.title,
            offererName,
            offerAmount: offer.offer_amount || 0,
            offerCurrency: offer.offer_currency || 'USD',
            offerMessage: offer.message || '',
            projectId: offer.project_id,
            offerId: data?.id
          }),
        }).then(async (response) => {
          const emailResponse = await response.json();
          if (response.ok) {
          } else {
            console.warn('❌ Error sending project offer email:', emailResponse);
          }
        }).catch((error) => {
          console.warn('Error sending project offer email:', error);
        });
      }
    }
  }

  return { data, error: null }
}

// Get user's project offers
export async function getUserProjectOffers(userId: string) {
  const { data, error } = await supabase
    .from('project_offers')
    .select(`
      *,
      project:projects (
        id,
        title,
        description,
        status,
        budget_min,
        budget_max,
        budget_currency,
        user_id
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('Error fetching user project offers:', error)
    return { data: null, error }
  }
  
  return { data: Array.isArray(data) ? data : [], error: null }
}

// Update project offer (e.g., change status)
export async function updateProjectOffer(id: string, updates: Partial<ProjectOffer>) {
  const { data, error } = await supabase
    .from('project_offers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating project offer:', error)
    return { data: null, error }
  }

  // If status changed to accepted, update project status to in_progress
  if (updates.status === 'accepted' && data) {
    await supabase
      .from('projects')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', data.project_id)
  }

  return { data, error: null }
}

// Delete project offer
export async function deleteProjectOffer(id: string) {
  // Get offer to update project offers_count
  const { data: offer } = await supabase
    .from('project_offers')
    .select('project_id')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('project_offers')
    .delete()
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error deleting project offer:', error)
    return { data: null, error }
  }

  // Decrement offers_count in project
  if (offer) {
    const { data: project } = await supabase
      .from('projects')
      .select('offers_count')
      .eq('id', offer.project_id)
      .single()

    if (project) {
      await supabase
        .from('projects')
        .update({ offers_count: Math.max(0, (project.offers_count || 0) - 1) })
        .eq('id', offer.project_id)
    }
  }

  return { data, error: null }
}

// Get all project offers (for admin panel)
export async function getAllProjectOffers() {
  const cacheKey = 'project_offers:all';
  const cached = getCached(cacheKey);
  if (cached) {
    return { data: Array.isArray(cached) ? cached : [], error: null };
  }

  const { data: offers, error } = await supabase
    .from('project_offers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Error fetching all project offers:', error)
    return { data: null, error }
  }

  // Fetch user profiles and project details
  if (offers && offers.length > 0) {
    const userIds = [...new Set(offers.map((o: any) => o.user_id))]
    const projectIds = [...new Set(offers.map((o: any) => o.project_id))]
    
    const [profilesRes, projectsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds),
      supabase
        .from('projects')
        .select('id, title, user_id')
        .in('id', projectIds)
    ])

    const profileMap = new Map(profilesRes.data?.map((p: any) => [p.user_id, p]) || [])
    const projectMap = new Map(projectsRes.data?.map((p: any) => [p.id, p]) || [])

    const offersWithDetails = offers.map((offer: any) => ({
      ...offer,
      user: profileMap.get(offer.user_id) || null,
      project: projectMap.get(offer.project_id) || null
    }))

    setCached(cacheKey, offersWithDetails, 60000); // Cache for 1 minute
    return { data: Array.isArray(offersWithDetails) ? offersWithDetails : [], error: null }
  }

  return { data: [], error: null }
}

// Get all projects by a specific user
export async function getUserProjects(userId: string) {
  const cacheKey = `projects:user:${userId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { data: Array.isArray(cached) ? cached : [], error: null };
  }

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, user_id, guest_name, guest_email, title, description, status, budget_min, budget_max, budget_currency, technologies, offers_count, views, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user projects:', error)
    return { data: null, error }
  }

  // Fetch user profile
  if (projects && projects.length > 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .eq('user_id', userId)
      .single()

    const projectsWithUser = projects.map((project: any) => ({
      ...project,
      user: profile || null
    }))

    setCached(cacheKey, projectsWithUser, 60000); // Cache for 1 minute
    return { data: Array.isArray(projectsWithUser) ? projectsWithUser : [], error: null }
  }

  return { data: [], error: null }
}

// Get all project offers by a specific user
export async function getProjectOffersByUser(userId: string) {
  const cacheKey = `project_offers:user:${userId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { data: Array.isArray(cached) ? cached : [], error: null };
  }

  const { data: offers, error } = await supabase
    .from('project_offers')
    .select(`
      *,
      project:projects (
        id,
        title,
        description,
        status,
        budget_min,
        budget_max,
        budget_currency,
        user_id,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching project offers by user:', error)
    return { data: null, error }
  }

  // Fetch user profile
  if (offers && offers.length > 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .eq('user_id', userId)
      .single()

    const offersWithUser = offers.map((offer: any) => ({
      ...offer,
      user: profile || null
    }))

    setCached(cacheKey, offersWithUser, 60000); // Cache for 1 minute
    return { data: Array.isArray(offersWithUser) ? offersWithUser : [], error: null }
  }

  return { data: [], error: null }
}

// Get project offers by user (alias for getUserProjectOffers with better naming)
// This function is kept for backward compatibility but delegates to getUserProjectOffers

// Delete project
export async function deleteProject(id: string) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) {
      // Enhanced error logging
      const errorDetails = {
        message: error.message || 'Unknown error',
        code: error.code || 'UNKNOWN',
        details: error.details || null,
        hint: error.hint || null,
        fullError: error
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting project:', errorDetails);
      }
      
      return { data: null, error: errorDetails as any }
    }

    // Invalidate cache
    if (data) {
      invalidateCache('projects:all');
      if (data.user_id) {
        invalidateCache(`projects:user:${data.user_id}`);
      }
    }

    return { data, error: null }
  } catch (e: any) {
    const errorDetails = {
      message: e?.message || 'Unexpected error deleting project',
      code: 'EXCEPTION',
      details: e?.stack || null,
      fullError: e
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception deleting project:', errorDetails);
    }
    
    return { data: null, error: errorDetails as any }
  }
}

// Send email notification to project owner when someone submits an offer
export async function sendProjectOfferEmail(
  projectOwnerId: string,
  projectTitle: string,
  offererName: string,
  offerAmount: number,
  offerCurrency: string,
  offerMessage: string,
  projectId: string
) {
  try {
    // Get project owner's email from profile or auth
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .eq('user_id', projectOwnerId)
      .single();

    // Get email from auth.users table (requires service role)
    let ownerEmail: string | null = null;
    
    // Try to get email from auth
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(projectOwnerId);
      ownerEmail = user?.email || null;
    }

    if (!ownerEmail) {
      console.warn('No email found for project owner:', projectOwnerId);
      return { success: false, error: 'No email found for project owner' };
    }

    const ownerName = ownerProfile?.display_name || 'משתמש';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>הצעה חדשה לפרויקט שלך</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #F52F8E 0%, #E01E7A 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 הצעה חדשה לפרויקט שלך!</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
              שלום ${ownerName},
            </p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 25px;">
              קיבלת הצעה חדשה לפרויקט שלך <strong>"${projectTitle}"</strong>!
            </p>
            
            <div style="background-color: #f8f9fa; border-right: 4px solid #F52F8E; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #333;">
                <strong>מגיש ההצעה:</strong> ${offererName}
              </p>
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #333;">
                <strong>הצעת מחיר:</strong> ₪ ${Number(offerAmount || 0).toLocaleString('he-IL')}
              </p>
              ${offerMessage ? `
                <p style="margin: 10px 0 0 0; font-size: 16px; color: #333;">
                  <strong>הודעה:</strong>
                </p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666; line-height: 1.6; white-space: pre-wrap;">
                  ${offerMessage.replace(/\n/g, '<br>')}
                </p>
              ` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${siteUrl}/profile?tab=projects&projectId=${projectId}&offerId=${projectId}" 
                 style="display: inline-block; background-color: #F52F8E; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                צפייה בהצעה
              </a>
            </div>
            
            <p style="font-size: 14px; color: #999; margin-top: 30px; text-align: center;">
              זהו מייל אוטומטי, אנא אל תשיב למייל זה
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; font-size: 12px; color: #999;">
              © ${new Date().getFullYear()} AutoHub. כל הזכויות שמורות.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via API route
    const emailResponse = await fetch(`${siteUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: ownerEmail,
        subject: `הצעה חדשה לפרויקט "${projectTitle}"`,
        html: emailHtml,
      }),
    });

    const responseData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('❌ Email sending failed:', {
        status: emailResponse.status,
        error: responseData
      });
      return { success: false, error: responseData };
    }

    return { success: true, emailId: responseData.data?.id };
  } catch (error: any) {
    console.error('Error in sendProjectOfferEmail:', error);
    return { success: false, error: error.message };
  }
}

