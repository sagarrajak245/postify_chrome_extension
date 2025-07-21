/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ApiResponse } from '../types';
import { storage } from './storage';

export class LinkedInOAuthService {
    private clientId: string;
    private clientSecret: string;
    private redirectUri: string;
    private scope = 'r_liteprofile r_emailaddress w_member_social';

    constructor(clientId: string, clientSecret: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = chrome.identity.getRedirectURL();
    }

    /**
     * Start LinkedIn OAuth flow
     */
    async authenticate(): Promise<ApiResponse<{ token: string; user: any }>> {
        try {
            if (!this.clientId || !this.clientSecret) {
                return {
                    success: false,
                    error: 'LinkedIn Client ID and Secret are required. Please configure them in Settings.'
                };
            }

            // Step 1: Get authorization code
            const authUrl = this.buildAuthUrl();

            const responseUrl = await chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true
            });

            if (!responseUrl) {
                return {
                    success: false,
                    error: 'LinkedIn authentication was cancelled'
                };
            }

            // Step 2: Extract authorization code from response
            const code = this.extractCodeFromUrl(responseUrl);
            if (!code) {
                return {
                    success: false,
                    error: 'Failed to get authorization code from LinkedIn'
                };
            }

            // Step 3: Exchange code for access token
            const tokenResponse = await this.exchangeCodeForToken(code);
            if (!tokenResponse.success || !tokenResponse.data) {
                return {
                    success: false,
                    error: tokenResponse.error || 'Failed to exchange authorization code for access token'
                };
            }

            const { access_token } = tokenResponse.data;

            // Step 4: Get user profile
            const userResponse = await this.getUserProfile(access_token);
            if (!userResponse.success) {
                return userResponse;
            }

            // Step 5: Store token in auth state
            const authState = await storage.getAuthState();
            await storage.setAuthState({
                ...authState,
                linkedinToken: access_token
            });

            return {
                success: true,
                data: {
                    token: access_token,
                    user: userResponse.data
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'LinkedIn authentication failed'
            };
        }
    }

    /**
     * Build LinkedIn authorization URL
     */
    private buildAuthUrl(): string {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: this.scope,
            state: this.generateState()
        });

        return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    }

    /**
     * Extract authorization code from redirect URL
     */
    private extractCodeFromUrl(url: string): string | null {
        try {
            const urlObj = new URL(url);
            return urlObj.searchParams.get('code');
        } catch {
            return null;
        }
    }

    /**
     * Exchange authorization code for access token
     */
    private async exchangeCodeForToken(code: string): Promise<ApiResponse<{ access_token: string; expires_in: number }>> {
        try {
            const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: this.redirectUri,
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    error: `LinkedIn token exchange failed: ${errorData.error_description || response.statusText}`
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    access_token: data.access_token,
                    expires_in: data.expires_in
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Token exchange failed'
            };
        }
    }

    /**
     * Get LinkedIn user profile
     */
    private async getUserProfile(accessToken: string): Promise<ApiResponse<any>> {
        try {
            // Updated endpoint to use v2 API with proper fields
            const response = await fetch('https://api.linkedin.com/v2/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                return {
                    success: false,
                    error: `Failed to get LinkedIn profile: ${response.statusText}`
                };
            }

            const profile = await response.json();
            return {
                success: true,
                data: profile
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get user profile'
            };
        }
    }

    /**
     * Generate random state for OAuth security
     */
    private generateState(): string {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }

    /**
     * Check if user is authenticated with LinkedIn
     */
    async isAuthenticated(): Promise<boolean> {
        try {
            const authState = await storage.getAuthState();
            return !!authState.linkedinToken;
        } catch {
            return false;
        }
    }

    /**
     * Logout from LinkedIn
     */
    async logout(): Promise<void> {
        try {
            const authState = await storage.getAuthState();
            await storage.setAuthState({
                ...authState,
                linkedinToken: null
            });
        } catch (error) {
            console.error('Failed to logout from LinkedIn:', error);
        }
    }

    /**
     * Get current LinkedIn token
     */
    async getToken(): Promise<string | null> {
        try {
            const authState = await storage.getAuthState();
            return authState.linkedinToken;
        } catch {
            return null;
        }
    }
}

/**
 * Create LinkedIn OAuth service instance
 */
export async function createLinkedInOAuthService(): Promise<LinkedInOAuthService | null> {
    try {
        const settings = await storage.getSettings();

        if (!settings.linkedinClientId || !settings.linkedinClientSecret) {
            console.warn('LinkedIn credentials not configured');
            return null;
        }

        return new LinkedInOAuthService(
            settings.linkedinClientId,
            settings.linkedinClientSecret
        );
    } catch (error) {
        console.error('Failed to create LinkedIn OAuth service:', error);
        return null;
    }
}