import { z } from 'zod';
export const GenerateImageInputSchema = z.object({
    promptId: z.string().optional(),
    promptText: z.string().optional(),
    negativePrompt: z.string().optional(),
    width: z.number().int().min(256).max(1024).default(1024),
    height: z.number().int().min(256).max(1024).default(1024),
    steps: z.number().int().min(1).max(50).optional(),
    seed: z.number().int().optional(),
    count: z.number().int().min(1).max(4).default(1),
}).refine(data => data.promptId || data.promptText, {
    message: "Either promptId or promptText must be provided",
    path: ["promptId", "promptText"]
});
