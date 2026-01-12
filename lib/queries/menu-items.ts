import { supabase } from '../supabase'
import { getCached, setCached, CACHE_TTL, invalidateCache } from '../cache'
import { logError } from '../utils/errorHandler'

export interface MenuItem {
  id: string
  path: string
  label: string
  icon: string
  order: number
  is_visible: boolean
  created_at?: string
  updated_at?: string
}

const CACHE_KEY_ALL = 'menu_items:all'
const CACHE_KEY_VISIBLE = 'menu_items:visible'

// Get all menu items (for admin panel)
export async function getAllMenuItems() {
  // Check cache first
  const cacheKey = CACHE_KEY_ALL
  const cached = getCached(cacheKey)
  if (cached) {
    return { data: cached as MenuItem[], error: null }
  }

  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('order', { ascending: true })

    if (error) {
      logError('getAllMenuItems', error)
      return { data: null, error }
    }

    // Cache the result
    setCached(cacheKey, data, CACHE_TTL)
    return { data: data as MenuItem[], error: null }
  } catch (error: any) {
    logError('getAllMenuItems', error)
    return { data: null, error }
  }
}

// Get only visible menu items (for navigation)
export async function getVisibleMenuItems() {
  // Check cache first
  const cacheKey = CACHE_KEY_VISIBLE
  const cached = getCached(cacheKey)
  if (cached) {
    return { data: cached as MenuItem[], error: null }
  }

  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_visible', true)
      .order('order', { ascending: true })

    if (error) {
      logError('getVisibleMenuItems', error)
      return { data: null, error }
    }

    // Cache the result
    setCached(cacheKey, data, CACHE_TTL)
    return { data: data as MenuItem[], error: null }
  } catch (error: any) {
    logError('getVisibleMenuItems', error)
    return { data: null, error }
  }
}

// Update a single menu item
export async function updateMenuItem(id: string, updates: Partial<MenuItem>) {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logError('updateMenuItem', error)
      return { data: null, error }
    }

    // Invalidate cache
    invalidateCache(CACHE_KEY_ALL)
    invalidateCache(CACHE_KEY_VISIBLE)

    return { data: data as MenuItem, error: null }
  } catch (error: any) {
    logError('updateMenuItem', error)
    return { data: null, error }
  }
}

// Update multiple menu items order
export async function updateMenuItemsOrder(items: { id: string; order: number }[]) {
  try {
    // Update each item's order
    const updates = items.map(item =>
      supabase
        .from('menu_items')
        .update({ order: item.order })
        .eq('id', item.id)
    )

    const results = await Promise.all(updates)
    
    // Check for errors
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      logError('updateMenuItemsOrder', errors[0].error)
      return { data: null, error: errors[0].error }
    }

    // Invalidate cache
    invalidateCache(CACHE_KEY_ALL)
    invalidateCache(CACHE_KEY_VISIBLE)

    // Fetch updated items
    const { data: allItems } = await getAllMenuItems()
    return { data: allItems?.data || null, error: null }
  } catch (error: any) {
    logError('updateMenuItemsOrder', error)
    return { data: null, error }
  }
}

// Toggle visibility of a menu item
export async function toggleMenuItemVisibility(id: string, isVisible: boolean) {
  return updateMenuItem(id, { is_visible: isVisible })
}
