import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { getEventById, isUserRegisteredForEvent } from '@/lib/queries/events';
import { awardPoints } from '@/lib/queries/gamification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing required field: eventId' },
        { status: 400 }
      );
    }

    // Check authentication
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to register for events' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check if event exists
    const { data: event, error: eventError } = await getEventById(eventId);
    
    if (eventError || !event) {
      console.error('Error fetching event:', eventError);
      return NextResponse.json(
        { error: 'Event not found', details: eventError },
        { status: 404 }
      );
    }

    // Check if user is already registered
    // If check fails, we'll continue anyway and let the registration handle duplicates
    const { isRegistered, error: checkError } = await isUserRegisteredForEvent(userId, eventId);
    
    if (checkError) {
      console.warn('Error checking registration (non-critical, continuing anyway):', checkError);
      // Don't fail - we'll try to register anyway and handle duplicates in registerForEvent
    } else if (isRegistered) {
      return NextResponse.json(
        { error: 'Already registered for this event', alreadyRegistered: true },
        { status: 400 }
      );
    }

    // Register user for event using server client directly
    const { data: registration, error: registrationError } = await supabase
      .from('event_registrations')
      .insert([{
        event_id: eventId,
        user_id: userId
      }])
      .select()
      .single();

    if (registrationError) {
      // Check if it's a duplicate key error (user already registered)
      if (registrationError.code === '23505' || registrationError.message?.includes('duplicate') || registrationError.message?.includes('unique')) {
        return NextResponse.json(
          { error: 'Already registered for this event', alreadyRegistered: true },
          { status: 400 }
        );
      }

      // Log detailed error information
      console.error('Error registering for event:', {
        code: registrationError.code,
        message: registrationError.message,
        details: registrationError.details,
        hint: registrationError.hint,
        fullError: registrationError
      });

      // Check if it's a "table not found" error
      if (registrationError.message?.includes('event_registrations') || 
          registrationError.message?.includes('Could not find the table') ||
          registrationError.code === '42P01') {
        console.error('❌ CRITICAL: event_registrations table does not exist in database!');
        console.error('Please run the SQL script: supabase-create-event-registrations-table.sql');
        return NextResponse.json(
          { 
            error: 'Database table not found. Please contact administrator.',
            details: {
              code: registrationError.code,
              message: 'The event_registrations table does not exist. Please run the SQL migration script.',
              hint: 'Run supabase-create-event-registrations-table.sql in Supabase SQL Editor'
            }
          },
          { status: 500 }
        );
      }

      // Return a user-friendly error message
      const errorMessage = registrationError.message || 'Failed to register for event';
      return NextResponse.json(
        { 
          error: errorMessage,
          details: {
            code: registrationError.code,
            hint: registrationError.hint
          }
        },
        { status: 500 }
      );
    }

    // Award 1 point for registration
    try {
      const pointsResult = await awardPoints(userId, 'הרשמה לאירוע', {});
      
      if (!pointsResult.success) {
        console.warn('Failed to award points for event registration:', pointsResult.error);
        // Don't fail the registration if points award fails
      } else {
        console.log('✅ Points awarded for event registration:', pointsResult.points);
      }
    } catch (pointsError) {
      console.warn('Error awarding points for event registration:', pointsError);
      // Don't fail the registration if points award fails
    }

    // Send confirmation email (async - don't wait for it)
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const emailResponse = await fetch(`${siteUrl}/api/events/send-registration-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          eventId
        }),
      });

      if (!emailResponse.ok) {
        // Check if response is JSON or HTML
        const contentType = emailResponse.headers.get('content-type');
        let emailError: any = {};
        
        if (contentType?.includes('application/json')) {
          try {
            emailError = await emailResponse.json();
          } catch (jsonErr) {
            console.warn('Failed to parse JSON error response:', jsonErr);
            emailError = { message: `Server returned ${emailResponse.status} ${emailResponse.statusText}` };
          }
        } else {
          // Response is HTML (probably an error page)
          const text = await emailResponse.text().catch(() => '');
          console.warn('API returned HTML instead of JSON:', {
            status: emailResponse.status,
            statusText: emailResponse.statusText,
            preview: text.substring(0, 200)
          });
          emailError = { message: `Server returned ${emailResponse.status} ${emailResponse.statusText}` };
        }
        
        console.warn('Failed to send registration email:', {
          status: emailResponse.status,
          statusText: emailResponse.statusText,
          error: emailError
        });
        // Don't fail the registration if email fails
      } else {
        try {
          const emailData = await emailResponse.json();
          console.log('✅ Registration confirmation email sent:', {
            emailId: emailData.emailId,
            userId,
            eventId
          });
        } catch (jsonErr) {
          console.log('✅ Registration confirmation email sent (response not JSON)');
        }
      }
    } catch (emailError: any) {
      console.warn('Error sending registration email:', {
        message: emailError?.message || 'Unknown error',
        error: emailError
      });
      // Don't fail the registration if email fails
    }

    return NextResponse.json({ 
      success: true, 
      registration,
      message: 'Successfully registered for event'
    });
  } catch (error: any) {
    console.error('Error in event registration API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
