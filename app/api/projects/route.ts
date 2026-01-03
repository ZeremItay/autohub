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
    const { user_id, guest_name, guest_email, title, description, budget_min, budget_max, budget_currency, technologies, tagIds } = body;

    // Validation: either user_id OR (guest_name AND guest_email) must be provided
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: title and description are required' },
        { status: 400 }
      );
    }

    if (!user_id && (!guest_name || !guest_email)) {
      return NextResponse.json(
        { error: 'Either user_id or both guest_name and guest_email are required' },
        { status: 400 }
      );
    }

    // Validate email format if guest
    if (!user_id && guest_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guest_email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
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
        user_id: user_id || null,
        guest_name: guest_name || null,
        guest_email: guest_email || null,
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

