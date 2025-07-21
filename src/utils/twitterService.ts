
interface TwitterCredentials {
    clientId: string;
    clientSecret: string;
    accessToken?: string;
    refreshToken?: string;
}

export class TwitterService {
    private credentials: TwitterCredentials;
    private baseUrl = 'https://api.twitter.com/2';

    constructor(credentials: TwitterCredentials) {
        this.credentials = credentials;
    }

    async initiateOAuth(): Promise<{ authUrl: string; codeVerifier: string }> {
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        const redirectUri = chrome.identity.getRedirectURL();
        const state = this.generateRandomString(32);
        const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', this.credentials.clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', 'tweet.read tweet.write users.read');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        return { authUrl: authUrl.toString(), codeVerifier };
    }

    async exchangeCodeForToken(code: string, codeVerifier: string): Promise<{
        accessToken: string;
        refreshToken?: string;
        expiresIn: number;
    }> {
        const redirectUri = chrome.identity.getRedirectURL();
        const response = await fetch('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(`${this.credentials.clientId}:${this.credentials.clientSecret}`)}`,
            },
            body: new URLSearchParams({
                code,
                grant_type: 'authorization_code',
                client_id: this.credentials.clientId,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier,
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Twitter OAuth error: ${error.error_description || error.error}`);
        }
        const data = await response.json();
        this.credentials.accessToken = data.access_token;
        this.credentials.refreshToken = data.refresh_token;
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
        };
    }

    async postTweet(content: string): Promise<{ id: string; text: string }> {
        if (!this.credentials.accessToken) {
            throw new Error('Not authenticated. Please authenticate with Twitter first.');
        }
        const tweetText = content.length > 280 ? content.substring(0, 277) + '...' : content;
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
        if (!response.ok) {
            const error = await response.json();
            if (response.status === 401 && this.credentials.refreshToken) {
                await this.refreshAccessToken();
                return this.postTweet(content);
            }
            throw new Error(`Twitter API error: ${error.detail || error.title || 'Unknown error'}`);
        }
        const data = await response.json();
        return data.data;
    }

    async refreshAccessToken(): Promise<void> {
        if (!this.credentials.refreshToken) {
            throw new Error('No refresh token available');
        }
        const response = await fetch('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(`${this.credentials.clientId}:${this.credentials.clientSecret}`)}`,
            },
            body: new URLSearchParams({
                refresh_token: this.credentials.refreshToken,
                grant_type: 'refresh_token',
                client_id: this.credentials.clientId,
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Token refresh error: ${error.error_description || error.error}`);
        }
        const data = await response.json();
        this.credentials.accessToken = data.access_token;
        if (data.refresh_token) {
            this.credentials.refreshToken = data.refresh_token;
        }
    }

    async getUserInfo(): Promise<{ id: string; name: string; username: string }> {
        if (!this.credentials.accessToken) {
            throw new Error('Not authenticated');
        }
        const response = await fetch(`${this.baseUrl}/users/me`, {
            headers: {
                'Authorization': `Bearer ${this.credentials.accessToken}`,
            },
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Twitter API error: ${error.detail || error.title || 'Unknown error'}`);
        }
        const data = await response.json();
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

export function createTwitterService(credentials: TwitterCredentials): TwitterService {
    return new TwitterService(credentials);
}

export class TwitterAuthManager {
    private service: TwitterService;
    constructor(credentials: TwitterCredentials) {
        this.service = new TwitterService(credentials);
    }
    async authenticate(): Promise<{ accessToken: string; refreshToken?: string }> {
        return new Promise(async (resolve, reject) => {
            try {
                const { authUrl, codeVerifier } = await this.service.initiateOAuth();
                chrome.identity.launchWebAuthFlow({
                    url: authUrl,
                    interactive: true,
                }, async (responseUrl) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    if (!responseUrl) {
                        reject(new Error('Authentication cancelled'));
                        return;
                    }
                    try {
                        const url = new URL(responseUrl);
                        const code = url.searchParams.get('code');
                        const error = url.searchParams.get('error');
                        if (error) {
                            reject(new Error(`Authentication error: ${error}`));
                            return;
                        }
                        if (!code) {
                            reject(new Error('No authorization code received'));
                            return;
                        }
                        const tokens = await this.service.exchangeCodeForToken(code, codeVerifier);
                        resolve(tokens);
                    } catch (error) {
                        reject(error);
                    }
                });
            } catch (error) {
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
} 