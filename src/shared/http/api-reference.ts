import fastifyApiReference from '@scalar/fastify-api-reference';
import type { FastifyInstance } from 'fastify';
import { createOpenApiDocument } from './openapi-document.js';

export function registerApiReference(app: FastifyInstance) {
  app.register(fastifyApiReference, {
    routePrefix: '/docs',
    configuration: {
      title: 'CCA API',
      content: createOpenApiDocument(),
    },
  });
}
