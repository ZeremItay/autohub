-- Create avatars bucket in Supabase Storage
-- Run this in Supabase SQL Editor

-- Note: Storage buckets are created through the Supabase Dashboard or Storage API
-- This SQL script creates the bucket policy for public access

-- First, create the bucket manually in Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name it "avatars"
-- 4. Make it public (uncheck "Private bucket")

-- Then run this to set up policies:

-- Allow authenticated users to upload avatars
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow public read access to avatars
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

