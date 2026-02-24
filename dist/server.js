import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools/index.js";
import { resourceHandlers, getPromptHandler, listResourcesHandler } from "./resources/index.js";
import { logger } from "./utils/logger.js";
import dotenv from 'dotenv';
import { pbService } from "./services/pocketbaseService.js";
dotenv.config();
// Create server instance
const server = new Server({
    name: "mcp-image-gen",
    version: "1.0.0",
}, {
    capabilities: {
        resources: {},
        tools: {},
    },
});
// List Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: tools.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
        }))
    };
});
// Call Tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find(t => t.name === request.params.name);
    if (!tool) {
        throw new Error(`Tool not found: ${request.params.name}`);
    }
    try {
        return await tool.handler(request.params.arguments);
    }
    catch (error) {
        logger.error(`Error executing tool ${request.params.name}`, error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error.message}`
                }
            ],
            isError: true
        };
    }
});
// List Resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    // We can also return a list of individual prompts, but for now just the static lists
    // + potentially fetching all prompts if we wanted exposure
    const staticResources = await listResourcesHandler();
    // If we want to List ALL prompts as resources:
    // This could be expensive if there are many prompts.
    // For now, we'll stick to the "list" resources + maybe search?
    // But the user asked for "prompts.get", implying we can get individual prompts.
    // We can support reading ANY prompt by ID via `prompts://{id}` pattern, 
    // even if we don't list them all in ListResources.
    // However, ideally ListResources shoud return what is readable.
    // We'll return just the collection lists for now to be safe.
    return {
        resources: staticResources.resources
    };
});
// Read Resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    // Check for static list URIs first
    if (uri === "prompts://list") {
        const handler = resourceHandlers["prompts://list"]; // Actually returns a promise that resolves to content string
        // Implementation in resourceHandlers returns the proper content structure
        const result = await resourceHandlers["prompts://list"]();
        return result;
    }
    if (uri === "categories://list") {
        const result = await resourceHandlers["categories://list"]();
        return result;
    }
    if (uri === "generations://list") {
        const result = await resourceHandlers["generations://list"]();
        return result;
    }
    // Check for prompt ID pattern
    if (uri.startsWith("prompts://")) {
        try {
            const result = await getPromptHandler(uri);
            return result;
        }
        catch (e) {
            throw new Error(`Resource not found or error: ${uri}`);
        }
    }
    throw new Error(`Resource not found: ${uri}`);
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("MCP Image Gen Server running on stdio");
    // Try to authenticate PB early to fail fast if config is wrong
    try {
        await pbService.authenticate();
    }
    catch (e) {
        logger.warn("Failed to authenticate with PocketBase on startup. Will retry on demand.");
    }
}
main().catch((error) => {
    logger.error("Server error:", error);
    process.exit(1);
});
