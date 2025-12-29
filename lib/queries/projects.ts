import { supabase } from '../supabase'
import { getCached, setCached } from '../cache'

export interface Project {
  id: string
  user_id: string
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
    return { data: cached, error: null };
  }

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, user_id, title, description, status, budget_min, budget_max, budget_currency, technologies, offers_count, views, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50) // Limit to improve performance

  if (error) {
    console.error('Error fetching projects:', error)
    return { data: null, error }
  }

  // Fetch user profiles for each project
  if (projects && projects.length > 0) {
    const userIds = [...new Set(projects.map(p => p.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds)

    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || [])

    const projectsWithUsers = projects.map(project => ({
      ...project,
      user: profileMap.get(project.user_id) || null
    }))

    setCached(cacheKey, projectsWithUsers);
    return { data: projectsWithUsers, error: null }
  }

  return { data: [], error: null }
}

// Get project by ID
export async function getProjectById(id: string) {
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, user_id, title, description, status, budget_min, budget_max, budget_currency, technologies, offers_count, views, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching project:', error)
    return { data: null, error }
  }

  // Fetch user profile
  if (project) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .eq('user_id', project.user_id)
      .single()

    return { 
      data: { ...project, user: profile || null }, 
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

    return { data: offersWithUsers, error: null }
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
  const { data: project } = await supabase
    .from('projects')
    .select('offers_count')
    .eq('id', offer.project_id)
    .single()

  if (project) {
    await supabase
      .from('projects')
      .update({ offers_count: (project.offers_count || 0) + 1 })
      .eq('id', offer.project_id)
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
  
  return { data, error: null }
}

