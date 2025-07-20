import { AlertCircle, Calendar, CheckCircle, Clock, Send } from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import type { GeneratedPost, SocialPlatform } from '../types';

interface SocialPosterProps {
    post: GeneratedPost;
    onPost: (platform: SocialPlatform) => Promise<void>;
    onSave: () => void;
    onClose: () => void;
}

export const SocialPoster: React.FC<SocialPosterProps> = ({
    post,
    onPost,
    onSave,
    onClose
}) => {
    const [posting, setPosting] = useState<Record<SocialPlatform, boolean>>({
        linkedin: false,
        twitter: false
    });
    const [posted, setPosted] = useState<Record<SocialPlatform, boolean>>({
        linkedin: false,
        twitter: false
    });
    const [scheduleMode, setScheduleMode] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');

    const handlePost = async (platform: SocialPlatform) => {
        if (posting[platform] || posted[platform]) return;

        setPosting(prev => ({ ...prev, [platform]: true }));

        try {
            await onPost(platform);
            setPosted(prev => ({ ...prev, [platform]: true }));
            toast.success(`Posted to ${platform.charAt(0).toUpperCase() + platform.slice(1)} successfully!`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            toast.error(`Failed to post to ${platform}: ${errorMessage}`);
        } finally {
            setPosting(prev => ({ ...prev, [platform]: false }));
        }
    };

    const handleSchedulePost = async (platform: SocialPlatform) => {
        if (!scheduledTime) {
            toast.error('Please select a time to schedule the post');
            return;
        }

        const scheduleDate = new Date(scheduledTime);
        if (scheduleDate <= new Date()) {
            toast.error('Please select a future time');
            return;
        }

        setPosting(prev => ({ ...prev, [platform]: true }));

        try {
            // In a real implementation, this would schedule the post
            // For now, we'll just simulate scheduling
            await new Promise(resolve => setTimeout(resolve, 1000));

            toast.success(`Post scheduled for ${platform} at ${scheduleDate.toLocaleString()}`);
            setScheduleMode(false);
            setScheduledTime('');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            toast.error(`Failed to schedule post: ${errorMessage}`);
        } finally {
            setPosting(prev => ({ ...prev, [platform]: false }));
        }
    };

    const getPlatformColor = (platform: SocialPlatform) => {
        return platform === 'linkedin'
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-sky-500 hover:bg-sky-600';
    };

    const getPlatformName = (platform: SocialPlatform) => {
        return platform === 'linkedin' ? 'LinkedIn' : 'Twitter';
    };

    const getCharacterLimit = (platform: SocialPlatform) => {
        return platform === 'linkedin' ? 3000 : 280;
    };

    const isOverLimit = (platform: SocialPlatform) => {
        const totalLength = post.content.length + (post.hashtags.length > 0 ? post.hashtags.join(' ').length + 2 : 0);
        return totalLength > getCharacterLimit(platform);
    };

    const getContentPreview = () => {
        return post.hashtags.length > 0
            ? `${post.content}\n\n${post.hashtags.join(' ')}`
            : post.content;
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Post to Social Media</h3>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setScheduleMode(!scheduleMode)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${scheduleMode
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Schedule
                    </button>
                    <button
                        onClick={onClose}
                        className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                        Close
                    </button>
                </div>
            </div>

            {scheduleMode && (
                <div className="mb-4 p-4 bg-purple-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Schedule for:
                    </label>
                    <input
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
            )}

            <div className="space-y-4">
                {(['linkedin', 'twitter'] as SocialPlatform[]).map((platform) => (
                    <div key={platform} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">{getPlatformName(platform)}</h4>
                                {posted[platform] && (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                )}
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                                {isOverLimit(platform) && (
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span className={`${isOverLimit(platform) ? 'text-red-500' : 'text-gray-500'
                                    }`}>
                                    {getContentPreview().length}/{getCharacterLimit(platform)}
                                </span>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-md p-3 mb-3">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {getContentPreview()}
                            </p>
                        </div>

                        {isOverLimit(platform) && (
                            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-600">
                                    Content exceeds {getPlatformName(platform)}'s character limit.
                                    Please edit the post before sharing.
                                </p>
                            </div>
                        )}

                        <div className="flex space-x-2">
                            {scheduleMode ? (
                                <button
                                    onClick={() => handleSchedulePost(platform)}
                                    disabled={posting[platform] || isOverLimit(platform) || !scheduledTime}
                                    className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getPlatformColor(platform)}`}
                                >
                                    {posting[platform] ? (
                                        <>
                                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                                            Scheduling...
                                        </>
                                    ) : (
                                        <>
                                            <Calendar className="w-4 h-4 mr-2" />
                                            Schedule Post
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handlePost(platform)}
                                    disabled={posting[platform] || posted[platform] || isOverLimit(platform)}
                                    className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${posted[platform]
                                        ? 'bg-green-600'
                                        : getPlatformColor(platform)
                                        }`}
                                >
                                    {posting[platform] ? (
                                        <>
                                            <Send className="w-4 h-4 mr-2 animate-pulse" />
                                            Posting...
                                        </>
                                    ) : posted[platform] ? (
                                        <>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Posted
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Post Now
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                    <strong>Tip:</strong> Review your post content and ensure it meets each platform's
                    guidelines before posting. You can schedule posts for optimal engagement times.
                </p>
            </div>

            <div className="mt-4 flex justify-end space-x-2">
                <button
                    onClick={onSave}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                    Save Draft
                </button>
            </div>
        </div>
    );
};