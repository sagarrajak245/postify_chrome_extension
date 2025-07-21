import type { ApiResponse, Certificate, GeneratedPost, PostGenerationRequest } from '../types';

// Gemini API implementation
async function generateWithGemini(request: PostGenerationRequest, apiKey: string) {
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    const prompt = request.certificateContent;
    const body = {
        contents: [
            { parts: [{ text: prompt }] }
        ]
    };
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
            success: false,
            error: `Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`
        };
    }
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
        success: true,
        data: {
            content,
            hashtags: [],
            platform: request.platform,
            characterCount: content.length
        }
    };
}

// Grok API implementation
async function generateWithGrok(request: PostGenerationRequest, apiKey: string) {
    const endpoint = 'https://api.grok.x.ai/v1/chat/completions';
    const prompt = request.certificateContent;
    const body = {
        model: 'grok-1',
        messages: [
            { role: 'user', content: prompt }
        ],
        max_tokens: request.platform === 'twitter' ? 200 : 400,
        temperature: 0.7
    };
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
            success: false,
            error: `Grok API error: ${response.status} - ${errorData.error?.message || response.statusText}`
        };
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return {
        success: true,
        data: {
            content,
            hashtags: [],
            platform: request.platform,
            characterCount: content.length
        }
    };
}

// Wrapper for multi-provider support
export async function generatePostWithAnyProvider(request: PostGenerationRequest, settings: {
    openaiApiKey?: string;
    geminiApiKey?: string;
    grokApiKey?: string;
}): Promise<ApiResponse<GeneratedPost>> {
    if (settings.openaiApiKey) {
        const { createGPTService } = await import('./gptService');
        const gptService = createGPTService(settings.openaiApiKey);
        return gptService.generatePost(request);
    }
    if (settings.geminiApiKey) {
        return generateWithGemini(request, settings.geminiApiKey);
    }
    if (settings.grokApiKey) {
        return generateWithGrok(request, settings.grokApiKey);
    }
    return { success: false, error: 'No AI provider API key configured.' };
}

