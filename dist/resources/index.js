import { pbService } from "../services/pocketbaseService.js";
export const resourceHandlers = {
    "prompts://list": async () => {
        const records = await pbService.listPrompts(1, 50);
        return {
            contents: [{
                    uri: "prompts://list",
                    mimeType: "application/json",
                    text: JSON.stringify(records.items, null, 2)
                }]
        };
    },
    "categories://list": async () => {
        const records = await pbService.listCategories();
        return {
            contents: [{
                    uri: "categories://list",
                    mimeType: "application/json",
                    text: JSON.stringify(records, null, 2)
                }]
        };
    },
    "generations://list": async () => {
        const records = await pbService.listGenerations(1, 50);
        return {
            contents: [{
                    uri: "generations://list",
                    mimeType: "application/json",
                    text: JSON.stringify(records.items, null, 2)
                }]
        };
    }
};
export const getPromptHandler = async (uri) => {
    const id = uri.split("prompts://")[1];
    if (!id)
        throw new Error("Invalid prompt URI");
    const record = await pbService.getPrompt(id);
    return {
        contents: [{
                uri: uri,
                mimeType: "application/json",
                text: JSON.stringify(record, null, 2)
            }]
    };
};
export const listResourcesHandler = async () => {
    // Dynamic list based on what we have? Or just static list of "list" resources?
    // And also expose individual prompt URIs if feasible, but that might be too many.
    // We'll expose the high-level list resources.
    return {
        resources: [
            {
                uri: "prompts://list",
                name: "List of Prompts",
                description: "A list of recent image generation prompts",
                mimeType: "application/json"
            },
            {
                uri: "categories://list",
                name: "List of Categories",
                description: "Available prompt categories",
                mimeType: "application/json"
            },
            {
                uri: "generations://list",
                name: "List of Generations",
                description: "Recent image generations",
                mimeType: "application/json"
            }
        ]
    };
};
