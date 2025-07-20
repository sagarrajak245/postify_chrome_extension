import { Bell, Clock, Download, Eye, EyeOff, Key, Palette, Save, Trash2, Upload } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { AppSettings, SocialPlatform } from '../types';
import { storage } from '../utils/storage';

interface SettingsProps {
    onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
    const [settings, setSettings] = useState<AppSettings>({
        openaiApiKey: '',
        defaultTone: 'professional',
        autoScan: true,
        scanInterval: 60,
        defaultPlatforms: ['twitter'],
        notifications: true
    });
    const [showApiKey, setShowApiKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedSettings = await storage.getSettings();
            setSettings(savedSettings);
        } catch (error) {
            console.error('Failed to load settings:', error);
            toast.error('Failed to load settings');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await storage.setSettings(settings);
            toast.success('Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handlePlatformToggle = (platform: SocialPlatform) => {
        setSettings(prev => ({
            ...prev,
            defaultPlatforms: prev.defaultPlatforms.includes(platform)
                ? prev.defaultPlatforms.filter(p => p !== platform)
                : [...prev.defaultPlatforms, platform]
        }));
    };

    const handleExportData = async () => {
        setExporting(true);
        try {
            const data = await storage.exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `postify-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Data exported successfully!');
        } catch (error) {
            console.error('Failed to export data:', error);
            toast.error('Failed to export data');
        } finally {
            setExporting(false);
        }
    };

    const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            await storage.importData(text);
            toast.success('Data imported successfully!');
            loadSettings(); // Reload settings after import
        } catch (error) {
            console.error('Failed to import data:', error);
            toast.error('Failed to import data. Please check the file format.');
        }
    };

    const handleClearData = async () => {
        if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            return;
        }

        try {
            await storage.clear();
            toast.success('All data cleared successfully!');
            loadSettings(); // Reload default settings
        } catch (error) {
            console.error('Failed to clear data:', error);
            toast.error('Failed to clear data');
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    ×
                </button>
            </div>

            <div className="space-y-6">
                {/* API Configuration */}
                <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Key className="w-5 h-5 mr-2" />
                        API Configuration
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                OpenAI API Key
                            </label>
                            <div className="relative">
                                <input
                                    type={showApiKey ? 'text' : 'password'}
                                    value={settings.openaiApiKey}
                                    onChange={(e) => setSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                                    placeholder="sk-..."
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                LinkedIn Client ID
                            </label>
                            <input
                                type="text"
                                value={settings.linkedinClientId || ''}
                                onChange={(e) => setSettings(prev => ({ ...prev, linkedinClientId: e.target.value }))}
                                placeholder="Your LinkedIn Client ID"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Get from <a href="https://developer.linkedin.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">LinkedIn Developer Portal</a>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                LinkedIn Client Secret
                            </label>
                            <div className="relative">
                                <input
                                    type={showApiKey ? 'text' : 'password'}
                                    value={settings.linkedinClientSecret || ''}
                                    onChange={(e) => setSettings(prev => ({ ...prev, linkedinClientSecret: e.target.value }))}
                                    placeholder="Your LinkedIn Client Secret"
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-red-500 mt-1">
                                ⚠️ Client Secret should be kept secure. Consider using OAuth flow instead.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Post Generation Settings */}
                <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Palette className="w-5 h-5 mr-2" />
                        Post Generation
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Default Tone
                            </label>
                            <select
                                value={settings.defaultTone}
                                onChange={(e) => setSettings(prev => ({ ...prev, defaultTone: e.target.value as 'professional' | 'casual' | 'excited' }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="professional">Professional</option>
                                <option value="casual">Casual</option>
                                <option value="excited">Excited</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Default Platforms
                            </label>
                            <div className="space-y-2">
                                {(['linkedin', 'twitter'] as SocialPlatform[]).map((platform) => (
                                    <label key={platform} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={settings.defaultPlatforms.includes(platform)}
                                            onChange={() => handlePlatformToggle(platform)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 capitalize">
                                            {platform === 'linkedin' ? 'LinkedIn' : 'Twitter'}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scanning Settings */}
                <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Clock className="w-5 h-5 mr-2" />
                        Email Scanning
                    </h3>

                    <div className="space-y-4">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={settings.autoScan}
                                onChange={(e) => setSettings(prev => ({ ...prev, autoScan: e.target.checked }))}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                Enable automatic email scanning
                            </span>
                        </label>

                        {settings.autoScan && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Scan Interval (minutes)
                                </label>
                                <input
                                    type="number"
                                    min="5"
                                    max="1440"
                                    value={settings.scanInterval}
                                    onChange={(e) => setSettings(prev => ({ ...prev, scanInterval: parseInt(e.target.value) || 60 }))}
                                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Minimum: 5 minutes, Maximum: 24 hours (1440 minutes)
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notifications */}
                <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <Bell className="w-5 h-5 mr-2" />
                        Notifications
                    </h3>

                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={settings.notifications}
                            onChange={(e) => setSettings(prev => ({ ...prev, notifications: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                            Enable notifications for new certificates and posting updates
                        </span>
                    </label>
                </div>

                {/* Data Management */}
                <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Data Management
                    </h3>

                    <div className="space-y-3">
                        <button
                            onClick={handleExportData}
                            disabled={exporting}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {exporting ? 'Exporting...' : 'Export Data'}
                        </button>

                        <div>
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImportData}
                                className="hidden"
                                id="import-file"
                            />
                            <label
                                htmlFor="import-file"
                                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer transition-colors"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Import Data
                            </label>
                        </div>

                        <button
                            onClick={handleClearData}
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear All Data
                        </button>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
};