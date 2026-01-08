/**
 * Posts repository
 * Handles all database operations for posts
 */
import { BaseRepository } from './BaseRepository';
import type { PostWithProfile } from '@/lib/queries/posts';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/utils/errorHandler';

export class PostsRepository extends BaseRepository<any> {
  constructor() {
    super('posts');
  }

  /**
   * Get all posts with profiles and roles
   */
  async findAllWithProfiles(): Promise<{ data: PostWithProfile[] | null; error: any }> {
    try {
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, user_id, content, media_url, media_type, is_announcement, likes_count, comments_count, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (postsError) {
        logError(postsError, 'PostsRepository.findAllWithProfiles');
        return { data: null, error: postsError };
      }

      if (!posts || posts.length === 0) {
        return { data: [], error: null };
      }

      // Get all user IDs
      const userIds = [...new Set(posts.map((p: any) => p.user_id).filter(Boolean))];

      if (userIds.length === 0) {
        return { data: posts.map((post: any) => ({ ...post, profile: null })), error: null };
      }

      // Get profiles with roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          display_name,
          avatar_url,
          first_name,
          last_name,
          nickname,
          role_id,
          roles:role_id (
            id,
            name,
            display_name
          )
        `)
        .in('user_id', userIds);

      if (profilesError) {
        logError(profilesError, 'PostsRepository.findAllWithProfiles - profiles');
        // Continue without profiles
      }

      // Map profiles to posts
      const profilesMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      const postsWithProfiles = posts.map((post: any) => ({
        ...post,
        profile: profilesMap.get(post.user_id) || null,
      }));

      return { data: postsWithProfiles as PostWithProfile[], error: null };
    } catch (error: any) {
      logError(error, 'PostsRepository.findAllWithProfiles');
      return { data: null, error };
    }
  }
}




