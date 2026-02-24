import { pbService } from "../services/pocketbaseService.js";
export const savePromptTool = {
    name: "savePrompt",
    description: "Save a prompt to user's favorites collection (no duplicate)",
    inputSchema: {
        type: "object",
        properties: {
            userId: { type: "string" },
            promptId: { type: "string" }
        },
        required: ["userId", "promptId"]
    },
    handler: async (args) => {
        const result = await pbService.savePromptToFavorites(args.userId, args.promptId);
        return {
            content: [
                {
                    type: "text",
                    text: `Prompt saved to favorites successfully. Record ID: ${result.id}`
                }
            ]
        };
    }
};
