import { hfService } from "../services/huggingfaceService.js";
export const analyzePromptTool = {
    name: "analyzePrompt",
    description: "Analyze a text prompt for quality, suggestions, and use cases using an LLM.",
    inputSchema: {
        type: "object",
        properties: {
            promptText: { type: "string" }
        },
        required: ["promptText"]
    },
    handler: async (args) => {
        const result = await hfService.analyzePrompt(args.promptText);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    }
};
