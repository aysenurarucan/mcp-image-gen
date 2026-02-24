import { z } from 'zod';
export const CreatePromptSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    negativePrompt: z.string().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
});
export const PromptSchema = CreatePromptSchema.extend({
    id: z.string(),
    created: z.string(),
    updated: z.string(),
});
