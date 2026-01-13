-- Update existing users who have completed all profile tasks
-- Mark them as having seen the completion message to prevent it from showing again
-- This checks for: headline, custom avatar (not dicebear), and social links (instagram/facebook)

UPDATE profiles 
SET has_seen_completion_message = true 
WHERE 
  -- Has headline
  headline IS NOT NULL 
  AND headline != '' 
  AND headline != ' '
  -- Has custom avatar (not dicebear default)
  AND avatar_url IS NOT NULL 
  AND avatar_url != ''
  AND avatar_url NOT LIKE '%dicebear.com%'
  AND avatar_url NOT LIKE '%api.dicebear%'
  AND avatar_url NOT LIKE 'data:image/svg+xml%'
  -- Has at least one social link (instagram or facebook)
  -- Check social_links only if the column exists
  AND (
    (instagram_url IS NOT NULL AND instagram_url != '') 
    OR 
    (facebook_url IS NOT NULL AND facebook_url != '')
  )
  -- Only update if they haven't seen it yet
  AND (has_seen_completion_message IS NULL OR has_seen_completion_message = false);
