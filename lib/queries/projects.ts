import { supabase } from '@/lib/supabase';
import { createServerClient } from '@/lib/supabase-server';
import { logError } from '@/lib/utils/errorHandler';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'closed';
  budget_min?: number;
  budget_max?: number;
  budget_currency?: string;
  technologies?: string[];
  offers_count?: number;
  views?: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    nickname?: string;
    avatar_url?: string;
  };
}

export interface ProjectOffer {
  id: string;
  project_id: string;
  user_id: string;
  offer_amount?: number;
  offer_currency?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    nickname?: string;
    avatar_url?: string;
  };
  projects?: Project;
}

export async function getAllProjects(): Promise<{ data: Project[] | null; error: any }> {
  try {
    // First, get all projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectsError) {
      // Only log meaningful errors
      if (projectsError.message && projectsError.message !== '{}' && projectsError.message !== '[object Object]') {
        logError(projectsError, 'getAllProjects');
      }
      return { data: null, error: projectsError };
    }

    if (!projects || projects.length === 0) {
      return { data: [], error: null };
    }

    // Get unique user IDs
    const userIds = [...new Set(projects.map((p: any) => p.user_id))];

    // Fetch profiles for these users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, id, first_name, last_name, nickname, avatar_url')
      .in('user_id', userIds);

    // Create a map of user_id to profile
    const profilesMap = new Map();
    if (profiles) {
      profiles.forEach((profile: any) => {
        profilesMap.set(profile.user_id, {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          nickname: profile.nickname,
          avatar_url: profile.avatar_url
        });
      });
    }

    // Combine projects with profiles
    const projectsWithProfiles = projects.map((project: any) => ({
      ...project,
      profiles: profilesMap.get(project.user_id) || null
    }));

    return { data: projectsWithProfiles as Project[], error: null };
  } catch (error: any) {
    // Only log meaningful errors
    const errorMessage = error?.message || String(error);
    if (errorMessage && errorMessage !== '{}' && errorMessage !== '[object Object]' && errorMessage !== '') {
      logError(error, 'getAllProjects');
    }
    return { data: null, error };
  }
}

export async function getProjectById(id: string): Promise<{ data: Project | null; error: any }> {
  try {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (projectError) {
      // Only log meaningful errors
      if (projectError.message && projectError.message !== '{}' && projectError.message !== '[object Object]') {
        logError(projectError, 'getProjectById');
      }
      return { data: null, error: projectError };
    }

    if (!project) {
      return { data: null, error: null };
    }

    // Fetch profile for this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, id, first_name, last_name, nickname, avatar_url')
      .eq('user_id', project.user_id)
      .single();

    const projectWithProfile = {
      ...project,
      profiles: profile ? {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        nickname: profile.nickname,
        avatar_url: profile.avatar_url
      } : null
    };

    return { data: projectWithProfile as Project, error: null };
  } catch (error: any) {
    // Only log meaningful errors
    const errorMessage = error?.message || String(error);
    if (errorMessage && errorMessage !== '{}' && errorMessage !== '[object Object]' && errorMessage !== '') {
      logError(error, 'getProjectById');
    }
    return { data: null, error };
  }
}

export async function getUserProjects(userId: string): Promise<{ data: Project[] | null; error: any }> {
  try {
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (projectsError) {
      // Only log meaningful errors
      if (projectsError.message && projectsError.message !== '{}' && projectsError.message !== '[object Object]') {
        logError(projectsError, 'getUserProjects');
      }
      return { data: null, error: projectsError };
    }

    if (!projects || projects.length === 0) {
      return { data: [], error: null };
    }

    // Fetch profile for this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, id, first_name, last_name, nickname, avatar_url')
      .eq('user_id', userId)
      .single();

    const profileData = profile ? {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      nickname: profile.nickname,
      avatar_url: profile.avatar_url
    } : null;

    // Combine projects with profile
    const projectsWithProfile = projects.map((project: any) => ({
      ...project,
      profiles: profileData
    }));

    return { data: projectsWithProfile as Project[], error: null };
  } catch (error: any) {
    // Only log meaningful errors
    const errorMessage = error?.message || String(error);
    if (errorMessage && errorMessage !== '{}' && errorMessage !== '[object Object]' && errorMessage !== '') {
      logError(error, 'getUserProjects');
    }
    return { data: null, error };
  }
}

export async function createProject(projectData: {
  user_id: string;
  title: string;
  description: string;
  status?: 'open' | 'in_progress' | 'completed' | 'closed';
  budget_min?: number;
  budget_max?: number;
  budget_currency?: string;
  technologies?: string[];
}): Promise<{ data: Project | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        user_id: projectData.user_id,
        title: projectData.title,
        description: projectData.description,
        status: projectData.status || 'open',
        budget_min: projectData.budget_min || null,
        budget_max: projectData.budget_max || null,
        budget_currency: projectData.budget_currency || 'ILS',
        technologies: projectData.technologies || []
      }])
      .select(`
        *,
        profiles (
          id,
          first_name,
          last_name,
          nickname,
          avatar_url
        )
      `)
      .single();

    if (error) {
      logError(error, 'createProject');
      return { data: null, error };
    }

    return { data: data as Project, error: null };
  } catch (error: any) {
    logError(error, 'createProject');
    return { data: null, error };
  }
}

