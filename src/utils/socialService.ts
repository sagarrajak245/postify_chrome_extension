/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ApiResponse, GeneratedPost, SocialPlatform } from '../types';
import { LinkedInOAuthService } from './linkedinOAuth';
import { TwitterAuthManager } from './twitterService';

export class SocialMediaService {
    private linkedinToken: string | null = null;
    private twitterClientId: string | null = null;
    private twitterClientSecret: string | null = null;
    private twitterAccessToken: string | null = null;
    private twitterRefreshToken: string | null = null;
    private twitterAuthManager: TwitterAuthManager | null = null;
    private linkedinOAuthService: LinkedInOAuthService | null = null;
    private linkedinAccessToken: string | null = null;

    constructor(linkedinToken?: string, twitterClientId?: string, twitterClientSecret?: string, twitterAccessToken?: string, twitterRefreshToken?: string, linkedinClientId?: string, linkedinClientSecret?: string) {
        this.linkedinToken = linkedinToken || null;
        this.twitterClientId = twitterClientId || null;
        this.twitterClientSecret = twitterClientSecret || null;
        this.twitterAccessToken = twitterAccessToken || null;
        this.twitterRefreshToken = twitterRefreshToken || null;
        if (twitterClientId && twitterClientSecret) {
            this.twitterAuthManager = new TwitterAuthManager({
                clientId: twitterClientId,
                clientSecret: twitterClientSecret,
                accessToken: twitterAccessToken,
                refreshToken: twitterRefreshToken,
            });
        }
        if (linkedinClientId && linkedinClientSecret) {
            this.linkedinOAuthService = new LinkedInOAuthService(linkedinClientId, linkedinClientSecret);
        }
        this.linkedinAccessToken = linkedinToken || null;
    }

    /**
     * Post to a specific social media platform
     */
    async postToSocial(
        platform: SocialPlatform,
        post: GeneratedPost
    ): Promise<ApiResponse<{ postId: string; url?: string }>> {
        switch (platform) {
            case 'linkedin':
                return this.postToLinkedIn(post);
            case 'twitter':
                return this.postToTwitter(post);
            default:
                return {
                    success: false,
                    error: `Unsupported platform: ${platform}`
                };
        }
    }

    /**
     * Post to LinkedIn
     */
    private async postToLinkedIn(post: GeneratedPost): Promise<ApiResponse<{ postId: string; url?: string }>> {
        try {
            if (!this.linkedinOAuthService) {
                return {
                    success: false,
                    error: 'LinkedIn not connected. Please provide LinkedIn Client ID and Secret and authenticate.'
                };
            }
            // Authenticate if needed
            if (!this.linkedinAccessToken) {
                const authResult = await this.linkedinOAuthService.authenticate();
                if (!authResult.success || !authResult.data?.token) {
                    return { success: false, error: authResult.error || 'LinkedIn authentication failed' };
                }
                this.linkedinAccessToken = authResult.data.token;
            }
            // Prepare post content
            const fullContent = post.hashtags.length > 0
                ? `${post.content}\n\n${post.hashtags.join(' ')}`
                : post.content;
            // Get user profile to get person URN
            const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
                headers: {
                    'Authorization': `Bearer ${this.linkedinAccessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!profileResponse.ok) {
                return { success: false, error: 'Failed to get LinkedIn profile' };
            }
            const profile = await profileResponse.json();
            const personUrn = profile.id;
            // Create the post
            const postData = {
                author: `urn:li:person:${personUrn}`,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                            text: fullContent
                        },
                        shareMediaCategory: 'NONE'
                    }
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
                }
            };
            const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.linkedinAccessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                },
                body: JSON.stringify(postData)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    error: `LinkedIn posting failed: ${response.status} - ${errorData.message || response.statusText}`
                };
            }
            const result = await response.json();
            const postId = result.id;
            return {
                success: true,
                data: {
                    postId,
                    url: `https://www.linkedin.com/feed/update/${postId}/`
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: error?.message || 'LinkedIn posting failed'
            };
        }
    }

