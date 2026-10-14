import { z } from 'zod';

const localFrontendOrigins = 'http://127.0.0.1:4173,http://localhost:4173';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  KEYCLOAK_ISSUER: z.string().url(),
  KEYCLOAK_JWKS_URI: z.string().url(),
  KEYCLOAK_AUDIENCE: z.string().min(1),
  CORS_ORIGINS: z.string().default(localFrontendOrigins).transform((value, context) => {
    const origins = value.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
    if (origins.length === 0 || origins.includes('*')) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'CORS_ORIGINS must list explicit origins' });
      return z.NEVER;
    }
    for (const origin of origins) {
      try {
        const url = new URL(origin);
        if (url.origin !== origin) throw new Error('origin must not include a path');
      } catch {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'CORS_ORIGINS has an invalid origin' });
        return z.NEVER;
      }
    }
    return origins;
  }),
});

export type Env = z.infer<typeof schema>;
export function loadEnv(input: NodeJS.ProcessEnv = process.env): Env {
  return schema.parse(input);
}
