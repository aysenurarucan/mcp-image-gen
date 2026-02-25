import "dotenv/config";
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pbService } from './services/pocketbaseService.js';
import { hfService } from './services/huggingfaceService.js';
import { logger } from './utils/logger.js';
import { createPromptTool } from './tools/createPrompt.js';
import { generateImageTool } from './tools/generateImage.js';
import { analyzePromptTool } from './tools/analyzePrompt.js';


dotenv.config();

const app = express();
const port = process.env.PORT || process.env.API_PORT || 8787;

app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(express.json());

// --- ROUTES ---

// GET /api/prompts - List prompts
app.get('/api/prompts', async (req, res) => {
    try {
        const records = await pbService.listPrompts(1, 50);
        res.json(records.items);
    } catch (error: any) {
        logger.error("API /prompts Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/prompts - Create prompt
app.post('/api/prompts', async (req, res) => {
    try {
        // Reuse createPromptTool handler logic if possible or call pbService directly
        // The tool handler returns a text block, let's call pbService directly for cleaner JSON response
        const record = await pbService.createPrompt(req.body);
        res.json(record);
    } catch (error: any) {
        logger.error("API POST /prompts Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/prompts/:id - Get prompt
app.get('/api/prompts/:id', async (req, res) => {
    try {
        const record = await pbService.getPrompt(req.params.id);
        res.json(record);
    } catch (error: any) {
        res.status(404).json({ error: "Prompt not found" });
    }
});

// POST /api/generate - Generate Image
app.post('/api/generate', async (req, res) => {
    try {
        const { promptId, promptText, negativePrompt, width, height, steps, seed, userId } = req.body;

        let finalPromptText = promptText;
        let finalNegativePrompt = negativePrompt;
        let finalPromptId = promptId;

        if (promptId && !promptText) {
            const p = await pbService.getPrompt(promptId);
            finalPromptText = p.content;
            if (!finalNegativePrompt) finalNegativePrompt = p.negativePrompt;
        }

        if (!finalPromptText) return res.status(400).json({ error: "No prompt text provided" });

        const imageBlob = await hfService.generateImage(finalPromptText, finalNegativePrompt, {
            width, height, steps, seed
        });

        const record = await pbService.saveGeneration({
            promptId: finalPromptId || '',
            userId: req.headers["x-user-id"] as string || "web-user",
            model: process.env.HF_IMAGE_MODEL || 'SDXL',
            width: width || 1024,
            height: height || 1024,
            steps,
            seed,
            image: imageBlob
        });


        const imageUrl = `${process.env.PB_URL}/api/files/${record.collectionId}/${record.id}/${record.image}`;

        res.json({
            success: true,
            imageUrl,
            recordId: record.id,
            meta: record
        });

    } catch (error: any) {
        logger.error("API /generate Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/analyze - Analyze prompt
app.post('/api/analyze', async (req, res) => {
    try {
        const { promptText } = req.body;
        if (!promptText) return res.status(400).json({ error: "No prompt text provided" });

        const analysis = await hfService.analyzePrompt(promptText);
        res.json(analysis);
    } catch (error: any) {
        logger.error("API /analyze Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/feed - Paginated feed of all generations
app.get('/api/feed', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const perPage = Math.min(parseInt(req.query.perPage as string) || 20, 50);
        const records = await pbService.listGenerations(page, perPage);
        const items = records.items.map(r => ({
            id: r.id,
            prompt: (r as any).expand?.promptId?.content || '',
            model: (r as any).model || '',
            width: (r as any).width || 1024,
            height: (r as any).height || 1024,
            steps: (r as any).steps,
            userId: (r as any).userId || '',
            created: r.created,
            imageUrl: `${process.env.PB_URL}/api/files/${r.collectionId}/${r.id}/${(r as any).image}`
        }));
        res.json({
            items,
            page: records.page,
            perPage: records.perPage,
            totalItems: records.totalItems,
            totalPages: records.totalPages,
        });
    } catch (error: any) {
        logger.error("API /feed Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/generations - List generations
app.get('/api/generations', async (req, res) => {
    try {
        const records = await pbService.listGenerations(1, 10);
        // Map to include full image URLs
        const items = records.items.map(r => ({
            ...r,
            imageUrl: `${process.env.PB_URL}/api/files/${r.collectionId}/${r.id}/${r.image}`
        }));
        res.json(items);
    } catch (error: any) {
        logger.error("API /generations Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    logger.info(`HTTP API Server running on http://localhost:${port}`);
    // Authenticate PB
    pbService.authenticate().catch(e => logger.error("PB Auth Failed in API:", e));
});
