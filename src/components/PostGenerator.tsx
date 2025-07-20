import { ArrowLeft, Check, Copy, Linkedin, RefreshCw, Sparkles, Twitter } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { AppSettings, Certificate, GeneratedPost, SocialPlatform } from '../types';
import { createGPTService } from '../utils/gptService';
import { storage } from '../utils/storage';

interface PostGeneratorProps {
    certificate: Certificate;
    onPostGenerated: (post: GeneratedPost) => void;
    onClose: () => void;
}

const PostGenerator: React.FC<PostGeneratorProps> = ({
    certificate,
    onPostGenerated,
    onClose
}) => {
    const [platform, setPlatform] = useState<SocialPlatform>('linkedin');
    const [tone, setTone] = useState<'professional' | 'casual' | 'excited'>('professional');
    const [includeHashtags, setIncludeHashtags] = useState(true);
    const [customMessage, setCustomMessage] = useState('');
    const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const appSettings = await storage.getSettings();
        setSettings(appSettings);
        if (appSettings.defaultTone) {
            setTone(appSettings.defaultTone);
        }
        if (appSettings.defaultPlatforms.length > 0) {
            setPlatform(appSettings.defaultPlatforms[0]);
        }
    };

    const handleGenerate = async () => {
        if (!settings?.openaiApiKey) {
            toast.error('Please configure your OpenAI API key in settings');
            return;
        }

        setIsGenerating(true);
        try {
            const gptService = createGPTService(settings.openaiApiKey);
            const certificateContent = `
Certificate: ${certificate.title}
Issuer: ${certificate.issuer}
Date: ${certificate.date}
Description: ${certificate.description}
Skills: ${certificate.skills.join(', ')}
      `.trim();

            const result = await gptService.generatePost({
                certificateContent,
                platform,
                tone,
                includeHashtags,
                customMessage: customMessage || undefined
            });

            if (result.success && result.data) {
                setGeneratedPost(result.data);
                toast.success('Post generated successfully!');
            } else {
                toast.error(result.error || 'Failed to generate post');
            }
        } catch (error) {
            toast.error('Failed to generate post');
            console.error('Post generation error:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = async () => {
        if (!generatedPost) return;

        const fullContent = generatedPost.hashtags.length > 0
            ? `${generatedPost.content}\n\n${generatedPost.hashtags.join(' ')}`
            : generatedPost.content;

        try {
            await navigator.clipboard.writeText(fullContent);
            setCopied(true);
            toast.success('Post copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy to clipboard');
        }
    };

    const handleUsePost = () => {
        if (generatedPost) {
            onPostGenerated(generatedPost);
        }
    };

    const platformIcons = {
        linkedin: Linkedin,
        twitter: Twitter
    };

    const PlatformIcon = platformIcons[platform];

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-900">Generate Post</h2>
                        <p className="text-sm text-gray-600 truncate">{certificate.title}</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Platform Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platform
                    </label>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setPlatform('linkedin')}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${platform === 'linkedin'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <Linkedin className="h-4 w-4" />
                            <span className="text-sm">LinkedIn</span>
                        </button>
                        <button
                            onClick={() => setPlatform('twitter')}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${platform === 'twitter'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <Twitter className="h-4 w-4" />
                            <span className="text-sm">Twitter</span>
                        </button>
                    </div>
                </div>

                {/* Tone Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tone
                    </label>
                    <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value as typeof tone)}
                        className="input-field text-sm"
                    >
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="excited">Excited</option>
                    </select>
                </div>

                {/* Options */}
                <div>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={includeHashtags}
                            onChange={(e) => setIncludeHashtags(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Include hashtags</span>
                    </label>
                </div>

                {/* Custom Message */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Message (Optional)
                    </label>
                    <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Add any specific details or context..."
                        className="input-field text-sm resize-none"
                        rows={3}
                    />
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !settings?.openaiApiKey}
                    className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                    {isGenerating ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="h-4 w-4" />
                    )}
                    <span>{isGenerating ? 'Generating...' : 'Generate Post'}</span>
                </button>

                {!settings?.openaiApiKey && (
                    <p className="text-xs text-red-600 text-center">
                        Please configure your OpenAI API key in settings to generate posts.
                    </p>
                )}

                {/* Generated Post */}
                {generatedPost && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                                <PlatformIcon className="h-4 w-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-900">
                                    Generated Post
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleCopy}
                                    className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                                    title="Copy to clipboard"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </button>
                                <span className="text-xs text-gray-500">
                                    {generatedPost.characterCount} chars
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                {generatedPost.content}
                            </p>

                            {generatedPost.hashtags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {generatedPost.hashtags.map((hashtag, index) => (
                                        <span
                                            key={index}
                                            className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                                        >
                                            {hashtag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex space-x-2">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="btn-secondary flex items-center space-x-1 text-sm"
                            >
                                <RefreshCw className="h-3 w-3" />
                                <span>Regenerate</span>
                            </button>
                            <button
                                onClick={handleUsePost}
                                className="btn-primary flex items-center space-x-1 text-sm"
                            >
                                <span>Use This Post</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PostGenerator;