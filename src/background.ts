import type { AuthState, BackgroundResponse, ChromeMessage, EmailMessage } from './types';

// Background script for Chrome extension
console.log('Postify background script loaded');

// Install event
chrome.runtime.onInstalled.addListener(() => {
    console.log('Postify extension installed');

    // Initialize default storage
    initializeStorage();
});

// Message handler for communication with popup
chrome.runtime.onMessage.addListener((
    request: ChromeMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: BackgroundResponse) => void
) => {
    console.log('Background received message:', request);

    switch (request.action) {
        case 'authenticate':
            handleAuthentication()
                .then(sendResponse)
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Keep message channel open for async response

        case 'scanGmail':
            handleGmailScan()
                .then(sendResponse)
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'getAuthState':
            getAuthState()
                .then(sendResponse)
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'logout':
            handleLogout()
                .then(sendResponse)
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

// Initialize storage with default values
async function initializeStorage(): Promise<void> {
    try {
        const result = await chrome.storage.sync.get(['authState', 'settings']);

        if (!result.authState) {
            const defaultAuthState: AuthState = {
                isAuthenticated: false,
                user: null,
                googleToken: null,
                linkedinToken: null,
                twitterToken: null,
            };
            await chrome.storage.sync.set({ authState: defaultAuthState });
        }

        if (!result.settings) {
            const defaultSettings = {
                openaiApiKey: '',
                defaultTone: 'professional',
                autoScan: false,
                scanInterval: 60,
                defaultPlatforms: ['linkedin'],
                notifications: true,
            };
            await chrome.storage.sync.set({ settings: defaultSettings });
        }
    } catch (error) {
        console.error('Error initializing storage:', error);
    }
}

// Handle Google OAuth authentication
async function handleAuthentication(): Promise<BackgroundResponse> {
    try {
        console.log('Starting authentication...');

        // Get OAuth token
        const token = await chrome.identity.getAuthToken({
            interactive: true,
            scopes: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile'
            ]
        });

        if (!token) {
            throw new Error('Failed to get authentication token');
        }

        console.log('Got token, fetching user info...');

        // Get user information
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch user information');
        }

        const userInfo = await userInfoResponse.json();
        console.log('User info received:', userInfo);

        // Update auth state in storage
        const authState: AuthState = {
            isAuthenticated: true,
            user: {
                id: userInfo.sub,
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
            },
            googleToken: token as string,
            linkedinToken: null,
            twitterToken: null,
        };

        await chrome.storage.sync.set({ authState });

        return {
            success: true,
            data: { user: authState.user, token }
        };
    } catch (error) {
        console.error('Authentication error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Authentication failed'
        };
    }
}

