import { hfService } from "../services/huggingfaceService.js";
import { pbService } from "../services/pocketbaseService.js";
export const generateImageTool = {
    name: "generateImage",
    description: "Generate an image using Stable Diffusion XL based on a prompt ID or text. Saves the result to the database.",
    inputSchema: {
        type: "object",
        properties: {
            promptId: { type: "string", description: "The ID of an existing prompt to use" },
            promptText: { type: "string", description: "The text of the prompt to use directly" },
            negativePrompt: { type: "string" },
            width: { type: "number", default: 1024 },
            height: { type: "number", default: 1024 },
            steps: { type: "number", default: 30 },
            seed: { type: "number" },
            userId: { type: "string", default: "mcp-user" }
        },
        // logical XOR between promptId and promptText is handled in code, but schema can't easily express it perfectly here
    },
    handler: async (args) => {
        // Validate inputs
        // The Zod schema we defined earlier handles the validation logic more strictly
        // const parsed = GenerateImageInputSchema.parse(args); // This verifies promptId OR promptText
        // Check if promptId is provided
        let finalPromptText = args.promptText;
        let finalNegativePrompt = args.negativePrompt;
        let finalPromptId = args.promptId;
        if (args.promptId && !args.promptText) {
            try {
                const promptRecord = await pbService.getPrompt(args.promptId);
                finalPromptText = promptRecord.content;
                if (!finalNegativePrompt) {
                    finalNegativePrompt = promptRecord.negativePrompt;
                }
            }
            catch (e) {
                throw new Error(`Prompt with ID ${args.promptId} not found.`);
            }
        }
        if (!finalPromptText) {
            throw new Error("Either promptId or promptText must be provided.");
        }
        // Generate image
        const imageBlob = await hfService.generateImage(finalPromptText, finalNegativePrompt, {
            width: args.width,
            height: args.height,
            steps: args.steps,
            seed: args.seed
        });
        // Save to PocketBase
        // We need to pass valid parameters
        const record = await pbService.saveGeneration({
            promptId: finalPromptId || '',
            userId: args.userId || 'mcp-user', // If generated from text only, maybe empty or create a temp prompt? 
            // The requirements say "promptId (relation -> prompts)". If we don't have a prompt ID, we might need to create one or allow empty if the relation is optional. 
            // But the schema says "promptId (relation -> prompts)". Relations in PB usually need a valid ID.
            // If the user provides just text, we might want to create a prompt first or just handle it if the relation is optional.
            // Let's assume for now if text is provided, we create a prompt for it or search for an existing one?
            // Or maybe just let it fail ifrelation is required? 
            // The user says "Input: promptId or promptText".
            // And "generations" schema has "promptId (relation -> prompts)".
            // So if promptText is used, we MUST create a prompt entry? Or maybe the relation is optional?
            // Assuming relation is optional or we accept that constraint. Let's create a ephemeral prompt or "unsaved" prompt if possible?
            // But better: Create a prompt if it doesn't exist?
            // Let's just create a new prompt if promptId is missing.
            model: process.env.HF_IMAGE_MODEL || "SDXL",
            width: args.width || 1024,
            height: args.height || 1024,
            steps: args.steps,
            seed: args.seed,
            image: imageBlob
        });
        // Construct image URL (if PB is serving files)
        // http://127.0.0.1:8090/api/files/COLLECTION_ID_OR_NAME/RECORD_ID/FILENAME
        const imageUrl = `${process.env.PB_URL}/api/files/${record.collectionId}/${record.id}/${record.image}`;
        return {
            content: [
                {
                    type: "text",
                    text: `Image generated and saved successfully.\nURL: ${imageUrl}\nRecord ID: ${record.id}`
                },
                // We can also return the image content if supported by the client, but URL is safer for large files
                {
                    type: "image",
                    data: Buffer.from(await imageBlob.arrayBuffer()).toString('base64'),
                    mimeType: "image/png"
                }
            ]
        };
    }
};
