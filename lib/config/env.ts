/**
 * Environment configuration with validation
 * Validates all environment variables at startup
 */
import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  
  // Site
  NEXT_PUBLIC_SITE_URL: z.string().url('Invalid site URL').optional().default('https://autohub.com'),
  
  // Zoom (optional)
  ZOOM_SDK_KEY: z.string().optional(),
  ZOOM_SDK_SECRET: z.string().optional(),
  NEXT_PUBLIC_ZOOM_SDK_KEY: z.string().optional(),
  
  // Sentry (optional)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse and validate environment variables
function getEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = (error as any).issues?.map((err: any) => `${Array.isArray(err.path) ? err.path.join('.') : err.path}: ${err.message}`).join('\n') || 'Unknown validation error';
      throw new Error(`❌ Invalid environment variables:\n${missingVars}\n\nPlease check your .env.local file.`);
    }
    throw error;
  }
}

export const env = getEnv();

// Type-safe environment access
export type Env = z.infer<typeof envSchema>;