export class GPTService {
    private apiKey: string;
    private baseUrl = 'https://api.openai.com/v1/chat/completions';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Generate social media post from certificate information
     */
    async generatePost(request: PostGenerationRequest): Promise<ApiResponse<GeneratedPost>> {
        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'OpenAI API key not configured. Please add your API key in settings.'
                };
            }

            const prompt = this.buildPrompt(request);

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // Using the more cost-effective model
                    messages: [
                        {
                            role: 'system',
                            content: this.getSystemPrompt(request.platform)
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: request.platform === 'twitter' ? 200 : 400,
                    temperature: 0.7,
                    presence_penalty: 0.1,
                    frequency_penalty: 0.1
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    error: `OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`
                };
            }

            const data = await response.json();

            if (!data.choices || data.choices.length === 0) {
                return {
                    success: false,
                    error: 'No response generated from OpenAI'
                };
            }

            const content = data.choices[0].message.content;
            const generatedPost = this.parseGeneratedContent(content, request.platform);

            return {
                success: true,
                data: generatedPost
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate post'
            };
        }
    }

    /**
     * Generate multiple post variations
     */
    async generatePostVariations(
        request: PostGenerationRequest,
        count: number = 3
    ): Promise<ApiResponse<GeneratedPost[]>> {
        try {
            const promises = Array(count).fill(null).map(() => this.generatePost(request));
            const results = await Promise.all(promises);

            const successfulPosts = results
                .filter(result => result.success && result.data)
                .map(result => result.data as GeneratedPost);

            if (successfulPosts.length === 0) {
                return {
                    success: false,
                    error: 'Failed to generate any post variations'
                };
            }

            return {
                success: true,
                data: successfulPosts
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate post variations'
            };
        }
    }

    /**
     * Generate post from certificate object
     */
    async generatePostFromCertificate(
        certificate: Certificate,
        platform: 'linkedin' | 'twitter',
        tone: 'professional' | 'casual' | 'excited' = 'professional',
        includeHashtags: boolean = true,
        customMessage?: string
    ): Promise<ApiResponse<GeneratedPost>> {
        const certificateContent = this.formatCertificateContent(certificate);

        const request: PostGenerationRequest = {
            certificateContent,
            platform,
            tone,
            includeHashtags,
            customMessage
        };

        return this.generatePost(request);
    }

    /**
     * Get system prompt based on platform
     */
    private getSystemPrompt(platform: 'linkedin' | 'twitter'): string {
        const basePrompt = `You are a social media expert who creates engaging posts about professional achievements and certifications. Your posts should be authentic, engaging, and appropriate for the platform.`;

        const platformSpecifics = {
            linkedin: `
        Platform: LinkedIn (professional network)
        - Character limit: 3000 characters (aim for 1300-1600 for optimal engagement)
        - Tone: Professional but personable
        - Include relevant professional insights
        - Use 3-5 relevant hashtags
        - Encourage professional discussion
        - Mention key skills learned
        - Show gratitude and growth mindset
      `,
            twitter: `
        Platform: Twitter/X
        - Character limit: 280 characters (strict limit)
        - Tone: Concise and engaging
        - Use 1-3 relevant hashtags
        - Make it shareable and relatable
        - Focus on the achievement and impact
        - Use emojis sparingly but effectively
      `
        };

        return basePrompt + platformSpecifics[platform];
    }

    /**
     * Build the user prompt
     */
    private buildPrompt(request: PostGenerationRequest): string {
        const toneDescriptions = {
            professional: 'professional and polished',
            casual: 'casual and friendly',
            excited: 'enthusiastic and celebratory'
        };

        const prompt = `Create a ${toneDescriptions[request.tone]} social media post about this certificate/achievement:

${request.certificateContent}

Requirements:
- Platform: ${request.platform.toUpperCase()}
- Tone: ${request.tone}
- ${request.platform === 'twitter' ? 'Must be under 280 characters' : 'Optimal length for LinkedIn engagement (1300-1600 characters)'}
- ${request.includeHashtags ? 'Include relevant hashtags' : 'Do not include hashtags'}
- Make it authentic and engaging
- Show gratitude and excitement appropriately
- Mention key skills or knowledge gained if applicable
- Encourage engagement from the audience

${request.customMessage ? `Additional context: ${request.customMessage}` : ''}

Format your response as:
Content: [the post content]
${request.includeHashtags ? 'Hashtags: [comma-separated hashtags]' : ''}`;

        return prompt;
    }

    /**
     * Parse the generated content from OpenAI response
     */
    private parseGeneratedContent(content: string, platform: 'linkedin' | 'twitter'): GeneratedPost {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        let postContent = '';
        let hashtags: string[] = [];

        for (const line of lines) {
            if (line.toLowerCase().startsWith('content:')) {
                postContent = line.replace(/^content:\s*/i, '').trim();
            } else if (line.toLowerCase().startsWith('hashtags:')) {
                const hashtagsText = line.replace(/^hashtags:\s*/i, '').trim();
                hashtags = hashtagsText
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag)
                    .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
            } else if (!postContent && line && !line.includes(':')) {
                // If no "Content:" prefix found, use the first substantial line
                postContent = line;
            }
        }

        // Fallback: use entire content if parsing failed
        if (!postContent) {
            postContent = content.trim();
            // Extract hashtags from content
            const hashtagMatches = postContent.match(/#\w+/g);
            if (hashtagMatches) {
                hashtags = hashtagMatches;
                // Remove hashtags from content if they're at the end
                postContent = postContent.replace(/\s*#\w+(\s*#\w+)*\s*$/, '').trim();
            }
        }

        // Ensure character limits
        if (platform === 'twitter') {
            const totalLength = postContent.length + hashtags.join(' ').length + 1;
            if (totalLength > 280) {
                const availableLength = 280 - hashtags.join(' ').length - 1;
                postContent = postContent.substring(0, Math.max(0, availableLength - 3)) + '...';
            }
        }

        return {
            content: postContent,
            hashtags,
            platform,
            characterCount: postContent.length + (hashtags.length > 0 ? hashtags.join(' ').length + 1 : 0)
        };
    }

    /**
     * Format certificate information for the prompt
     */
    private formatCertificateContent(certificate: Certificate): string {
        return `
Certificate: ${certificate.title}
Issuer: ${certificate.issuer}
Date: ${certificate.date}
Description: ${certificate.description}
Skills: ${certificate.skills.join(', ')}
    `.trim();
    }

    /**
     * Validate API key format
     */
    static validateApiKey(apiKey: string): boolean {
        return apiKey.startsWith('sk-') && apiKey.length > 20;
    }

    /**
     * Estimate token usage for a request
     */
    estimateTokens(request: PostGenerationRequest): number {
        const prompt = this.buildPrompt(request);
        const systemPrompt = this.getSystemPrompt(request.platform);

        // Rough estimation: ~4 characters per token
        const inputTokens = Math.ceil((prompt.length + systemPrompt.length) / 4);
        const outputTokens = request.platform === 'twitter' ? 50 : 100;

        return inputTokens + outputTokens;
    }

    /**
     * Get cost estimate for a request (in USD)
     */
    estimateCost(request: PostGenerationRequest): number {
        const tokens = this.estimateTokens(request);
        // GPT-4o-mini pricing: $0.00015 per 1K input tokens, $0.0006 per 1K output tokens
        const inputCost = (tokens * 0.7) * 0.00015 / 1000; // 70% input tokens
        const outputCost = (tokens * 0.3) * 0.0006 / 1000;  // 30% output tokens

        return inputCost + outputCost;
    }
}

/**
 * Helper function to create GPT service instance
 */
export function createGPTService(apiKey: string): GPTService {
    return new GPTService(apiKey);
}

/**
 * Helper function to get character limit for platform
 */
export function getCharacterLimit(platform: 'linkedin' | 'twitter'): number {
    return platform === 'twitter' ? 280 : 3000;
}

/**
 * Helper function to get optimal character count for platform
 */
export function getOptimalCharacterCount(platform: 'linkedin' | 'twitter'): number {
    return platform === 'twitter' ? 250 : 1500;
}