import { pbService } from "../services/pocketbaseService.js";
export const searchPromptsTool = {
    name: "searchPrompts",
    description: "Search for existing prompts in the database",
    inputSchema: {
        type: "object",
        properties: {
            query: { type: "string" }
        },
        required: ["query"]
    },
    handler: async (args) => {
        const results = await pbService.searchPrompts(args.query);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(results.items, null, 2)
                }
            ]
        };
    }
};