export async function updateProject(
  id: string,
  updateData: Partial<Project>
): Promise<{ data: Project | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        profiles (
          id,
          first_name,
          last_name,
          nickname,
          avatar_url
        )
      `)
      .single();

    if (error) {
      logError(error, 'updateProject');
      return { data: null, error };
    }

    return { data: data as Project, error: null };
  } catch (error: any) {
    logError(error, 'updateProject');
    return { data: null, error };
  }
}

export async function deleteProject(id: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      logError(error, 'deleteProject');
      return { error };
    }

    return { error: null };
  } catch (error: any) {
    logError(error, 'deleteProject');
    return { error };
  }
}

export async function getAllProjectOffers(): Promise<{ data: ProjectOffer[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('project_offers')
      .select(`
        *,
        profiles (
          id,
          first_name,
          last_name,
          nickname,
          avatar_url
        ),
        projects (
          *
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logError(error, 'getAllProjectOffers');
      return { data: null, error };
    }

    return { data: data as ProjectOffer[], error: null };
  } catch (error: any) {
    logError(error, 'getAllProjectOffers');
    return { data: null, error };
  }
}

export async function getProjectOffers(projectId: string): Promise<{ data: ProjectOffer[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('project_offers')
      .select(`
        *,
        profiles (
          id,
          first_name,
          last_name,
          nickname,
          avatar_url
        ),
        projects (
          *
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      logError(error, 'getProjectOffers');
      return { data: null, error };
    }

    return { data: data as ProjectOffer[], error: null };
  } catch (error: any) {
    logError(error, 'getProjectOffers');
    return { data: null, error };
  }
}

export async function getProjectOffersByUser(userId: string): Promise<{ data: ProjectOffer[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('project_offers')
      .select(`
        *,
        profiles (
          id,
          first_name,
          last_name,
          nickname,
          avatar_url
        ),
        projects (
          *
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logError(error, 'getProjectOffersByUser');
      return { data: null, error };
    }

    return { data: data as ProjectOffer[], error: null };
  } catch (error: any) {
    logError(error, 'getProjectOffersByUser');
    return { data: null, error };
  }
}

export async function createProjectOffer(offerData: {
  project_id: string;
  user_id: string;
  offer_amount?: number;
  offer_currency?: string;
  message?: string;
  status?: 'pending' | 'accepted' | 'rejected';
}): Promise<{ data: ProjectOffer | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('project_offers')
      .insert([{
        project_id: offerData.project_id,
        user_id: offerData.user_id,
        offer_amount: offerData.offer_amount || null,
        offer_currency: offerData.offer_currency || 'ILS',
        message: offerData.message || null,
        status: offerData.status || 'pending'
      }])
      .select(`
        *,
        profiles (
          id,
          first_name,
          last_name,
          nickname,
          avatar_url
        ),
        projects (
          *
        )
      `)
      .single();

    if (error) {
      logError(error, 'createProjectOffer');
      return { data: null, error };
    }

    // Update offers_count in project
    const { error: updateError } = await supabase.rpc('increment', {
      table_name: 'projects',
      row_id: offerData.project_id,
      column_name: 'offers_count'
    });

    if (updateError) {
      // If RPC doesn't exist, manually update
      const { data: projectData } = await getProjectById(offerData.project_id);
      if (projectData) {
        await updateProject(offerData.project_id, {
          offers_count: (projectData.offers_count || 0) + 1
        });
      }
    }

    return { data: data as ProjectOffer, error: null };
  } catch (error: any) {
    logError(error, 'createProjectOffer');
    return { data: null, error };
  }
}

export async function updateProjectOffer(
  id: string,
  updateData: Partial<ProjectOffer>
): Promise<{ data: ProjectOffer | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('project_offers')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        profiles (
          id,
          first_name,
          last_name,
          nickname,
          avatar_url
        ),
        projects (
          *
        )
      `)
      .single();

    if (error) {
      logError(error, 'updateProjectOffer');
      return { data: null, error };
    }

    return { data: data as ProjectOffer, error: null };
  } catch (error: any) {
    logError(error, 'updateProjectOffer');
    return { data: null, error };
  }
}

export async function deleteProjectOffer(id: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('project_offers')
      .delete()
      .eq('id', id);

    if (error) {
      logError(error, 'deleteProjectOffer');
      return { error };
    }

    return { error: null };
  } catch (error: any) {
    logError(error, 'deleteProjectOffer');
    return { error };
  }
}
