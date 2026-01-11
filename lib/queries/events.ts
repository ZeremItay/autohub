import { supabase } from '../supabase';

// Helper function to add timeout to Supabase queries
async function withQueryTimeout<T>(
  queryPromise: Promise<{ data: T | null; error: any }>,
  timeoutMs: number = 10000
): Promise<{ data: T | null; error: any }> {
  const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => {
    setTimeout(() => {
      resolve({ data: null, error: { message: 'Query timeout', code: 'TIMEOUT' } });
    }, timeoutMs);
  });

  return Promise.race([queryPromise, timeoutPromise]);
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_time: string;
  event_type: 'live' | 'webinar' | 'workshop' | 'qa' | 'other';
  location?: string;
  instructor_name?: string;
  instructor_title?: string;
  instructor_avatar_url?: string;
  learning_points?: string[];
  about_text?: string;
  is_recurring: boolean;
  recurring_pattern?: string;
  zoom_meeting_id?: string;
  zoom_meeting_password?: string;
  recording_id?: string;
  status?: 'upcoming' | 'active' | 'completed' | 'cancelled' | 'deleted';
  created_at: string;
  updated_at: string;
}

// Get all events
export async function getAllEvents(includeDeleted: boolean = false) {
  let query = supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true })
    .limit(50);
  
  // Filter out deleted events unless explicitly requested
  if (!includeDeleted) {
    query = query.or('status.is.null,status.neq.deleted');
  }
  
  const result = await withQueryTimeout(query, 10000);
  const data = result.data as any[] | null;
  const error = result.error;
  return { data: Array.isArray(data) ? data : [], error };
}

// Get upcoming events (future events)
export async function getUpcomingEvents(limit?: number) {
  const today = new Date().toISOString().split('T')[0];
  
  let query = supabase
    .from('events')
    .select('*')
    .gte('event_date', today)
    .or('status.is.null,status.eq.upcoming,status.eq.active,status.eq.completed')
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const result = await withQueryTimeout(query, 10000);
  const data = result.data as any[] | null;
  const error = result.error;
  return { data: Array.isArray(data) ? data : [], error };
}

// Get events for a specific date range
export async function getEventsByDateRange(startDate: string, endDate: string, includeDeleted: boolean = false) {
  let query = supabase
    .from('events')
    .select('*')
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true });
  
  // Filter out deleted events unless explicitly requested
  if (!includeDeleted) {
    query = query.or('status.is.null,status.neq.deleted');
  }
  
  const result = await withQueryTimeout(query, 10000);
  const data = result.data as any[] | null;
  const error = result.error;
  return { data: Array.isArray(data) ? data : [], error };
}

