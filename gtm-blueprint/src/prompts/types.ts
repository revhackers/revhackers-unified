import type { z } from 'zod';
import type { Task } from '../ai/types.js';

export interface PromptSpec<I, O> {
  id: string;
  version: string;
  task: Task;
  system: string;
  buildUser(input: I): string;
  // Input is unknown on purpose: schemas may coerce raw model output (e.g. bare string → HIPOTESE claim).
  schema: z.ZodType<O, z.ZodTypeDef, unknown>;
}