// Handle Gmail scanning for certificates
async function handleGmailScan(): Promise<BackgroundResponse> {
    try {
        console.log('Starting Gmail scan...');

        // Get current auth state
        const result = await chrome.storage.sync.get(['authState']);
        const authState: AuthState = result.authState;

        if (!authState?.isAuthenticated || !authState.googleToken) {
            throw new Error('User not authenticated');
        }

        // Search for certificate-related emails
        const searchQuery = 'certificate OR certification OR "course completion" OR "training completed" OR diploma OR achievement';
        const gmailApiUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=20`;

        const response = await fetch(gmailApiUrl, {
            headers: { Authorization: `Bearer ${authState.googleToken}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired, clear auth state
                await handleLogout();
                throw new Error('Authentication expired. Please log in again.');
            }
            throw new Error(`Gmail API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Gmail search results:', data);

        if (!data.messages || data.messages.length === 0) {
            return {
                success: true,
                data: { messages: [], count: 0 }
            };
        }

        // Get detailed information for each message
        const messagePromises = data.messages.slice(0, 10).map((msg: { id: string }) =>
            getMessageDetails(msg.id, authState.googleToken!)
        );

        const messages = await Promise.all(messagePromises);
        const validMessages = messages.filter(msg => msg !== null) as EmailMessage[];

        // Store certificates in storage
        const certificates = validMessages.map(msg => ({
            id: msg.id,
            title: extractCertificateTitle(msg.subject),
            issuer: extractIssuer(msg.from),
            date: msg.date,
            description: msg.snippet,
            skills: extractSkills(msg.body),
            emailId: msg.id,
        }));

        // Save to storage
        const existingData = await chrome.storage.sync.get(['certificates']);
        const existingCertificates = existingData.certificates || [];

        // Merge with existing certificates (avoid duplicates)
        const mergedCertificates = [...existingCertificates];
        certificates.forEach(newCert => {
            const existingIndex = mergedCertificates.findIndex(cert => cert.emailId === newCert.emailId);
            if (existingIndex >= 0) {
                mergedCertificates[existingIndex] = newCert;
            } else {
                mergedCertificates.push(newCert);
            }
        });

        await chrome.storage.sync.set({ certificates: mergedCertificates });

        return {
            success: true,
            data: {
                messages: validMessages,
                certificates: certificates,
                count: certificates.length
            }
        };
    } catch (error) {
        console.error('Gmail scan error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gmail scan failed'
        };
    }
}

// Get detailed message information
async function getMessageDetails(messageId: string, token: string): Promise<EmailMessage | null> {
    try {
        const response = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        if (!response.ok) {
            console.error(`Failed to get message ${messageId}:`, response.status);
            return null;
        }

        const message = await response.json();
        const headers = message.payload.headers;

        return {
            id: messageId,
            subject: getHeaderValue(headers, 'Subject') || '',
            body: extractEmailBody(message.payload),
            date: getHeaderValue(headers, 'Date') || '',
            from: getHeaderValue(headers, 'From') || '',
            snippet: message.snippet || '',
        };
    } catch (error) {
        console.error(`Error getting message details for ${messageId}:`, error);
        return null;
    }
}

// Helper function to get header value
function getHeaderValue(headers: Array<{ name: string; value: string }>, name: string): string | null {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : null;
}

// Extract email body from payload
function extractEmailBody(payload: Record<string, unknown>): string {
    // Type guard for body structure
    const body = payload.body as { data?: string } | undefined;
    if (body?.data) {
        return decodeBase64(body.data);
    }

    // Type guard for parts structure
    const parts = payload.parts as Array<{
        mimeType?: string;
        body?: { data?: string };
    }> | undefined;

    if (parts && Array.isArray(parts)) {
        for (const part of parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
                return decodeBase64(part.body.data);
            }
        }

        // Try HTML if plain text not found
        for (const part of parts) {
            if (part.mimeType === 'text/html' && part.body?.data) {
                return decodeBase64(part.body.data);
            }
        }
    }

    return '';
}

// Decode base64 URL-safe string
function decodeBase64(data: string): string {
    try {
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        return atob(base64);
    } catch (error) {
        console.error('Error decoding base64:', error);
        return '';
    }
}

// Extract certificate title from subject
function extractCertificateTitle(subject: string): string {
    // Remove common prefixes and clean up
    const cleaned = subject
        .replace(/^(Re:|Fwd?:|Congratulations!?)/i, '')
        .replace(/certificate of completion/i, '')
        .replace(/you have completed/i, '')
        .trim();

    return cleaned || 'Certificate';
}

// Extract issuer from email address
function extractIssuer(from: string): string {
    // Extract domain or organization name
    const emailMatch = from.match(/<(.+@(.+))>/);
    if (emailMatch) {
        const domain = emailMatch[2];
        return domain.split('.')[0].replace(/^\w/, c => c.toUpperCase());
    }

    // Try to extract name before email
    const nameMatch = from.match(/^([^<]+)</);
    if (nameMatch) {
        return nameMatch[1].trim();
    }

    return from;
}

// Extract skills from email body
function extractSkills(body: string): string[] {
    const skills: string[] = [];
    const skillKeywords = [
        'javascript', 'python', 'react', 'node.js', 'aws', 'docker', 'kubernetes',
        'machine learning', 'data science', 'sql', 'mongodb', 'typescript',
        'project management', 'agile', 'scrum', 'leadership', 'communication'
    ];

    const lowerBody = body.toLowerCase();
    skillKeywords.forEach(skill => {
        if (lowerBody.includes(skill)) {
            skills.push(skill);
        }
    });

    return skills.slice(0, 5); // Limit to 5 skills
}

// Get current auth state
async function getAuthState(): Promise<BackgroundResponse> {
    try {
        const result = await chrome.storage.sync.get(['authState']);
        return {
            success: true,
            data: result.authState || {
                isAuthenticated: false,
                user: null,
                googleToken: null,
                linkedinToken: null,
                twitterToken: null,
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get auth state'
        };
    }
}

// Handle logout
async function handleLogout(): Promise<BackgroundResponse> {
    try {
        // Get current token
        const result = await chrome.storage.sync.get(['authState']);
        const authState: AuthState = result.authState;

        if (authState?.googleToken) {
            // Revoke the token
            try {
                await chrome.identity.removeCachedAuthToken({ token: authState.googleToken });
            } catch (error) {
                console.warn('Error removing cached token:', error);
            }
        }

        // Clear auth state
        const clearedAuthState: AuthState = {
            isAuthenticated: false,
            user: null,
            googleToken: null,
            linkedinToken: null,
            twitterToken: null,
        };

        await chrome.storage.sync.set({ authState: clearedAuthState });

        return { success: true, data: null };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Logout failed'
        };
    }
}

// Periodic Gmail scanning (if enabled)
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'gmailScan') {
        console.log('Periodic Gmail scan triggered');

        const result = await chrome.storage.sync.get(['settings', 'authState']);
        const settings = result.settings;
        const authState = result.authState;

        if (settings?.autoScan && authState?.isAuthenticated) {
            await handleGmailScan();
        }
    }
});

// Set up periodic scanning if enabled
chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
        const newSettings = changes.settings.newValue;
        if (newSettings?.autoScan) {
            chrome.alarms.create('gmailScan', {
                delayInMinutes: newSettings.scanInterval || 60,
                periodInMinutes: newSettings.scanInterval || 60
            });
        } else {
            chrome.alarms.clear('gmailScan');
        }
    }
});