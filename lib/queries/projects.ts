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
    const userIds = [...new Set(projects.map(p => p.user_id).filter((id): id is string => id !== null))]
    let profileMap = new Map();
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds)
      
      profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || [])
    }

    const projectsWithUsers = projects.map(project => ({
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
    const userIds = [...new Set(offers.map(o => o.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds)

    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || [])

    const offersWithUsers = offers.map(offer => ({
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
    const userIds = [...new Set(offers.map(o => o.user_id))]
    const projectIds = [...new Set(offers.map(o => o.project_id))]
    
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

    const offersWithDetails = offers.map(offer => ({
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

    const projectsWithUser = projects.map(project => ({
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

    const offersWithUser = offers.map(offer => ({
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
  const { data, error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error deleting project:', error)
    return { data: null, error }
  }

  // Invalidate cache
  if (data) {
    invalidateCache('projects:all');
    invalidateCache(`projects:user:${data.user_id}`);
  }

  return { data, error: null }
}

