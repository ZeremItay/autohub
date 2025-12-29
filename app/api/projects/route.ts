import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, title, description, budget_min, budget_max, budget_currency, technologies } = body;

    if (!user_id || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure technologies is an array
    let technologiesArray = [];
    if (Array.isArray(technologies)) {
      technologiesArray = technologies.filter(t => t && t.trim().length > 0);
    } else if (typeof technologies === 'string') {
      // If it's a string, split it
      technologiesArray = technologies
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
    }

    console.log('Technologies received:', technologies);
    console.log('Technologies array:', technologiesArray);

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        user_id,
        title,
        description,
        budget_min: budget_min || null,
        budget_max: budget_max || null,
        budget_currency: budget_currency || 'ILS',
        technologies: technologiesArray
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

