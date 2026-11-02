export const openApiDocument = {
  openapi: '3.0.3',
  info: { title: 'TherapySession Admin API', version: '0.1.0' },
  servers: [{ url: '/api/v1' }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer' },
      refreshCookie: { type: 'apiKey', in: 'cookie', name: 'refreshToken' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['status', 'code', 'message'],
        properties: {
          status: { type: 'integer' },
          code: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'array' },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          clientCode: { type: 'string', pattern: '^CL-[A-Z0-9]{4,8}$' },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          durationMins: { type: 'integer' },
          sessionType: {
            type: 'string',
            enum: ['in-person', 'online', 'phone'],
          },
          status: {
            type: 'string',
            enum: ['scheduled', 'completed', 'cancelled'],
          },
          attendance: {
            type: 'string',
            enum: ['pending', 'attended', 'no-show', 'late-cancel'],
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'counsellor'] },
          isActive: { type: 'boolean' },
        },
      },
      Note: {
        type: 'object',
        properties: {
          content: { type: 'string', maxLength: 5000 },
          updatedAt: { type: 'string', format: 'date-time' },
          retainUntil: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Authenticated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/Error' },
          401: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        security: [{ refreshCookie: [] }],
        responses: {
          200: { description: 'Refreshed access token' },
          401: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/auth/logout': {
      post: {
        security: [{ refreshCookie: [] }],
        responses: { 204: { description: 'Logged out' } },
      },
    },
    '/auth/me': {
      get: {
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          401: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/auth/register': {
      post: {
        description: 'Admin-only counsellor creation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' },
            },
          },
        },
        responses: {
          201: { description: 'Created' },
          400: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/appointments': {
      get: {
        parameters: [
          {
            name: 'from',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'to',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
          },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'attendance', in: 'query', schema: { type: 'string' } },
          { name: 'clientCode', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Paginated appointments' },
          400: { $ref: '#/components/responses/Error' },
        },
      },
      post: {
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Appointment' },
            },
          },
        },
        responses: {
          201: { description: 'Created' },
          400: { $ref: '#/components/responses/Error' },
          409: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/appointments/{id}': {
      get: {
        parameters: [{ $ref: '#/components/parameters/id' }],
        responses: {
          200: {
            description: 'Appointment',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Appointment' },
              },
            },
          },
          404: { $ref: '#/components/responses/Error' },
        },
      },
      patch: {
        parameters: [{ $ref: '#/components/parameters/id' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['startTime', 'endTime'],
                properties: {
                  startTime: { type: 'string', format: 'date-time' },
                  endTime: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Rescheduled' },
          409: { $ref: '#/components/responses/Error' },
        },
      },
      delete: {
        parameters: [{ $ref: '#/components/parameters/id' }],
        responses: {
          204: { description: 'Cancelled' },
          409: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/appointments/{id}/attendance': {
      patch: {
        parameters: [{ $ref: '#/components/parameters/id' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['attendance'],
                properties: {
                  attendance: {
                    type: 'string',
                    enum: ['attended', 'no-show', 'late-cancel'],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Attendance updated' },
          400: { $ref: '#/components/responses/Error' },
          409: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/appointments/{id}/note': {
      get: {
        parameters: [{ $ref: '#/components/parameters/id' }],
        responses: {
          200: {
            description: 'Private note',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Note' },
              },
            },
          },
          404: { $ref: '#/components/responses/Error' },
        },
      },
      put: {
        parameters: [{ $ref: '#/components/parameters/id' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Note' },
            },
          },
        },
        responses: {
          200: { description: 'Saved' },
          409: { $ref: '#/components/responses/Error' },
        },
      },
      delete: {
        parameters: [{ $ref: '#/components/parameters/id' }],
        responses: { 204: { description: 'Deleted' } },
      },
    },
    '/availability': {
      get: {
        parameters: [
          {
            name: 'counsellorId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'date',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date' },
          },
        ],
        responses: {
          200: { description: 'Available 15-minute slots' },
          400: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/stats': {
      get: {
        parameters: [
          {
            name: 'from',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'to',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time' },
          },
          { name: 'counsellorId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Statistics and weekly series' } },
      },
    },
    '/users': {
      get: {
        responses: {
          200: { description: 'Paginated users' },
          403: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/users/{id}/deactivate': {
      patch: {
        parameters: [{ $ref: '#/components/parameters/id' }],
        responses: {
          200: { description: 'Deactivated' },
          400: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/healthz': {
      get: { security: [], responses: { 200: { description: 'Liveness' } } },
    },
    '/readyz': {
      get: {
        security: [],
        responses: {
          200: { description: 'Ready' },
          503: { description: 'Not ready' },
        },
      },
    },
  },
};

openApiDocument.components.responses = {
  Error: {
    description: 'Error response',
    content: {
      'application/json': { schema: { $ref: '#/components/schemas/Error' } },
    },
  },
};
openApiDocument.components.parameters = {
  id: { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
};
