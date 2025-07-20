import type { ApiResponse, Certificate, EmailMessage } from '../types';

export class GmailService {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    /**
     * Search for certificate-related emails in Gmail
     */
    async searchCertificates(): Promise<ApiResponse<EmailMessage[]>> {
        try {
            const searchQuery = 'certificate OR certification OR "course completion" OR "training completed" OR diploma OR achievement OR "you have completed"';
            const gmailApiUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=20`;

            const response = await fetch(gmailApiUrl, {
                headers: { Authorization: `Bearer ${this.token}` }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    return {
                        success: false,
                        error: 'Authentication expired. Please log in again.'
                    };
                }
                return {
                    success: false,
                    error: `Gmail API error: ${response.status} ${response.statusText}`
                };
            }

            const data = await response.json();

            if (!data.messages || data.messages.length === 0) {
                return {
                    success: true,
                    data: [],
                    message: 'No certificate emails found'
                };
            }

            // Get detailed information for each message
            const messagePromises = data.messages.slice(0, 10).map((msg: { id: string }) =>
                this.getMessageDetails(msg.id)
            );

            const messages = await Promise.all(messagePromises);
            const validMessages = messages.filter(msg => msg !== null) as EmailMessage[];

            return {
                success: true,
                data: validMessages
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to search certificates'
            };
        }
    }

    /**
     * Get detailed information for a specific message
     */
    private async getMessageDetails(messageId: string): Promise<EmailMessage | null> {
        try {
            const response = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
                {
                    headers: { Authorization: `Bearer ${this.token}` }
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
                subject: this.getHeaderValue(headers, 'Subject') || '',
                body: this.extractEmailBody(message.payload),
                date: this.getHeaderValue(headers, 'Date') || '',
                from: this.getHeaderValue(headers, 'From') || '',
                snippet: message.snippet || '',
            };
        } catch (error) {
            console.error(`Error getting message details for ${messageId}:`, error);
            return null;
        }
    }

    /**
     * Extract header value by name
     */
    private getHeaderValue(headers: Array<{ name: string; value: string }>, name: string): string | null {
        const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return header ? header.value : null;
    }

    /**
     * Extract email body from Gmail payload
     */
    private extractEmailBody(payload: Record<string, unknown>): string {
        // Type guard for body structure
        const body = payload.body as { data?: string } | undefined;
        if (body?.data) {
            return this.decodeBase64(body.data);
        }

        // Type guard for parts structure
        const parts = payload.parts as Array<{
            mimeType?: string;
            body?: { data?: string };
        }> | undefined;

        if (parts && Array.isArray(parts)) {
            // Try plain text first
            for (const part of parts) {
                if (part.mimeType === 'text/plain' && part.body?.data) {
                    return this.decodeBase64(part.body.data);
                }
            }

            // Try HTML if plain text not found
            for (const part of parts) {
                if (part.mimeType === 'text/html' && part.body?.data) {
                    const htmlContent = this.decodeBase64(part.body.data);
                    return this.stripHtmlTags(htmlContent);
                }
            }
        }

        return '';
    }

    /**
     * Decode base64 URL-safe string
     */
    private decodeBase64(data: string): string {
        try {
            const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
            return atob(base64);
        } catch (error) {
            console.error('Error decoding base64:', error);
            return '';
        }
    }

    /**
     * Strip HTML tags from content
     */
    private stripHtmlTags(html: string): string {
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    /**
     * Convert email messages to certificate objects
     */
    convertToCertificates(messages: EmailMessage[]): Certificate[] {
        return messages.map(message => ({
            id: `cert_${message.id}`,
            title: this.extractCertificateTitle(message.subject),
            issuer: this.extractIssuer(message.from),
            date: this.formatDate(message.date),
            description: this.extractDescription(message.body, message.snippet),
            skills: this.extractSkills(message.body + ' ' + message.subject),
            emailId: message.id,
        }));
    }

    /**
     * Extract certificate title from email subject
     */
    private extractCertificateTitle(subject: string): string {
        // Remove common prefixes and clean up
        let cleaned = subject
            .replace(/^(Re:|Fwd?:|Congratulations!?)/i, '')
            .replace(/certificate of completion/i, '')
            .replace(/you have completed/i, '')
            .replace(/course completion/i, '')
            .replace(/training completed/i, '')
            .trim();

        // Extract course/certification name
        const patterns = [
            /completed\s+(.+?)(?:\s+course|\s+training|\s+certification|$)/i,
            /certificate\s+(?:of\s+)?(.+?)(?:\s+course|\s+training|$)/i,
            /(.+?)\s+certificate/i,
            /(.+?)\s+completion/i,
        ];

        for (const pattern of patterns) {
            const match = cleaned.match(pattern);
            if (match && match[1]) {
                cleaned = match[1].trim();
                break;
            }
        }

        return cleaned || 'Certificate';
    }

    /**
     * Extract issuer from email address
     */
    private extractIssuer(from: string): string {
        // Try to extract name before email
        const nameMatch = from.match(/^([^<]+)</);
        if (nameMatch) {
            const name = nameMatch[1].trim().replace(/"/g, '');
            if (name && !name.includes('@')) {
                return name;
            }
        }

        // Extract domain or organization name
        const emailMatch = from.match(/<(.+@(.+))>/) || from.match(/(.+@(.+))/);
        if (emailMatch) {
            const domain = emailMatch[2];
            const orgName = domain.split('.')[0];
            return orgName.charAt(0).toUpperCase() + orgName.slice(1);
        }

        return from;
    }

    /**
     * Format date string
     */
    private formatDate(dateString: string): string {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch {
            return dateString;
        }
    }

    /**
     * Extract description from email body and snippet
     */
    private extractDescription(body: string, snippet: string): string {
        // Use snippet if body is too long or empty
        if (!body || body.length > 500) {
            return snippet.length > 150 ? snippet.substring(0, 150) + '...' : snippet;
        }

        // Extract relevant parts from body
        const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const relevantSentences = sentences.filter(sentence => {
            const lower = sentence.toLowerCase();
            return lower.includes('complet') ||
                lower.includes('certif') ||
                lower.includes('achiev') ||
                lower.includes('skill') ||
                lower.includes('course');
        });

        if (relevantSentences.length > 0) {
            const description = relevantSentences.slice(0, 2).join('. ').trim();
            return description.length > 200 ? description.substring(0, 200) + '...' : description;
        }

        return snippet.length > 150 ? snippet.substring(0, 150) + '...' : snippet;
    }

    /**
     * Extract skills from email content
     */
    private extractSkills(content: string): string[] {
        const skills: string[] = [];
        const skillKeywords = [
            // Programming languages
            'javascript', 'python', 'java', 'typescript', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
            // Frameworks and libraries
            'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel',
            // Cloud and DevOps
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'terraform', 'ansible',
            // Databases
            'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
            // Data and AI
            'machine learning', 'data science', 'artificial intelligence', 'deep learning', 'tensorflow', 'pytorch',
            // Soft skills
            'project management', 'agile', 'scrum', 'leadership', 'communication', 'teamwork',
            // Other technical
            'git', 'linux', 'api', 'microservices', 'blockchain', 'cybersecurity'
        ];

        const lowerContent = content.toLowerCase();
        skillKeywords.forEach(skill => {
            if (lowerContent.includes(skill.toLowerCase())) {
                // Capitalize first letter of each word
                const formattedSkill = skill.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                skills.push(formattedSkill);
            }
        });

        // Remove duplicates and limit to 5 skills
        return [...new Set(skills)].slice(0, 5);
    }

    /**
     * Check if email is likely a certificate
     */
    static isCertificateEmail(subject: string, body: string): boolean {
        const certificateKeywords = [
            'certificate', 'certification', 'diploma', 'completion', 'achievement',
            'congratulations', 'completed', 'earned', 'awarded', 'qualified'
        ];

        const content = (subject + ' ' + body).toLowerCase();
        return certificateKeywords.some(keyword => content.includes(keyword));
    }
}

/**
 * Helper function to create Gmail service instance
 */
export function createGmailService(token: string): GmailService {
    return new GmailService(token);
}