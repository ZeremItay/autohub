import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// Helper function to check admin authorization
async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return false;
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `)
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !profile) {
      return false;
    }

    const role = profile.roles || profile.role;
    const roleName = typeof role === 'object' ? role?.name : role;

    return roleName === 'admin';
  } catch (error) {
    console.error('Admin auth check error:', error);
    return false;
  }
}

const BUCKETS = ['avatars', 'course-thumbnails', 'forum-posts', 'resources', 'recordings', 'thumbnails'];

// GET - Get all images from all buckets
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'נדרשת הרשאת מנהל' },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const bucketFilter = request.nextUrl.searchParams.get('bucket');

    const allImages: any[] = [];
    const bucketsToLoad = bucketFilter && bucketFilter !== 'all' 
      ? [bucketFilter]
      : BUCKETS;

    // Helper function to list files in a folder
    const listFilesInFolder = async (bucketName: string, folderPath: string = ''): Promise<any[]> => {
      const images: any[] = [];
      
      try {
        const { data, error: listError } = await supabase.storage
          .from(bucketName)
          .list(folderPath, {
            limit: 1000,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (listError) {
          // If folder doesn't exist, that's okay - just return empty array
          if (listError.message?.includes('not found') || listError.message?.includes('No such')) {
            return images;
          }
          console.warn(`Error loading from ${bucketName}/${folderPath}:`, listError);
          return images;
        }

        if (!data) return images;

        for (const item of data) {
          // Check if it's an image file
          const ext = item.name.split('.').pop()?.toLowerCase();
          if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
            const filePath = folderPath ? `${folderPath}/${item.name}` : item.name;
            const { data: { publicUrl } } = supabase.storage
              .from(bucketName)
              .getPublicUrl(filePath);

            images.push({
              name: item.name,
              bucket: bucketName,
              publicUrl,
              created_at: item.created_at,
              path: filePath,
            });
          }
        }
      } catch (err) {
        console.warn(`Error processing ${bucketName}/${folderPath}:`, err);
      }
      
      return images;
    };

    for (const bucketName of bucketsToLoad) {
      try {
        // Try root folder first
        const rootImages = await listFilesInFolder(bucketName, '');
        allImages.push(...rootImages);
        
        // Try common subfolders based on bucket name
        const commonFolders: Record<string, string[]> = {
          'avatars': ['avatars'],
          'course-thumbnails': ['course-thumbnails'],
          'forum-posts': ['forum-posts'],
          'resources': ['resources'],
          'recordings': ['recordings'],
          'thumbnails': ['thumbnails'],
        };
        
        const foldersToCheck = commonFolders[bucketName] || [];
        for (const folder of foldersToCheck) {
          const folderImages = await listFilesInFolder(bucketName, folder);
          allImages.push(...folderImages);
        }
      } catch (err) {
        console.warn(`Error processing bucket ${bucketName}:`, err);
        continue;
      }
    }

    // Sort by created_at descending
    allImages.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ images: allImages });
  } catch (error: any) {
    console.error('Error in GET /api/admin/images:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'שגיאה בשרת' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an image from storage
export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'נדרשת הרשאת מנהל' },
        { status: 403 }
      );
    }

    const { bucket, path } = await request.json();

    if (!bucket || !path) {
      return NextResponse.json(
        { error: 'Bad request', message: 'חסרים פרמטרים נדרשים' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (deleteError) {
      console.error('Error deleting image:', deleteError);
      return NextResponse.json(
        { error: 'Delete failed', message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'התמונה נמחקה בהצלחה' });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/images:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'שגיאה בשרת' },
      { status: 500 }
    );
  }
}

