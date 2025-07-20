// User and Authentication Types
export interface User {
    id: string;
    email: string;
    name: string;
    picture?: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    googleToken: string | null;
    linkedinToken: string | null;
    twitterToken: string | null;
}

// Gmail and Email Types
export interface EmailMessage {
    id: string;
    subject: string;
    body: string;
    date: string;
    from: string;
    snippet: string;
}

export interface Certificate {
    id: string;
    title: string;
    issuer: string;
    date: string;
    description: string;
    skills: string[];
    emailId: string;
}

// Social Media Types
export type SocialPlatform = 'linkedin' | 'twitter';

export interface SocialPost {
    id: string;
    platform: SocialPlatform;
    content: string;
    hashtags: string[];
    status: 'draft' | 'scheduled' | 'posted' | 'failed';
    createdAt: string;
    scheduledAt?: string;
    postedAt?: string;
    certificateId: string;
}

export interface PostGenerationRequest {
    certificateContent: string;
    platform: SocialPlatform;
    tone: 'professional' | 'casual' | 'excited';
    includeHashtags: boolean;
    customMessage?: string;
}

export interface GeneratedPost {
    content: string;
    hashtags: string[];
    platform: SocialPlatform;
    characterCount: number;
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface GmailApiResponse {
    messages?: Array<{ id: string; threadId: string }>;
    nextPageToken?: string;
    resultSizeEstimate?: number;
}

// Storage Types
export interface StorageData {
    certificates: Certificate[];
    posts: SocialPost[];
    settings: AppSettings;
    authState: AuthState;
}

export interface AppSettings {
    openaiApiKey: string;
    linkedinClientId?: string;
    linkedinClientSecret?: string;
    twitterClientId?: string;
    twitterClientSecret?: string;
    defaultTone: 'professional' | 'casual' | 'excited';
    autoScan: boolean;
    scanInterval: number; // in minutes
    defaultPlatforms: SocialPlatform[];
    notifications: boolean;
}

// Component Props Types
export interface CertificateItemProps {
    certificate: Certificate;
    onGeneratePost: (certificate: Certificate) => void;
    onDelete: (certificateId: string) => void;
}

export interface PostGeneratorProps {
    certificate: Certificate | null;
    onPostGenerated: (post: GeneratedPost) => void;
    onClose: () => void;
}

export interface SocialPosterProps {
    post: GeneratedPost;
    onPost: (platform: SocialPlatform) => Promise<void>;
    onSave: () => void;
    onClose: () => void;
}

// Chrome Extension Types
export interface ChromeMessage {
    action: string;
    data?: unknown;
}

export interface BackgroundResponse {
    success: boolean;
    data?: unknown;
    error?: string;
}

// Error Types
export interface AppError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export type ErrorCode =
    | 'AUTH_FAILED'
    | 'GMAIL_ACCESS_DENIED'
    | 'API_RATE_LIMIT'
    | 'NETWORK_ERROR'
    | 'INVALID_CERTIFICATE'
    | 'POST_GENERATION_FAILED'
    | 'SOCIAL_POST_FAILED'
    | 'STORAGE_ERROR';