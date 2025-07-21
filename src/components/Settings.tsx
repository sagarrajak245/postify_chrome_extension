import { CheckCircle, Eye, EyeOff, Save, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import type { AppSettings } from '../types';
import { storage } from '../utils/storage';

interface SettingsProps {
    settings: AppSettings;
    onClose: () => void;
    onSettingsUpdate: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onClose, onSettingsUpdate }) => {
    const [formData, setFormData] = useState<AppSettings>(settings);
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);
    const [showTwitterToken, setShowTwitterToken] = useState(false);
    const [showLinkedInSecret, setShowLinkedInSecret] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (key: keyof AppSettings, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await storage.setSettings(formData);
            onSettingsUpdate(formData);
            toast.success('Settings saved successfully!');
            onClose();
        } catch (error) {
            toast.error('Failed to save settings');
            console.error('Save settings error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const validateOpenAIKey = (key: string) => {
        return key.startsWith('sk-') && key.length > 20;
    };

    const validateTwitterToken = (token: string) => {
        return token.length > 50; // Basic validation
    };

    const validateLinkedInCredentials = (clientId: string, clientSecret: string) => {
        return clientId.length > 10 && clientSecret.length > 10;
    };

    const isFormValid = () => {
        return (
            validateOpenAIKey(formData.openaiApiKey) &&
            (formData.twitterClientId ? validateTwitterToken(formData.twitterClientId) : true) &&
            (formData.linkedinClientId ? validateLinkedInCredentials(formData.linkedinClientId, formData.linkedinClientSecret || '') : true)
        );
    };

    return (
        <div className="p-6 bg-white">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                    <X className="h-5 w-5 text-gray-500" />
                </button>
            </div>

            <div className="space-y-6">
                {/* OpenAI API Key */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        OpenAI API Key *
                    </label>
                    <div className="relative">
                        <input
                            type={showOpenAIKey ? 'text' : 'password'}
                            value={formData.openaiApiKey}
                            onChange={(e) => handleInputChange('openaiApiKey', e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                            type="button"
                            onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showOpenAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {formData.openaiApiKey && !validateOpenAIKey(formData.openaiApiKey) && (
                        <p className="text-sm text-red-600 mt-1">Invalid OpenAI API key format</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                        Required for AI post generation. Get your key from{' '}
                        <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            OpenAI Platform
                        </a>
                    </p>
                </div>

                {/* Google Configuration */}
                <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Google Configuration</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Google Client ID *
                            </label>
                            <input
                                type="text"
                                value={formData.googleClientId || ''}
                                onChange={(e) => handleInputChange('googleClientId', e.target.value)}
                                placeholder="Enter your Google Client ID"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Required for Gmail access. Get your Client ID from{' '}
                                <a
                                    href="https://console.cloud.google.com/apis/credentials"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                >
                                    Google Cloud Console
                                </a>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Twitter Configuration */}
                <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Twitter Configuration</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Twitter Bearer Token
                            </label>
                            <div className="relative">
                                <input
                                    type={showTwitterToken ? 'text' : 'password'}
                                    value={formData.twitterClientId || ''}
                                    onChange={(e) => handleInputChange('twitterClientId', e.target.value)}
                                    placeholder="Enter your Twitter Bearer token"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowTwitterToken(!showTwitterToken)}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showTwitterToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {formData.twitterClientId && !validateTwitterToken(formData.twitterClientId) && (
                                <p className="text-sm text-red-600 mt-1">Invalid Twitter token format</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Get your Bearer token from{' '}
                                <a
                                    href="https://developer.twitter.com/en/portal/dashboard"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                >
                                    Twitter Developer Portal
                                </a>
                            </p>
                        </div>
                    </div>
                </div>

                {/* LinkedIn Configuration */}
                <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">LinkedIn Configuration</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                LinkedIn Client ID
                            </label>
                            <input
                                type="text"
                                value={formData.linkedinClientId || ''}
                                onChange={(e) => handleInputChange('linkedinClientId', e.target.value)}
                                placeholder="Enter your LinkedIn Client ID"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                LinkedIn Client Secret
                            </label>
                            <div className="relative">
                                <input
                                    type={showLinkedInSecret ? 'text' : 'password'}
                                    value={formData.linkedinClientSecret || ''}
                                    onChange={(e) => handleInputChange('linkedinClientSecret', e.target.value)}
                                    placeholder="Enter your LinkedIn Client Secret"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowLinkedInSecret(!showLinkedInSecret)}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showLinkedInSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">
                            Get your LinkedIn credentials from{' '}
                            <a
                                href="https://www.linkedin.com/developers/apps"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                            >
                                LinkedIn Developers
                            </a>
                        </p>
                    </div>
                </div>

                {/* General Settings */}
                <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Default Tone
                            </label>
                            <select
                                value={formData.defaultTone}
                                onChange={(e) => handleInputChange('defaultTone', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="professional">Professional</option>
                                <option value="casual">Casual</option>
                                <option value="excited">Excited</option>
                            </select>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="autoScan"
                                checked={formData.autoScan}
                                onChange={(e) => handleInputChange('autoScan', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="autoScan" className="ml-2 block text-sm text-gray-900">
                                Auto-scan Gmail for certificates
                            </label>
                        </div>

                        {formData.autoScan && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Scan Interval (minutes)
                                </label>
                                <input
                                    type="number"
                                    min="15"
                                    max="1440"
                                    value={formData.scanInterval}
                                    onChange={(e) => handleInputChange('scanInterval', parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        )}

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="notifications"
                                checked={formData.notifications}
                                onChange={(e) => handleInputChange('notifications', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="notifications" className="ml-2 block text-sm text-gray-900">
                                Enable notifications
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={!isFormValid() || isSaving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                    {isSaving ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" />
                            <span>Save Settings</span>
                        </>
                    )}
                </button>
            </div>

            {/* Validation Status */}
            {formData.openaiApiKey && validateOpenAIKey(formData.openaiApiKey) && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800">OpenAI API key is valid</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;