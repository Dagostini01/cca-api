import { z } from 'zod';

export const entityIdSchema = z.number().int().positive();
export const entityIdParamSchema = z.coerce.number().int().positive();
