import { supabase } from '../supabase';

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
  created_at: string;
  updated_at: string;
}

// Get all events
export async function getAllEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true })
    .limit(50);
  
  return { data, error };
}

// Get upcoming events (future events)
export async function getUpcomingEvents(limit?: number) {
  const today = new Date().toISOString().split('T')[0];
  
  let query = supabase
    .from('events')
    .select('*')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  return { data, error };
}

// Get events for a specific date range
export async function getEventsByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true });
  
  return { data, error };
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
  const { data, error } = await supabase
    .from('events')
    .insert([event])
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

// Delete event
export async function deleteEvent(eventId: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);
  
  return { error };
}

// Get next live event (within 1 hour before or after start)
// This finds the closest upcoming live event with zoom_meeting_id
export async function getNextLiveEvent() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/queries/events.ts:128',message:'getNextLiveEvent called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  
  // Get all upcoming events with zoom_meeting_id
  const today = now.toISOString().split('T')[0];
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/queries/events.ts:135',message:'Before supabase query',data:{now:now.toISOString(),today,oneHourFromNow:oneHourFromNow.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .not('zoom_meeting_id', 'is', null)
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true });
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/queries/events.ts:144',message:'After supabase query',data:{hasError:!!error,dataCount:data?.length||0,error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  if (error || !data) {
    return { data: null, error };
  }
  
  // Filter events that are within 1 hour before or after start time
  const eligibleEvents = data.filter((event) => {
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
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/queries/events.ts:160',message:'Event eligibility check',data:{eventId:event.id,eventTitle:event.title,eventDateTime:eventDateTime.toISOString(),isEligible,eventDateTimeMs:eventDateTime.getTime(),oneHourFromNowMs:oneHourFromNow.getTime(),oneHourBeforeEventMs:oneHourBeforeEvent.getTime(),nowMs:now.getTime()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    return isEligible;
  });
  
  // Return the closest event (first one in the sorted list)
  const nextEvent = eligibleEvents.length > 0 ? eligibleEvents[0] : null;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/queries/events.ts:167',message:'getNextLiveEvent returning',data:{eligibleCount:eligibleEvents.length,hasNextEvent:!!nextEvent,nextEventId:nextEvent?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  return { data: nextEvent, error: null };
}

