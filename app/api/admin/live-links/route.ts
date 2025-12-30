import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// This assumes you have a 'live_links' or 'events' table
// Adjust table name based on your schema

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // Try different possible table names
    let data, error
    const tableNames = ['live_links', 'events', 'live_sessions']
    
    for (const tableName of tableNames) {
      const result = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (!result.error) {
        data = result.data
        break
      }
    }
    
    if (error) {
      return NextResponse.json({ error: String(error) }, { status: 400 })
    }
    
    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    
    // Try to insert into live_links table (adjust as needed)
    const { data, error } = await supabase
      .from('live_links')
      .insert([body])
      .select()
      .single()
    
    if (error) {
      // If table doesn't exist, return helpful message
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Table "live_links" does not exist. Please create it first.',
          hint: 'You can create it in Supabase Dashboard or use SQL: CREATE TABLE live_links (id UUID PRIMARY KEY, title TEXT, url TEXT, scheduled_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())'
        }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createServerClient()
    const { id, ...updates } = await request.json()
    
    const { data, error } = await supabase
      .from('live_links')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('live_links')
      .delete()
      .eq('id', id)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

