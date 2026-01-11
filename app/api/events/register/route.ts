import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { registerForEvent, getEventById, isUserRegisteredForEvent } from '@/lib/queries/events';
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
    const { isRegistered, error: checkError } = await isUserRegisteredForEvent(userId, eventId);
    
    if (checkError) {
      console.error('Error checking registration:', checkError);
      return NextResponse.json(
        { error: 'Error checking registration status', details: checkError },
        { status: 500 }
      );
    }

    if (isRegistered) {
      return NextResponse.json(
        { error: 'Already registered for this event', alreadyRegistered: true },
        { status: 400 }
      );
    }

    // Register user for event
    const { data: registration, error: registrationError } = await registerForEvent(userId, eventId);

    if (registrationError) {
      // Check if it's a duplicate key error (user already registered)
      if (registrationError.code === '23505' || registrationError.message?.includes('duplicate') || registrationError.message?.includes('unique')) {
        return NextResponse.json(
          { error: 'Already registered for this event', alreadyRegistered: true },
          { status: 400 }
        );
      }

      console.error('Error registering for event:', registrationError);
      return NextResponse.json(
        { error: 'Failed to register for event', details: registrationError },
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
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/events/send-registration-email`, {
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
        const emailError = await emailResponse.json();
        console.warn('Failed to send registration email:', emailError);
        // Don't fail the registration if email fails
      } else {
        console.log('✅ Registration confirmation email sent');
      }
    } catch (emailError) {
      console.warn('Error sending registration email:', emailError);
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
