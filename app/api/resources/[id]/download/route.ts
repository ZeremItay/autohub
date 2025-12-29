import { NextRequest, NextResponse } from 'next/server';
import { incrementDownloadCount } from '@/lib/queries/resources';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Increment download count
    const { error } = await incrementDownloadCount(id);
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to increment download count' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

