

console.log('Postify background script loaded');

// Install event
chrome.runtime.onInstalled.addListener(() => {
    console.log('Postify extension installed');
    initializeStorage();
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    console.log('Background received message:', request);
    switch (request.action) {
        case 'authenticate':
            handleAuthentication()
                .then(sendResponse)
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
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

async function initializeStorage() {
    try {
        const result = await chrome.storage.sync.get(['authState', 'settings']);
        if (!result.authState) {
            const defaultAuthState = {
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

async function handleAuthentication() {
    try {
        console.log('🔐 Starting authentication...');
        console.log('Extension ID:', chrome.runtime.id);

        // Clear any existing cached tokens first
        await clearCachedTokens();

        // Step 1: Get the auth token
        console.log('📝 Requesting auth token...');
        const tokenObj = await chrome.identity.getAuthToken({
            interactive: true,
            scopes: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile'
            ]
        });
        console.log('Token received:', tokenObj, typeof tokenObj);
        let token;
        if (typeof tokenObj === 'string') {
            token = tokenObj;
        } else if (tokenObj && typeof tokenObj === 'object' && tokenObj.token) {
            token = tokenObj.token;
        } else {
            throw new Error('Failed to get authentication token');
        }
        console.log('✅ Token received (length:', token.length, ')');
        console.log('Token starts with:', token.substring(0, 20) + '...');

        // Step 2: Test the token with a simple API call first
        console.log('🔍 Testing token validity...');

        const testResponse = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Token test response status:', testResponse.status);

        if (!testResponse.ok) {
            const errorText = await testResponse.text();
            console.error('❌ Token validation failed:', testResponse.status, errorText);
            throw new Error(`Token validation failed: ${testResponse.status} ${errorText}`);
        }

        const tokenInfo = await testResponse.json();
        console.log('✅ Token info:', tokenInfo);

        // Step 3: Get user information
        console.log('👤 Fetching user info...');

        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        console.log('User info response status:', userInfoResponse.status);
        console.log('User info response headers:', Object.fromEntries(userInfoResponse.headers.entries()));

        if (!userInfoResponse.ok) {
            const errorText = await userInfoResponse.text();
            console.error('❌ User info fetch failed:', userInfoResponse.status, errorText);

            // Try alternative endpoint
            console.log('🔄 Trying alternative userinfo endpoint...');
            const altResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            console.log('Alternative endpoint status:', altResponse.status);

            if (!altResponse.ok) {
                const altErrorText = await altResponse.text();
                console.error('❌ Alternative endpoint also failed:', altResponse.status, altErrorText);
                throw new Error(`Both userinfo endpoints failed. Primary: ${userInfoResponse.status}, Alt: ${altResponse.status}`);
            }

            const altUserInfo = await altResponse.json();
            console.log('✅ Alternative endpoint succeeded:', altUserInfo);

            // Use alternative response
            const authState = {
                isAuthenticated: true,
                user: {
                    id: altUserInfo.id || altUserInfo.sub,
                    email: altUserInfo.email,
                    name: altUserInfo.name || altUserInfo.email,
                    picture: altUserInfo.picture || null,
                },
                googleToken: token,
                linkedinToken: null,
                twitterToken: null,
            };

            await chrome.storage.sync.set({ authState });
            console.log('✅ Authentication successful via alternative endpoint');

            return { success: true, data: { user: authState.user, token } };
        }

        const userInfo = await userInfoResponse.json();
        console.log('✅ User info received:', userInfo);

        // Validate user info structure
        if (!userInfo.sub && !userInfo.id) {
            console.error('❌ Invalid user info - missing ID:', userInfo);
            throw new Error('Invalid user information received - missing user ID');
        }

        if (!userInfo.email) {
            console.error('❌ Invalid user info - missing email:', userInfo);
            throw new Error('Invalid user information received - missing email');
        }

        const authState = {
            isAuthenticated: true,
            user: {
                id: userInfo.sub || userInfo.id,
                email: userInfo.email,
                name: userInfo.name || userInfo.email,
                picture: userInfo.picture || null,
            },
            googleToken: token,
            linkedinToken: null,
            twitterToken: null,
        };

        await chrome.storage.sync.set({ authState });
        console.log('✅ Authentication successful - user stored');

        return { success: true, data: { user: authState.user, token } };

    } catch (error) {
        console.error('❌ Authentication error:', error);
        console.error('Error stack:', error.stack);

        // Clear any potentially corrupted auth state
        await handleLogout();

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Authentication failed',
            details: error.stack
        };
    }
}

async function clearCachedTokens() {
    try {
        console.log('🧹 Clearing cached tokens...');

        // Get all cached tokens
        const tokens = await new Promise((resolve) => {
            chrome.identity.getAuthToken({ interactive: false }, (token) => {
                resolve(token);
            });
        });

        if (tokens) {
            console.log('Found cached token, removing...');
            await chrome.identity.removeCachedAuthToken({ token: tokens });
        }

        // Also clear from storage
        const result = await chrome.storage.sync.get(['authState']);
        const authState = result.authState;

        if (authState && authState.googleToken) {
            console.log('Removing token from storage...');
            await chrome.identity.removeCachedAuthToken({ token: authState.googleToken });
        }

        console.log('✅ Tokens cleared');
    } catch (error) {
        console.warn('⚠️ Error clearing cached tokens:', error);
    }
}

// Rest of the functions remain the same...
async function handleGmailScan() {
    try {
        console.log('Starting Gmail scan...');
        const result = await chrome.storage.sync.get(['authState']);
        const authState = result.authState;

        if (!authState?.isAuthenticated || !authState.googleToken) {
            throw new Error('User not authenticated');
        }

        const searchQuery = 'certificate OR certification OR "course completion" OR "training completed" OR diploma OR achievement';
        const gmailApiUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=20`;

        const response = await fetch(gmailApiUrl, {
            headers: {
                'Authorization': `Bearer ${authState.googleToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                await handleLogout();
                throw new Error('Authentication expired. Please log in again.');
            }
            throw new Error(`Gmail API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Gmail search results:', data);

        if (!data.messages || data.messages.length === 0) {
            return { success: true, data: { messages: [], count: 0 } };
        }

        const messagePromises = data.messages.slice(0, 10).map((msg) =>
            getMessageDetails(msg.id, authState.googleToken)
        );
        const messages = await Promise.all(messagePromises);
        const validMessages = messages.filter(msg => msg !== null);

        const certificates = validMessages.map(msg => ({
            id: msg.id,
            title: extractCertificateTitle(msg.subject),
            issuer: extractIssuer(msg.from),
            date: msg.date,
            description: msg.snippet,
            skills: extractSkills(msg.body),
            emailId: msg.id,
        }));

        const existingData = await chrome.storage.sync.get(['certificates']);
        const existingCertificates = existingData.certificates || [];
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
        return { success: false, error: error instanceof Error ? error.message : 'Gmail scan failed' };
    }
}

async function getMessageDetails(messageId, token) {
    try {
        const response = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
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

function getHeaderValue(headers, name) {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : null;
}

function extractEmailBody(payload) {
    const body = payload.body;
    if (body && body.data) {
        return decodeBase64(body.data);
    }

    const parts = payload.parts;
    if (parts && Array.isArray(parts)) {
        for (const part of parts) {
            if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                return decodeBase64(part.body.data);
            }
        }
        for (const part of parts) {
            if (part.mimeType === 'text/html' && part.body && part.body.data) {
                return decodeBase64(part.body.data);
            }
        }
    }

    return '';
}

function decodeBase64(data) {
    try {
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        return atob(base64);
    } catch (error) {
        console.error('Error decoding base64:', error);
        return '';
    }
}

function extractCertificateTitle(subject) {
    const cleaned = subject
        .replace(/^(Re:|Fwd?:|Congratulations!?)/i, '')
        .replace(/certificate of completion/i, '')
        .replace(/you have completed/i, '')
        .trim();
    return cleaned || 'Certificate';
}

function extractIssuer(from) {
    const emailMatch = from.match(/<(.+@(.+))>/);
    if (emailMatch) {
        const domain = emailMatch[2];
        return domain.split('.')[0].replace(/^\w/, c => c.toUpperCase());
    }

    const nameMatch = from.match(/^([^<]+)</);
    if (nameMatch) {
        return nameMatch[1].trim();
    }

    return from;
}

function extractSkills(body) {
    const skills = [];
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

    return skills.slice(0, 5);
}

async function getAuthState() {
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

async function handleLogout() {
    try {
        console.log('🚪 Logging out...');
        const result = await chrome.storage.sync.get(['authState']);
        const authState = result.authState;

        if (authState && authState.googleToken) {
            try {
                await chrome.identity.removeCachedAuthToken({ token: authState.googleToken });
                console.log('✅ Token removed from cache');
            } catch (error) {
                console.warn('⚠️ Error removing cached token:', error);
            }
        }

        const clearedAuthState = {
            isAuthenticated: false,
            user: null,
            googleToken: null,
            linkedinToken: null,
            twitterToken: null,
        };

        await chrome.storage.sync.set({ authState: clearedAuthState });
        console.log('✅ Auth state cleared');
        return { success: true, data: null };

    } catch (error) {
        console.error('❌ Logout error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Logout failed'
        };
    }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'gmailScan') {
        console.log('Periodic Gmail scan triggered');
        const result = await chrome.storage.sync.get(['settings', 'authState']);
        const settings = result.settings;
        const authState = result.authState;

        if (settings && settings.autoScan && authState && authState.isAuthenticated) {
            await handleGmailScan();
        }
    }
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
        const newSettings = changes.settings.newValue;
        if (newSettings && newSettings.autoScan) {
            chrome.alarms.create('gmailScan', {
                delayInMinutes: newSettings.scanInterval || 60,
                periodInMinutes: newSettings.scanInterval || 60
            });
        } else {
            chrome.alarms.clear('gmailScan');
        }
    }
});