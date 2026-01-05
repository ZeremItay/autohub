/**
 * Base repository class for database operations
 * Provides common CRUD operations and error handling
 */
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/utils/errorHandler';
import type { PostgrestError } from '@supabase/supabase-js';

export interface RepositoryResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

export abstract class BaseRepository<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Find all records
   */
  async findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: { column: string; ascending?: boolean };
  }): Promise<RepositoryResult<T[]>> {
    try {
      let query = supabase.from(this.tableName).select('*');

      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        logError(error, `${this.tableName}.findAll`);
        return { data: null, error };
      }

      return { data: data as T[], error: null };
    } catch (error: any) {
      logError(error, `${this.tableName}.findAll`);
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<RepositoryResult<T>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logError(error, `${this.tableName}.findById`);
        return { data: null, error };
      }

      return { data: data as T, error: null };
    } catch (error: any) {
      logError(error, `${this.tableName}.findById`);
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Create new record
   */
  async create(data: Partial<T>): Promise<RepositoryResult<T>> {
    try {
      const { data: created, error } = await supabase
        .from(this.tableName)
        .insert([data])
        .select()
        .single();

      if (error) {
        logError(error, `${this.tableName}.create`);
        return { data: null, error };
      }

      return { data: created as T, error: null };
    } catch (error: any) {
      logError(error, `${this.tableName}.create`);
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Update record
   */
  async update(id: string, data: Partial<T>): Promise<RepositoryResult<T>> {
    try {
      const { data: updated, error } = await supabase
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logError(error, `${this.tableName}.update`);
        return { data: null, error };
      }

      return { data: updated as T, error: null };
    } catch (error: any) {
      logError(error, `${this.tableName}.update`);
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Delete record
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        logError(error, `${this.tableName}.delete`);
        return { data: null, error };
      }

      return { data: null, error: null };
    } catch (error: any) {
      logError(error, `${this.tableName}.delete`);
      return { data: null, error: error as PostgrestError };
    }
  }
}



