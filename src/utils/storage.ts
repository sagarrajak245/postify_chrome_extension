import type { AppSettings, AuthState, Certificate, SocialPost, StorageData } from '../types';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
    openaiApiKey: '',
    defaultTone: 'professional',
    autoScan: false,
    scanInterval: 60, // 1 hour
    defaultPlatforms: ['linkedin'],
    notifications: true,
};

// Default auth state
const DEFAULT_AUTH_STATE: AuthState = {
    isAuthenticated: false,
    user: null,
    googleToken: null,
    linkedinToken: null,
    twitterToken: null,
};

export class StorageService {
    private static instance: StorageService;

    private constructor() { }

    public static getInstance(): StorageService {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }

    // Generic storage methods
    async get<T>(key: string): Promise<T | null> {
        try {
            const result = await chrome.storage.sync.get([key]);
            return result[key] || null;
        } catch (error) {
            console.error(`Error getting ${key} from storage:`, error);
            return null;
        }
    }

    async set<T>(key: string, value: T): Promise<boolean> {
        try {
            await chrome.storage.sync.set({ [key]: value });
            return true;
        } catch (error) {
            console.error(`Error setting ${key} in storage:`, error);
            return false;
        }
    }

    async remove(key: string): Promise<boolean> {
        try {
            await chrome.storage.sync.remove([key]);
            return true;
        } catch (error) {
            console.error(`Error removing ${key} from storage:`, error);
            return false;
        }
    }

    async clear(): Promise<boolean> {
        try {
            await chrome.storage.sync.clear();
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    }

    // Auth state methods
    async getAuthState(): Promise<AuthState> {
        const authState = await this.get<AuthState>('authState');
        return authState || DEFAULT_AUTH_STATE;
    }

    async setAuthState(authState: AuthState): Promise<boolean> {
        return await this.set('authState', authState);
    }

    async clearAuthState(): Promise<boolean> {
        return await this.set('authState', DEFAULT_AUTH_STATE);
    }

    // Settings methods
    async getSettings(): Promise<AppSettings> {
        const settings = await this.get<AppSettings>('settings');
        return { ...DEFAULT_SETTINGS, ...settings };
    }

    async setSettings(settings: Partial<AppSettings>): Promise<boolean> {
        const currentSettings = await this.getSettings();
        const updatedSettings = { ...currentSettings, ...settings };
        return await this.set('settings', updatedSettings);
    }

    async updateSetting<K extends keyof AppSettings>(
        key: K,
        value: AppSettings[K]
    ): Promise<boolean> {
        const settings = await this.getSettings();
        settings[key] = value;
        return await this.setSettings(settings);
    }

    // Certificate methods
    async getCertificates(): Promise<Certificate[]> {
        const certificates = await this.get<Certificate[]>('certificates');
        return certificates || [];
    }

    async setCertificates(certificates: Certificate[]): Promise<boolean> {
        return await this.set('certificates', certificates);
    }

    async addCertificate(certificate: Certificate): Promise<boolean> {
        const certificates = await this.getCertificates();
        const existingIndex = certificates.findIndex(c => c.id === certificate.id);

        if (existingIndex >= 0) {
            certificates[existingIndex] = certificate;
        } else {
            certificates.push(certificate);
        }

        return await this.setCertificates(certificates);
    }

    async removeCertificate(certificateId: string): Promise<boolean> {
        const certificates = await this.getCertificates();
        const filteredCertificates = certificates.filter(c => c.id !== certificateId);
        return await this.setCertificates(filteredCertificates);
    }

    async getCertificate(certificateId: string): Promise<Certificate | null> {
        const certificates = await this.getCertificates();
        return certificates.find(c => c.id === certificateId) || null;
    }

    // Social posts methods
    async getPosts(): Promise<SocialPost[]> {
        const posts = await this.get<SocialPost[]>('posts');
        return posts || [];
    }

    async setPosts(posts: SocialPost[]): Promise<boolean> {
        return await this.set('posts', posts);
    }

    async addPost(post: SocialPost): Promise<boolean> {
        const posts = await this.getPosts();
        const existingIndex = posts.findIndex(p => p.id === post.id);

        if (existingIndex >= 0) {
            posts[existingIndex] = post;
        } else {
            posts.push(post);
        }

        return await this.setPosts(posts);
    }

    async removePost(postId: string): Promise<boolean> {
        const posts = await this.getPosts();
        const filteredPosts = posts.filter(p => p.id !== postId);
        return await this.setPosts(filteredPosts);
    }

    async getPost(postId: string): Promise<SocialPost | null> {
        const posts = await this.getPosts();
        return posts.find(p => p.id === postId) || null;
    }

    async updatePostStatus(postId: string, status: SocialPost['status']): Promise<boolean> {
        const posts = await this.getPosts();
        const postIndex = posts.findIndex(p => p.id === postId);

        if (postIndex >= 0) {
            posts[postIndex].status = status;
            if (status === 'posted') {
                posts[postIndex].postedAt = new Date().toISOString();
            }
            return await this.setPosts(posts);
        }

        return false;
    }

    // Bulk operations
    async getAllData(): Promise<StorageData> {
        const [certificates, posts, settings, authState] = await Promise.all([
            this.getCertificates(),
            this.getPosts(),
            this.getSettings(),
            this.getAuthState(),
        ]);

        return {
            certificates,
            posts,
            settings,
            authState,
        };
    }

    async setAllData(data: Partial<StorageData>): Promise<boolean> {
        try {
            const promises: Promise<boolean>[] = [];

            if (data.certificates) {
                promises.push(this.setCertificates(data.certificates));
            }
            if (data.posts) {
                promises.push(this.setPosts(data.posts));
            }
            if (data.settings) {
                promises.push(this.setSettings(data.settings));
            }
            if (data.authState) {
                promises.push(this.setAuthState(data.authState));
            }

            const results = await Promise.all(promises);
            return results.every(result => result === true);
        } catch (error) {
            console.error('Error setting all data:', error);
            return false;
        }
    }

    // Export/Import functionality
    async exportData(): Promise<string> {
        const data = await this.getAllData();
        return JSON.stringify(data, null, 2);
    }

    async importData(jsonData: string): Promise<boolean> {
        try {
            const data = JSON.parse(jsonData) as Partial<StorageData>;
            return await this.setAllData(data);
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}

// Export singleton instance
export const storage = StorageService.getInstance();