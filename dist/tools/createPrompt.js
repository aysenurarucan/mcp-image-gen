import { CreatePromptSchema } from "../schemas/prompts.js";
import { pbService } from "../services/pocketbaseService.js";
// We'll export a definition object and a handler function
export const createPromptTool = {
    name: "createPrompt",
    description: "Create and store a new image generation prompt in the database",
    inputSchema: {
        type: "object",
        properties: {
            title: { type: "string" },
            content: { type: "string" },
            negativePrompt: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            category: { type: "string" }
        },
        required: ["title", "content"]
    },
    handler: async (args) => {
        // Validate with Zod
        const validated = CreatePromptSchema.parse(args);
        const result = await pbService.createPrompt(validated);
        return {
            content: [
                {
                    type: "text",
                    text: `Prompt created successfully with ID: ${result.id}`
                }
            ]
        };
    }
};
