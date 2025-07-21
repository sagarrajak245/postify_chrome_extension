// Background script for Chrome extension
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
        console.log('Starting authentication...');
        const token = await chrome.identity.getAuthToken({
            interactive: true,
            scopes: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile'
            ]
        });
        if (!token) throw new Error('Failed to get authentication token');
        console.log('Got token, fetching user info...');
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!userInfoResponse.ok) throw new Error('Failed to fetch user information');
        const userInfo = await userInfoResponse.json();
        console.log('User info received:', userInfo);
        const authState = {
            isAuthenticated: true,
            user: {
                id: userInfo.sub,
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
            },
            googleToken: token,
            linkedinToken: null,
            twitterToken: null,
        };
        await chrome.storage.sync.set({ authState });
        return { success: true, data: { user: authState.user, token } };
    } catch (error) {
        console.error('Authentication error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Authentication failed' };
    }
}

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
            headers: { Authorization: `Bearer ${authState.googleToken}` }
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
        return domain.split('.')[0].replace(/^\\w/, c => c.toUpperCase());
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
        const result = await chrome.storage.sync.get(['authState']);
        const authState = result.authState;
        if (authState && authState.googleToken) {
            try {
                await chrome.identity.removeCachedAuthToken({ token: authState.googleToken });
            } catch (error) {
                console.warn('Error removing cached token:', error);
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
        return { success: true, data: null };
    } catch (error) {
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