    /**
     * Post to Twitter/X using OAuth 2.0 flow
     */
    async postToTwitter(post: GeneratedPost): Promise<ApiResponse<{ postId: string; url?: string }>> {
        try {
            if (!this.twitterAuthManager) {
                return {
                    success: false,
                    error: 'Twitter not connected. Please provide Twitter Client ID and Secret and authenticate.'
                };
            }
            if (!this.twitterAuthManager.isAuthenticated()) {
                // Start OAuth flow 
                const tokens = await this.twitterAuthManager.authenticate();
                this.twitterAccessToken = tokens.accessToken;
                this.twitterRefreshToken = tokens.refreshToken || null;
            }
            // Post the tweet
            const tweetText = post.hashtags.length > 0
                ? `${post.content} ${post.hashtags.join(' ')}`
                : post.content;
            const tweet = await this.twitterAuthManager.postTweet(tweetText);
            return {
                success: true,
                data: {
                    postId: tweet.id,
                    url: `https://twitter.com/i/web/status/${tweet.id}`
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: error?.message || 'Twitter posting failed'
            };
        }
    }

    /**
     * Authenticate with LinkedIn
     */
    async authenticateLinkedIn(): Promise<ApiResponse<{ token: string }>> {
        try {
            if (!this.linkedinOAuthService) {
                return {
                    success: false,
                    error: 'LinkedIn not connected. Please provide LinkedIn Client ID and Secret and authenticate.'
                };
            }
            // Authenticate if needed
            if (!this.linkedinAccessToken) {
                const authResult = await this.linkedinOAuthService.authenticate();
                if (!authResult.success || !authResult.data?.token) {
                    return { success: false, error: authResult.error || 'LinkedIn authentication failed' };
                }
                this.linkedinAccessToken = authResult.data.token;
            }
            return {
                success: true,
                data: { token: this.linkedinAccessToken || '' }
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'LinkedIn authentication failed'
            };
        }
    }

    /**
     * Authenticate with Twitter
     */
    async authenticateTwitter(): Promise<ApiResponse<{ token: string }>> {
        try {
            if (!this.twitterAuthManager) {
                return {
                    success: false,
                    error: 'Twitter not connected. Please provide Twitter Client ID and Secret and authenticate.'
                };
            }
            if (!this.twitterAuthManager.isAuthenticated()) {
                // Start OAuth flow
                const tokens = await this.twitterAuthManager.authenticate();
                this.twitterAccessToken = tokens.accessToken;
                this.twitterRefreshToken = tokens.refreshToken || null;
            }
            return {
                success: true,
                data: { token: this.twitterAccessToken || '' }
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Twitter authentication failed'
            };
        }
    }

    /**
     * Check if platform is connected
     */
    isConnected(platform: SocialPlatform): boolean {
        switch (platform) {
            case 'linkedin':
                return !!this.linkedinAccessToken; // Check for access token
            case 'twitter':
                return !!this.twitterAccessToken; // Check for access token
            default:
                return false;
        }
    }

    /**
     * Set authentication tokens
     */
    setTokens(linkedinToken?: string, twitterClientId?: string, twitterClientSecret?: string, twitterAccessToken?: string, twitterRefreshToken?: string): void {
        if (linkedinToken) this.linkedinToken = linkedinToken;
        if (twitterClientId) this.twitterClientId = twitterClientId;
        if (twitterClientSecret) this.twitterClientSecret = twitterClientSecret;
        if (twitterAccessToken) this.twitterAccessToken = twitterAccessToken;
        if (twitterRefreshToken) this.twitterRefreshToken = twitterRefreshToken;
        if (twitterClientId && twitterClientSecret) {
            this.twitterAuthManager = new TwitterAuthManager({
                clientId: twitterClientId,
                clientSecret: twitterClientSecret,
                accessToken: twitterAccessToken,
                refreshToken: twitterRefreshToken,
            });
        }
        if (linkedinToken) this.linkedinAccessToken = linkedinToken; // Update linkedinAccessToken
    }

    /**
     * Clear authentication tokens
     */
    clearTokens(platform?: SocialPlatform): void {
        if (!platform || platform === 'linkedin') {
            this.linkedinAccessToken = null;
            this.linkedinOAuthService = null; // Clear the service
        }
        if (!platform || platform === 'twitter') {
            this.twitterAccessToken = null;
            this.twitterRefreshToken = null;
            this.twitterAuthManager = null; // Clear the manager
        }
    }

    /**
     * Validate post for platform
     */
    validatePost(post: GeneratedPost, platform: SocialPlatform): { valid: boolean; error?: string } {
        const characterLimits = {
            linkedin: 3000,
            twitter: 280
        };

        const limit = characterLimits[platform];
        const totalLength = post.content.length + (post.hashtags.length > 0 ? post.hashtags.join(' ').length + 1 : 0);

        if (totalLength > limit) {
            return {
                valid: false,
                error: `Post exceeds ${platform} character limit (${totalLength}/${limit} characters)`
            };
        }

        if (!post.content.trim()) {
            return {
                valid: false,
                error: 'Post content cannot be empty'
            };
        }

        return { valid: true };
    }

    /**
     * Schedule post for later (placeholder for future implementation)
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async schedulePost(
        _platform: SocialPlatform,
        _post: GeneratedPost,
        _scheduledTime: Date
    ): Promise<ApiResponse<{ scheduleId: string }>> {
        // This would require a backend service to handle scheduled posts
        return {
            success: false,
            error: 'Post scheduling not yet implemented. This requires a backend service.'
        };
    }

    /**
     * Get platform-specific posting guidelines
     */
    getPostingGuidelines(platform: SocialPlatform): {
        characterLimit: number;
        optimalLength: number;
        hashtagLimit: number;
        bestTimes: string[];
    } {
        const guidelines = {
            linkedin: {
                characterLimit: 3000,
                optimalLength: 1500,
                hashtagLimit: 5,
                bestTimes: ['Tuesday-Thursday 8-10 AM', 'Tuesday-Thursday 12-2 PM']
            },
            twitter: {
                characterLimit: 280,
                optimalLength: 250,
                hashtagLimit: 3,
                bestTimes: ['Monday-Friday 9 AM', 'Monday-Friday 1-3 PM']
            }
        };

        return guidelines[platform];
    }
}

/**
 * Helper function to create social media service instance
 */
export function createSocialMediaService(linkedinToken?: string, twitterClientId?: string, twitterClientSecret?: string, twitterAccessToken?: string, twitterRefreshToken?: string): SocialMediaService {
    return new SocialMediaService(linkedinToken, twitterClientId, twitterClientSecret, twitterAccessToken, twitterRefreshToken);
}

/**
 * Helper function to format post content with hashtags
 */
export function formatPostContent(post: GeneratedPost): string {
    return post.hashtags.length > 0
        ? `${post.content}\n\n${post.hashtags.join(' ')}`
        : post.content;
}

/**
 * Helper function to truncate post content to fit platform limits
 */
export function truncatePostContent(
    content: string,
    hashtags: string[],
    platform: SocialPlatform
): string {
    const limits = { linkedin: 3000, twitter: 280 };
    const limit = limits[platform];
    const hashtagsText = hashtags.join(' ');
    const availableLength = limit - hashtagsText.length - (hashtags.length > 0 ? 2 : 0); // 2 for \n\n

    if (content.length <= availableLength) {
        return content;
    }

    return content.substring(0, availableLength - 3) + '...';
}