// Get events for a specific month
export async function getEventsByMonth(year: number, month: number) {
  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const startDate = `${year}-${monthStr}-01`;
  // Get last day of month
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${lastDay}`;
  
  return getEventsByDateRange(startDate, endDate);
}

// Create event
export async function createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
  // Set default status to 'upcoming' if not provided
  const eventData = {
    ...event,
    status: event.status || 'upcoming'
  };
  
  const { data, error } = await supabase
    .from('events')
    .insert([eventData])
    .select()
    .single();
  
  return { data, error };
}

// Update event
export async function updateEvent(eventId: string, event: Partial<Event>) {
  const { data, error } = await supabase
    .from('events')
    .update({
      ...event,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .select()
    .single();
  
  return { data, error };
}

// Get event by ID
export async function getEventById(eventId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();
  
  return { data, error };
}

// Delete event (soft delete - sets status to 'deleted')
export async function deleteEvent(eventId: string) {
  console.log('deleteEvent called with eventId:', eventId);
  
  // Use soft delete - set status to 'deleted' instead of actually deleting
  const { data, error } = await supabase
    .from('events')
    .update({ 
      status: 'deleted',
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .select();
  
  console.log('deleteEvent result (soft delete):', { data, error, hasError: !!error });
  
  return { data, error };
}

// Get next live event (within 1 hour before or after start)
// This finds the closest upcoming live event with zoom_meeting_id
export async function getNextLiveEvent() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  
  // Get all upcoming events with zoom_meeting_id
  const today = now.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .not('zoom_meeting_id', 'is', null)
    .gte('event_date', today)
    .or('status.is.null,status.eq.upcoming,status.eq.active,status.eq.completed')
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true });
  
  if (error || !data) {
    return { data: null, error };
  }
  
  // Filter events that are within 1 hour before or after start time
  const eligibleEvents = data.filter((event: any) => {
    const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
    const eventEndTime = new Date(eventDateTime.getTime() + 2 * 60 * 60 * 1000); // Assume 2 hour duration
    
    // Event should be:
    // 1. Starting within 1 hour from now (or already started)
    // 2. Not ended yet
    // 3. At most 1 hour before start time
    const oneHourBeforeEvent = new Date(eventDateTime.getTime() - 60 * 60 * 1000);
    
    const isEligible = (
      eventDateTime <= oneHourFromNow && // Event starts within 1 hour or already started
      eventDateTime >= oneHourBeforeEvent && // Event is not more than 1 hour before
      eventEndTime > now // Event hasn't ended yet
    );
    
    return isEligible;
  });
  
  // Return the closest event (first one in the sorted list)
  const nextEvent = eligibleEvents.length > 0 ? eligibleEvents[0] : null;

  return { data: nextEvent, error: null };
}

// Auto-update event statuses based on current time
// This function checks all events and updates their status:
// - 'upcoming' → 'active' when event starts
// - 'active' → 'completed' when event ends
// - 'upcoming' stays 'upcoming' if event hasn't started yet
export async function updateEventStatuses() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Get all events that might need status updates (upcoming or active, not deleted/cancelled)
  const { data: events, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .or('status.is.null,status.eq.upcoming,status.eq.active')
    .gte('event_date', today); // Only check future or today's events
  
  if (fetchError || !events || events.length === 0) {
    return { updated: 0, error: fetchError };
  }
  
  const updates: Array<{ id: string; status: string }> = [];
  
  for (const event of events) {
    const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
    const eventEndTime = new Date(eventDateTime.getTime() + 2 * 60 * 60 * 1000); // Assume 2 hour duration
    const currentStatus = event.status || 'upcoming';
    
    let newStatus: string | null = null;
    
    // If event has started but not ended → should be 'active'
    if (now >= eventDateTime && now < eventEndTime) {
      if (currentStatus !== 'active') {
        newStatus = 'active';
      }
    }
    // If event has ended → should be 'completed'
    else if (now >= eventEndTime) {
      if (currentStatus !== 'completed') {
        newStatus = 'completed';
      }
    }
    // If event hasn't started yet → should be 'upcoming'
    else if (now < eventDateTime) {
      if (currentStatus !== 'upcoming') {
        newStatus = 'upcoming';
      }
    }
    
    if (newStatus) {
      updates.push({ id: event.id, status: newStatus });
    }
  }
  
  // Batch update all events that need status changes
  if (updates.length > 0) {
    for (const update of updates) {
      await supabase
        .from('events')
        .update({ 
          status: update.status as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id);
    }
  }
  
  return { updated: updates.length, error: null };
}

// Register user for an event
export async function registerForEvent(userId: string, eventId: string) {
  const { data, error } = await supabase
    .from('event_registrations')
    .insert([{
      event_id: eventId,
      user_id: userId
    }])
    .select()
    .single();

  return { data, error };
}

// Get all event registrations for a user
export async function getUserEventRegistrations(userId: string) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select(`
      id,
      event_id,
      created_at,
      events (
        id,
        title,
        description,
        event_date,
        event_time,
        event_type,
        location,
        instructor_name,
        instructor_title,
        instructor_avatar_url,
        learning_points,
        about_text,
        status,
        zoom_meeting_id,
        recording_id
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user event registrations:', error);
    return { data: null, error };
  }

  return { data: data || [], error: null };
}

// Check if user is registered for an event
// This function checks if a user has registered for a specific event
export async function isUserRegisteredForEvent(
  userId: string,
  eventId: string
): Promise<{ isRegistered: boolean; error: any }> {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) {
    console.error('Error checking event registration:', error);
    return { isRegistered: false, error };
  }

  return { isRegistered: !!data, error: null };
}

// Get all registrations for an event (for admins)
export async function getEventRegistrations(eventId: string) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select(`
      id,
      user_id,
      created_at,
      profiles (
        user_id,
        display_name,
        avatar_url,
        email
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching event registrations:', error);
    return { data: null, error };
  }

  return { data: data || [], error: null };
}
