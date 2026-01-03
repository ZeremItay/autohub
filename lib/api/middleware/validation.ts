/**
 * Validation middleware for API routes using Zod
 */
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';

export interface ValidatedRequest<T = any> extends NextRequest {
  validatedData?: T;
}

/**
 * Middleware to validate request body with Zod schema
 */
export function withValidation<T extends ZodSchema>(
  schema: T,
  options?: {
    validateQuery?: boolean; // Validate query params instead of body
  }
) {
  return (
    handler: (req: ValidatedRequest<z.infer<T>>) => Promise<NextResponse>
  ) => {
    return async (req: NextRequest) => {
      try {
        let data: any;

        if (options?.validateQuery) {
          // Validate query parameters
          const url = new URL(req.url);
          data = Object.fromEntries(url.searchParams.entries());
        } else {
          // Validate request body
          const contentType = req.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            data = await req.json();
          } else {
            return NextResponse.json(
              { error: 'Invalid content type', message: 'נדרש JSON' },
              { status: 400 }
            );
          }
        }

        // Validate with Zod schema
        const validatedData = schema.parse(data);

        // Attach validated data to request
        const validatedReq = req as ValidatedRequest<z.infer<T>>;
        validatedReq.validatedData = validatedData;

        return handler(validatedReq);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: 'Validation error',
              message: 'שגיאת אימות',
              details: (error as any).issues?.map((e: any) => ({
                path: Array.isArray(e.path) ? e.path.join('.') : e.path,
                message: e.message,
              })) || [],
            },
            { status: 400 }
          );
        }

        console.error('Validation middleware error:', error);
        return NextResponse.json(
          { error: 'Internal server error', message: 'שגיאה בשרת' },
          { status: 500 }
        );
      }
    };
  };
}

