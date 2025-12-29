import { supabase } from '../supabase'

export interface Role {
  id: string
  name: string
  display_name: string
  description?: string
  price?: number
  created_at?: string
}

// Get all roles
export async function getAllRoles() {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching roles:', error)
    return { data: null, error }
  }
  
  return { data, error: null }
}

// Get role by ID
export async function getRole(roleId: string) {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single()
  
  if (error) {
    console.error('Error fetching role:', error)
    return { data: null, error }
  }
  
  return { data, error: null }
}

// Get role by name
export async function getRoleByName(name: string) {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('name', name)
    .single()
  
  if (error) {
    console.error('Error fetching role:', error)
    return { data: null, error }
  }
  
  return { data, error: null }
}
