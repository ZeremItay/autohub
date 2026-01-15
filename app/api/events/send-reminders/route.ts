import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { getEventById } from '@/lib/queries/events';
import { getProfileWithRole } from '@/lib/queries/profiles';

// Send reminder emails to users registered for events happening tomorrow
// This should be called by a cron job daily
export async function GET(request: NextRequest) {
  try {
    // Verify this is called by Vercel Cron (optional security check)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD


    // Get all events happening tomorrow
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('event_date', tomorrowDateStr)
      .in('status', ['upcoming', 'active', null]); // Only active/upcoming events

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch events', details: eventsError },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No events found for tomorrow',
        remindersSent: 0
      });
    }


    const results = [];
    let totalRemindersSent = 0;

    // Process each event
    for (const event of events) {

      // Get all registrations for this event
      const { data: registrations, error: registrationsError } = await supabaseAdmin
        .from('event_registrations')
        .select(`
          id,
          user_id,
          profiles (
            user_id,
            display_name,
            first_name
          )
        `)
        .eq('event_id', event.id);

      if (registrationsError) {
        console.error(`Error fetching registrations for event ${event.id}:`, registrationsError);
        results.push({
          eventId: event.id,
          eventTitle: event.title,
          error: registrationsError.message,
          remindersSent: 0
        });
        continue;
      }

      if (!registrations || registrations.length === 0) {
        results.push({
          eventId: event.id,
          eventTitle: event.title,
          remindersSent: 0,
          message: 'No registrations'
        });
        continue;
      }


      let eventRemindersSent = 0;

      // Send reminder to each registered user
      for (const registration of registrations) {
        const userId = registration.user_id;
        
        try {
          // Get user email
          const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
          
          if (userError || !user || !user.email) {
            console.warn(`Skipping user ${userId}: ${userError?.message || 'No email found'}`);
            continue;
          }

          // Send reminder email
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
          const emailResponse = await fetch(`${siteUrl}/api/events/send-reminder-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              eventId: event.id
            }),
          });

          if (!emailResponse.ok) {
            const errorData = await emailResponse.json().catch(() => ({}));
            console.warn(`Failed to send reminder to ${user.email}:`, errorData);
          } else {
            eventRemindersSent++;
            totalRemindersSent++;
          }
        } catch (error: any) {
          console.error(`Error sending reminder to user ${userId}:`, error);
        }
      }

      results.push({
        eventId: event.id,
        eventTitle: event.title,
        remindersSent: eventRemindersSent,
        totalRegistrations: registrations.length
      });
    }


    return NextResponse.json({
      success: true,
      date: tomorrowDateStr,
      eventsProcessed: events.length,
      remindersSent: totalRemindersSent,
      results
    });
  } catch (error: any) {
    console.error('Error in send-reminders API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
