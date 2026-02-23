import PocketBase from 'pocketbase';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
import { CreatePromptInput } from '../schemas/prompts.js';


dotenv.config();

const PB_URL = process.env.PB_URL || 'https://pocketbase-8vgg.onrender.com';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'arucanaysenur4@gmail.com';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'H8F3a2m7$$';

export class PocketBaseService {
    private pb: PocketBase;
    private authenticated: boolean = false;

    constructor() {
        this.pb = new PocketBase(PB_URL);
        this.pb.autoCancellation(false);
    }

    async authenticate() {
        if (this.authenticated) return;
        try {
            await this.pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
            this.authenticated = true;
            logger.info('Authenticated with PocketBase');
        } catch (error) {
            logger.error('Failed to authenticate with PocketBase', error);
            throw error;
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
