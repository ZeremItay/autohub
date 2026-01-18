import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get current profile status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, has_seen_completion_message, headline, avatar_url, social_links, instagram_url, facebook_url, points')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if already completed
    if (profile.has_seen_completion_message) {
      return NextResponse.json({ message: 'Already completed' });
    }

    // Verify completion criteria (server-side check)
    const hasHeadline = profile.headline && profile.headline.trim().length > 0;
    
    const hasCustomAvatar = profile.avatar_url && 
      profile.avatar_url.trim().length > 0 &&
      !profile.avatar_url.startsWith('data:image/svg+xml') &&
      !profile.avatar_url.includes('dicebear.com') &&
      !profile.avatar_url.includes('api.dicebear');

    const hasSocialLinks = (profile.social_links && 
      Array.isArray(profile.social_links) && 
      profile.social_links.length > 0) ||
      (profile.instagram_url && profile.instagram_url.trim().length > 0) ||
      (profile.facebook_url && profile.facebook_url.trim().length > 0);

    const isComplete = hasHeadline && hasCustomAvatar && hasSocialLinks;

    if (!isComplete) {
      return NextResponse.json({ error: 'Profile not yet complete' }, { status: 400 });
    }

    // Award points and mark as seen
    const POINTS_REWARD = 10;
    const newPoints = (profile.points || 0) + POINTS_REWARD;

    // 1. Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        has_seen_completion_message: true,
        points: newPoints
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating profile completion:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    // 2. Add to points history
    // Try with action_name first (newer schema), fallback to action
    const historyData = {
      user_id: profile.id, // Profile ID, not User ID
      points: POINTS_REWARD,
      action_name: 'השלמת פרופיל',
      created_at: new Date().toISOString()
    };

    const { error: historyError } = await supabase
      .from('points_history')
      .insert([historyData]);

    if (historyError) {
      // Fallback for older schema if needed
      if (historyError.code === '42703' || historyError.message?.includes('action_name')) {
         await supabase
          .from('points_history')
          .insert([{
            user_id: profile.id,
            points: POINTS_REWARD,
            action: 'השלמת פרופיל',
            created_at: new Date().toISOString()
          }]);
      } else {
        console.error('Error adding points history:', historyError);
      }
    }

    // 3. Create a notification
    await supabase.from('notifications').insert([{
      user_id: userId,
      type: 'points',
      title: 'קיבלת נקודות! 🎉',
      message: `קיבלת ${POINTS_REWARD} נקודות על השלמת הפרופיל`,
      is_read: false
    }]);

    return NextResponse.json({ success: true, pointsAdded: POINTS_REWARD });

  } catch (error: any) {
    console.error('Error in complete-profile route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
