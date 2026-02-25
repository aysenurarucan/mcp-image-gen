import PocketBase from 'pocketbase';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
import { CreatePromptInput } from '../schemas/prompts.js';





dotenv.config();

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_EMAIL = process.env.PB_EMAIL || '';
const PB_PASSWORD = process.env.PB_PASSWORD || '';

export class PocketBaseService {
    private pb: PocketBase;
    private authenticated: boolean = false;

    constructor() {
        this.pb = new PocketBase("https://pocketbase-server-k8ac.onrender.com");
        this.pb.autoCancellation(false);
    }

    async authenticate() {
        if (this.authenticated) return;

        try {
            console.log("PB AUTH START");

            await this.pb.admins.authWithPassword(PB_EMAIL, PB_PASSWORD);

            this.authenticated = true;
            console.log("Authenticated with PocketBase");
        } catch (err) {
            console.error("PB AUTH ERROR:", err);
            throw err;
        }
    }

    async createPrompt(data: CreatePromptInput) {
        await this.authenticate();
        try {
            const record = await this.pb.collection('prompts').create(data);
            logger.info(`Created prompt: ${record.id}`);
            return record;
        } catch (error) {
            logger.error('Failed to create prompt', error);
            throw error;
        }
    }

    async getPrompt(id: string) {
        await this.authenticate();
        try {
            const record = await this.pb.collection('prompts').getOne(id);
            return record;
        } catch (error) {
            logger.error(`Failed to get prompt ${id}`, error);
            throw error;
        }
    }

    async listPrompts(page = 1, perPage = 20, filter = '') {
        await this.authenticate();
        try {
            const records = await this.pb.collection('prompts').getList(page, perPage, {
                filter,
                sort: '-created',
            });
            return records;
        } catch (error) {
            logger.error('Failed to list prompts', error);
            throw error;
        }
    }

    async searchPrompts(query: string) {
        return this.listPrompts(1, 20, `content ~ "${query}" || title ~ "${query}"`);
    }

    async saveGeneration(data: {
        promptId: string;
        userId: string;
        model: string;
        width: number;
        height: number;
        steps?: number;
        seed?: number;
        image: Blob | Buffer;
    }) {


        await this.authenticate();
        try {
            const formData = new FormData();
            if (data.promptId) {
                formData.append('promptId', data.promptId);
            }
            formData.append('userId', data.userId);
            formData.append('model', data.model);
            formData.append('width', data.width.toString());
            formData.append('height', data.height.toString());
            if (data.steps) formData.append('steps', data.steps.toString());
            if (data.seed) formData.append('seed', data.seed.toString());

            // In Node, appending a Blob might need a filename for PB to recognize it as a file upload
            // If it's a buffer, we might need a Blob wrapper.
            // Assuming it's a valid Blob from huggingface inference result
            formData.append('image', data.image as any, 'generated_image.png');

            const record = await this.pb.collection('generations').create(formData);
            logger.info(`Saved generation: ${record.id}`);
            return record;
        } catch (error) {
            // If FormData is not available (older node), we might need 'form-data' package
            logger.error('Failed to save generation', error);
            throw error;
        }
    }

    async savePromptToFavorites(userId: string, promptId: string) {
        await this.authenticate();
        try {
            // Check for duplicates
            const existing = await this.pb.collection('saved_prompts').getList(1, 1, {
                filter: `userId="${userId}" && promptId="${promptId}"`,
            });

            if (existing.totalItems > 0) {
                return existing.items[0];
            }

            const record = await this.pb.collection('saved_prompts').create({
                userId,
                promptId,
            });
            logger.info(`Saved prompt ${promptId} for user ${userId}`);
            return record;
        } catch (error) {
            logger.error('Failed to save prompt to favorites', error);
            throw error;
        }
    }

    async listCategories() {
        await this.authenticate();
        try {
            const records = await this.pb.collection('categories').getFullList();
            return records;
        } catch (error) {
            logger.error('Failed to list categories', error);
            throw error;
        }
    }

    async listGenerations(page = 1, perPage = 20) {
        await this.authenticate();
        try {
            const records = await this.pb.collection('generations').getList(page, perPage, {
                sort: '-created',
                expand: 'promptId',
            });
            return records;
        } catch (error) {
            logger.error('Failed to list generations', error);
            throw error;
        }
    }
}

export const pbService = new PocketBaseService();
