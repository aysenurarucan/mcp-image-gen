import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
dotenv.config();
const HF_API_KEY = process.env.HF_API_KEY;
const HF_IMAGE_MODEL = process.env.HF_IMAGE_MODEL || 'stabilityai/stable-diffusion-xl-base-1.0';
const HF_TEXT_MODEL = process.env.HF_TEXT_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';
if (!HF_API_KEY) {
    logger.error('HF_API_KEY is not set');
    throw new Error('HF_API_KEY is not set');
}
const hf = new HfInference(HF_API_KEY);
export class HuggingFaceService {
    async retry(fn, retries = 5, initialDelay = 1000) {
        let attempt = 0;
        let delay = initialDelay;
        const maxDelay = 30000; // Cap delay at 30 seconds
        while (true) {
            try {
                return await fn();
            }
            catch (error) {
                attempt++;
                if (attempt > retries) {
                    throw error;
                }
                // Check for 429 or 503
                if (error.status === 429 || error.status === 503) {
                    // Check for Retry-After header
                    let retryAfter = 0;
                    if (error.response?.headers?.get) {
                        const headerVal = error.response.headers.get('retry-after');
                        if (headerVal) {
                            retryAfter = parseInt(headerVal, 10) * 1000;
                        }
                    }
                    // If retry-after is present, use it. Otherwise use exponential backoff
                    let waitTime = retryAfter > 0 ? retryAfter : delay;
                    // Add Jitter (0-10% of waitTime)
                    const jitter = waitTime * 0.1 * Math.random();
                    waitTime += jitter;
                    // Cap wait time if using backoff (not if explicit retry-after)
                    if (retryAfter === 0) {
                        waitTime = Math.min(waitTime, maxDelay);
                        delay *= 2; // Exponential backoff for next time
                    }
                    logger.warn(`Rate limited (429/503). Retrying in ${Math.round(waitTime)}ms... (Attempt ${attempt}/${retries})`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
                else {
                    // Not a retryable error
                    throw error;
                }
            }
        }
    }
    async generateImage(prompt, negativePrompt, options) {
        logger.info(`Generating image for prompt: "${prompt}"`);
        return this.retry(async () => {
            try {
                const imageBlob = await hf.textToImage({
                    model: HF_IMAGE_MODEL,
                    inputs: prompt,
                    parameters: {
                        negative_prompt: negativePrompt,
                        width: options?.width,
                        height: options?.height,
                        num_inference_steps: options?.steps,
                        seed: options?.seed,
                    }
                });
                return imageBlob;
            }
            catch (error) {
                logger.error('Error generating image from HuggingFace', error);
                // Map specific error codes if needed, though they are usually propagated
                throw error;
            }
        });
    }
    async analyzePrompt(promptText) {
        logger.info(`Analyzing prompt: "${promptText}"`);
        const systemPrompt = `You are an expert prompt engineer for Stable Diffusion. Analyze the user's prompt. 
    Return strictly a JSON object with the following structure:
    {
      "qualityScore": <number 0-100>,
      "suggestions": [<string>, <string>, <string>],
      "useCases": [<string>, <string>, <string>]
    }
    Do not include any conversational text, just the JSON.`;
        const fullPrompt = `<s>[INST] ${systemPrompt} \n\n User Prompt: "${promptText}" [/INST]`;
        return this.retry(async () => {
            try {
                const result = await hf.textGeneration({
                    model: HF_TEXT_MODEL,
                    inputs: fullPrompt,
                    parameters: {
                        max_new_tokens: 500,
                        temperature: 0.7,
                        return_full_text: false
                    }
                });
                const text = result.generated_text;
                // Attempt to extract JSON
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                else {
                    logger.warn('Could not parse JSON from analysis result', text);
                    throw new Error('Failed to parse analysis result');
                }
            }
            catch (error) {
                logger.error('Error analyzing prompt', error);
                throw error;
            }
        });
    }
}
export const hfService = new HuggingFaceService();
