import { NextRequest, NextResponse } from 'next/server';
import { getReportById, incrementReportViews } from '@/lib/queries/reports';

// GET - Get a single report by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await getReportById(id);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch report' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error in GET /api/reports/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update report views (or other fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // If incrementing views
    if (body.action === 'increment_views') {
      const { error } = await incrementReportViews(id);
      
      if (error) {
        return NextResponse.json(
          { error: error.message || 'Failed to increment views' },
          { status: 500 }
        );
      }

      // Fetch updated report
      const { data, error: fetchError } = await getReportById(id);
      
      if (fetchError) {
        return NextResponse.json(
          { error: fetchError.message || 'Failed to fetch updated report' },
          { status: 500 }
        );
      }

      return NextResponse.json({ data });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in PATCH /api/reports/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

