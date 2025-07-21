/* eslint-disable no-async-promise-executor */
interface TwitterCredentials {
    clientId: string;
    clientSecret: string;
    accessToken?: string;
    refreshToken?: string;
}

export class TwitterService {
    private credentials: TwitterCredentials;
    private baseUrl = 'https://api.x.com/2';
    private authUrl = 'https://x.com/i/oauth2/authorize';
    private tokenUrl = 'https://api.x.com/2/oauth2/token';

    // Fixed redirect URI for your extension
    private readonly EXTENSION_ID = 'jfjekphanneginmbhepnlfgnaeicihop';
    private readonly REDIRECT_URI = `https://${this.EXTENSION_ID}.chromiumapp.org/twitter_cb`;

    constructor(credentials: TwitterCredentials) {
        this.credentials = credentials;
    }

    getRedirectUri(): string {
        return this.REDIRECT_URI;
    }

    async initiateOAuth(): Promise<{ authUrl: string; codeVerifier: string; state: string }> {
        console.log('🐦 Starting Twitter OAuth flow...');
        console.log('📍 Using Redirect URI:', this.REDIRECT_URI);

        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        const state = this.generateRandomString(32);

        // Build the authorization URL
        const authUrl = new URL(this.authUrl);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', this.credentials.clientId);
        authUrl.searchParams.set('redirect_uri', this.REDIRECT_URI);
        authUrl.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');

        console.log('🔗 Authorization URL:', authUrl.toString());
        console.log('🔑 Code Verifier (length):', codeVerifier.length);
        console.log('🎯 State:', state);

        return {
            authUrl: authUrl.toString(),
            codeVerifier,
            state
        };
    }

