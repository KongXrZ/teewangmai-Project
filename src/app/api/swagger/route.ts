import { NextResponse } from 'next/server';

export async function GET() {
  let sessionCookie = 'sb-project-ref-auth-token';
  try {
    sessionCookie = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname.split('.')[0]}-auth-token`;
  } catch { /* The docs can render before the local environment is configured. */ }
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'TeeWangMai Core Service API',
      version: '1.0.0',
      description: 'API Documentation for TeeWangMai? (ที่ว่างไหม?) Campus Crowd & Location Platform',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: sessionCookie,
          description: 'Browser-managed Supabase SSR session cookie (may be chunked with .0/.1 suffixes). These routes use same-origin cookies, not Bearer headers. Do not paste tokens into the API explorer.',
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Authentication Endpoints',
      },
      {
        name: 'Users',
        description: 'User Management & Profile Endpoints',
      },
      {
        name: 'Health',
        description: 'Health Check Endpoints',
      },
    ],
    paths: {
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Health Check',
          description: 'Check service availability and health status',
          responses: {
            200: {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  example: {
                    status: 'ok',
                    timestamp: '2026-10-13T00:00:00.000Z',
                    service: 'teewangmai-backend',
                    version: '1.0.0',
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/signup': {
        post: {
          tags: ['Auth'],
          summary: 'Register new user',
          description:
            'Create account in Supabase auth.users and trigger public.users profile creation automatically. Session tokens are stored in cookies and are not returned in the JSON body.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'student@example.com',
                    },
                    password: {
                      type: 'string',
                      format: 'password',
                      minLength: 8,
                      maxLength: 100,
                      example: 'your-password',
                    },
                    name: {
                      type: 'string',
                      minLength: 2,
                      maxLength: 50,
                      example: 'โยโรสุ บาคุ',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Registration successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['success', 'message', 'requiresEmailConfirmation'],
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string' },
                      requiresEmailConfirmation: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Validation failed or email already registered',
            },
            415: { description: 'Content-Type must be application/json' },
            429: { description: 'Too many requests; retry later' },
            503: { description: 'Authentication service unavailable; safe error only' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Sign in with credentials',
          description: 'Sign in using email and password, setting browser-readable SSR session cookies. Returns success/message only, never tokens or the raw Auth user.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'student@kmutt.ac.th',
                    },
                    password: {
                      type: 'string',
                      format: 'password',
                      example: 'Password123!',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Sign in successful',
            },
            401: {
              description: 'Invalid email or password',
            },
            400: { description: 'Invalid input or malformed JSON' },
            415: { description: 'Content-Type must be application/json' },
            429: { description: 'Too many requests; retry later' },
            503: { description: 'Authentication service unavailable; safe error only' },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Users'],
          summary: 'Get current user profile',
          description: 'Returns a validated user DTO {id, email} and own profile {id, auth_id, name, email, avatar_url, points, created_at}. Does not return Auth metadata or tokens. Response is private/no-store.',
          security: [{ cookieAuth: [] }],
          responses: {
            200: {
              description: 'User details fetched successfully',
            },
            401: {
              description: 'Unauthorized - Not logged in',
            },
            503: { description: 'Auth or profile lookup unavailable; retry instead of assuming signed out' },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Sign out',
          description: 'Clear this browser session and cookies. Repeated/expired-session logout is safe. Other device sessions are not revoked.',
          responses: {
            200: {
              description: 'Signed out successfully',
            },
            503: { description: 'Sign-out failed; show a safe error and allow retry' },
          },
        },
      },
    },
  };

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TeeWangMai Core Service API</title>
    <style>
      body {
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      type="application/json"
    >
      ${JSON.stringify(spec)}
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.73.0"></script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
