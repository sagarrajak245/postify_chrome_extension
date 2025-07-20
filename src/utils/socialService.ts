import type { ApiResponse, GeneratedPost, SocialPlatform } from '../types';

export class SocialMediaService {
    private linkedinToken: string | null = null;
    private twitterToken: string | null = null;

    constructor(linkedinToken?: string, twitterToken?: string) {
        this.linkedinToken = linkedinToken || null;
        this.twitterToken = twitterToken || null;
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
            if (!this.linkedinToken) {
                return {
                    success: false,
                    error: 'LinkedIn not connected. Please authenticate with LinkedIn first.'
                };
            }

            // Get user profile first to get the person URN
            const profileResponse = await fetch('https://api.linkedin.com/v2/people/~', {
                headers: {
                    'Authorization': `Bearer ${this.linkedinToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!profileResponse.ok) {
                return {
                    success: false,
                    error: `LinkedIn authentication failed: ${profileResponse.status}`
                };
            }

            const profile = await profileResponse.json();
            const personUrn = profile.id;

            // Prepare the post content
            const fullContent = post.hashtags.length > 0
                ? `${post.content}\n\n${post.hashtags.join(' ')}`
                : post.content;

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
                    'Authorization': `Bearer ${this.linkedinToken}`,
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
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'LinkedIn posting failed'
            };
        }
    }

    /**
     * Post to Twitter/X
     */
    private async postToTwitter(post: GeneratedPost): Promise<ApiResponse<{ postId: string; url?: string }>> {
        try {
            if (!this.twitterToken) {
                return {
                    success: false,
                    error: 'Twitter not connected. Please authenticate with Twitter first.'
                };
            }

            // Prepare the post content
            const fullContent = post.hashtags.length > 0
                ? `${post.content} ${post.hashtags.join(' ')}`
                : post.content;

            // Ensure character limit
            if (fullContent.length > 280) {
                return {
                    success: false,
                    error: 'Post exceeds Twitter character limit (280 characters)'
                };
            }

            const postData = {
                text: fullContent
            };

            const response = await fetch('https://api.twitter.com/2/tweets', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.twitterToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    error: `Twitter posting failed: ${response.status} - ${errorData.title || response.statusText}`
                };
            }

            const result = await response.json();
            const postId = result.data.id;
            const username = await this.getTwitterUsername();

            return {
                success: true,
                data: {
                    postId,
                    url: username ? `https://twitter.com/${username}/status/${postId}` : undefined
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Twitter posting failed'
            };
        }
    }

    /**
     * Get Twitter username for URL generation
     */
    private async getTwitterUsername(): Promise<string | null> {
        try {
            if (!this.twitterToken) return null;

            const response = await fetch('https://api.twitter.com/2/users/me', {
                headers: {
                    'Authorization': `Bearer ${this.twitterToken}`
                }
            });

            if (!response.ok) return null;

            const data = await response.json();
            return data.data?.username || null;
        } catch {
            return null;
        }
    }

    /**
     * Authenticate with LinkedIn
     */
    async authenticateLinkedIn(): Promise<ApiResponse<{ token: string }>> {
        try {
            // This would typically use OAuth flow
            // For Chrome extension, we'd need to implement OAuth with redirect handling
            return {
                success: false,
                error: 'LinkedIn authentication not yet implemented. This requires OAuth setup.'
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
            // This would typically use OAuth flow
            // For Chrome extension, we'd need to implement OAuth with redirect handling
            return {
                success: false,
                error: 'Twitter authentication not yet implemented. This requires OAuth setup.'
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
                return !!this.linkedinToken;
            case 'twitter':
                return !!this.twitterToken;
            default:
                return false;
        }
    }

    /**
     * Set authentication tokens
     */
    setTokens(linkedinToken?: string, twitterToken?: string): void {
        if (linkedinToken) this.linkedinToken = linkedinToken;
        if (twitterToken) this.twitterToken = twitterToken;
    }

    /**
     * Clear authentication tokens
     */
    clearTokens(platform?: SocialPlatform): void {
        if (!platform || platform === 'linkedin') {
            this.linkedinToken = null;
        }
        if (!platform || platform === 'twitter') {
            this.twitterToken = null;
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
export function createSocialMediaService(linkedinToken?: string, twitterToken?: string): SocialMediaService {
    return new SocialMediaService(linkedinToken, twitterToken);
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