    async exchangeCodeForToken(code: string, codeVerifier: string): Promise<{
        accessToken: string;
        refreshToken?: string;
        expiresIn: number;
    }> {
        console.log('🔄 Exchanging authorization code for tokens...');
        console.log('📝 Code (first 10 chars):', code.substring(0, 10) + '...');

        const body = new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            client_id: this.credentials.clientId,
            redirect_uri: this.REDIRECT_URI,
            code_verifier: codeVerifier,
        });

        console.log('📤 Token request details:');
        console.log('  - Endpoint:', this.tokenUrl);
        console.log('  - Grant type:', 'authorization_code');
        console.log('  - Client ID:', this.credentials.clientId.substring(0, 10) + '...');
        console.log('  - Redirect URI:', this.REDIRECT_URI);

        const response = await fetch(this.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body,
        });

        console.log('📥 Token response status:', response.status);
        console.log('📥 Token response headers:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('📥 Raw response:', responseText);

        if (!response.ok) {
            let error;
            try {
                error = JSON.parse(responseText);
            } catch {
                error = { error: 'parse_error', error_description: responseText };
            }
            console.error('❌ Token exchange error:', error);
            throw new Error(`Twitter OAuth error: ${error.error_description || error.error || responseText}`);
        }

        const data = JSON.parse(responseText);
        console.log('✅ Token exchange successful!');
        console.log('  - Has access token:', !!data.access_token);
        console.log('  - Has refresh token:', !!data.refresh_token);
        console.log('  - Expires in:', data.expires_in, 'seconds');

        // Store tokens
        this.credentials.accessToken = data.access_token;
        this.credentials.refreshToken = data.refresh_token;

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
        };
    }

    async postTweet(content: string): Promise<{ id: string; text: string }> {
        console.log('🐦 Posting tweet...');

        if (!this.credentials.accessToken) {
            throw new Error('Not authenticated. Please authenticate with Twitter first.');
        }

        const tweetText = content.length > 280 ? content.substring(0, 277) + '...' : content;
        console.log('📝 Tweet content:', tweetText);

        const response = await fetch(`${this.baseUrl}/tweets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.credentials.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: tweetText,
            }),
        });

        console.log('📥 Tweet response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Tweet post error:', errorText);

            let error;
            try {
                error = JSON.parse(errorText);
            } catch {
                error = { error: 'parse_error', detail: errorText };
            }

            // Try to refresh token if we get 401
            if (response.status === 401 && this.credentials.refreshToken) {
                console.log('🔄 Access token expired, trying to refresh...');
                try {
                    await this.refreshAccessToken();
                    return this.postTweet(content); // Retry after refresh
                } catch (refreshError) {
                    console.error('❌ Token refresh failed:', refreshError);
                    throw new Error('Authentication expired and refresh failed');
                }
            }

            throw new Error(`Twitter API error: ${error.detail || error.title || error.error || 'Unknown error'}`);
        }

        const data = await response.json();
        console.log('✅ Tweet posted successfully:', data.data);
        return data.data;
    }

    async refreshAccessToken(): Promise<void> {
        console.log('🔄 Refreshing access token...');

        if (!this.credentials.refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await fetch(this.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                refresh_token: this.credentials.refreshToken,
                grant_type: 'refresh_token',
                client_id: this.credentials.clientId,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Token refresh error:', error);
            throw new Error(`Token refresh error: ${error.error_description || error.error}`);
        }

        const data = await response.json();
        console.log('✅ Token refreshed successfully');

        this.credentials.accessToken = data.access_token;
        if (data.refresh_token) {
            this.credentials.refreshToken = data.refresh_token;
        }
    }

    async getUserInfo(): Promise<{ id: string; name: string; username: string }> {
        console.log('👤 Fetching user info...');

        if (!this.credentials.accessToken) {
            throw new Error('Not authenticated');
        }

        const url = `${this.baseUrl}/users/me`;
        const authHeader = `Bearer ${this.credentials.accessToken}`;

        console.log('🔗 Making request to:', url);
        console.log('🔑 Authorization header (first 30 chars):', authHeader.substring(0, 30) + '...');
        console.log('🔑 Token length:', this.credentials.accessToken.length);
        console.log('🔑 Token starts with:', this.credentials.accessToken.substring(0, 10));

        const response = await fetch(url, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json', // Add this header
            },
        });

        console.log('📥 User info response status:', response.status);
        console.log('📥 User info response headers:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('📥 Raw user info response:', responseText);

        if (!response.ok) {
            let error;
            try {
                error = JSON.parse(responseText);
            } catch {
                error = { error: 'parse_error', detail: responseText };
            }
            console.error('❌ User info error:', error);
            throw new Error(`Twitter API error: ${error.detail || error.title || error.error || 'Unknown error'}`);
        }

        const data = JSON.parse(responseText);
        console.log('✅ User info retrieved:', data.data);
        return data.data;
    }

    isAuthenticated(): boolean {
        return !!this.credentials.accessToken;
    }

    private generateCodeVerifier(): string {
        return this.generateRandomString(128);
    }

    private async generateCodeChallenge(verifier: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    private generateRandomString(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

export class TwitterAuthManager {
    private service: TwitterService;

    constructor(credentials: TwitterCredentials) {
        this.service = new TwitterService(credentials);
    }

    async authenticate(): Promise<{ accessToken: string; refreshToken?: string }> {
        console.log('🚀 Starting Twitter authentication for Chrome Extension...');

        return new Promise(async (resolve, reject) => {
            try {
                const { authUrl, codeVerifier, state } = await this.service.initiateOAuth();

                console.log('🌐 Launching Chrome identity web auth flow...');
                console.log('🔗 Auth URL:', authUrl);

                chrome.identity.launchWebAuthFlow({
                    url: authUrl,
                    interactive: true,
                }, async (responseUrl) => {
                    console.log('📥 Chrome identity callback triggered');
                    console.log('📥 Response URL:', responseUrl);

                    if (chrome.runtime.lastError) {
                        console.error('❌ Chrome runtime error:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }

                    if (!responseUrl) {
                        console.log('❌ No response URL - user likely cancelled');
                        reject(new Error('Authentication cancelled'));
                        return;
                    }

                    try {
                        const url = new URL(responseUrl);
                        const code = url.searchParams.get('code');
                        const error = url.searchParams.get('error');
                        const returnedState = url.searchParams.get('state');

                        console.log('🔍 Parsing response URL:');
                        console.log('  - Has code:', !!code);
                        console.log('  - Error:', error);
                        console.log('  - State matches:', returnedState === state);

                        if (error) {
                            const errorDescription = url.searchParams.get('error_description');
                            reject(new Error(`OAuth error: ${error} - ${errorDescription}`));
                            return;
                        }

                        if (!code) {
                            reject(new Error('No authorization code received'));
                            return;
                        }

                        if (returnedState !== state) {
                            reject(new Error('State parameter mismatch - possible CSRF attack'));
                            return;
                        }

                        console.log('✅ Authorization code received, exchanging for tokens...');
                        const tokens = await this.service.exchangeCodeForToken(code, codeVerifier);

                        console.log('🎉 Twitter authentication completed successfully!');
                        resolve(tokens);

                    } catch (error) {
                        console.error('❌ Error processing OAuth response:', error);
                        reject(error);
                    }
                });
            } catch (error) {
                console.error('❌ Error initiating OAuth:', error);
                reject(error);
            }
        });
    }

    async postTweet(content: string): Promise<{ id: string; text: string }> {
        return this.service.postTweet(content);
    }

    isAuthenticated(): boolean {
        return this.service.isAuthenticated();
    }

    async getUserInfo(): Promise<{ id: string; name: string; username: string }> {
        return this.service.getUserInfo();
    }

    getRedirectUri(): string {
        return this.service.getRedirectUri();
    }
}