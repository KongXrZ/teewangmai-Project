import { NextResponse } from 'next/server';

export async function GET() {
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
          name: 'sb-access-token',
          description: 'Supabase Auth Session Cookie',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
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
                      example: 'agent.zeztz@kmutt.ac.th',
                    },
                    password: {
                      type: 'string',
                      format: 'password',
                      minLength: 8,
                      example: 'codenumber-7',
                    },
                    name: {
                      type: 'string',
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
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Sign in with credentials',
          description: 'Sign in using email and password, setting session cookies',
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
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Users'],
          summary: 'Get current user profile',
          description: 'Fetch authenticated user details and public.users profile',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: {
            200: {
              description: 'User details fetched successfully',
            },
            401: {
              description: 'Unauthorized - Not logged in',
            },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Sign out',
          description: 'Clear active session and auth cookies',
          responses: {
            200: {
              description: 'Signed out successfully',
            },
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
