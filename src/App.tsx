import { Mail, Settings as SettingsIcon, Share2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import AuthStatus from './components/AuthStatus';
import CertificateList from './components/CertificateList';
import { ErrorBoundary } from './components/ErrorBoundary';
import PostGenerator from './components/PostGenerator';
import Settings from './components/Settings';
import { SocialPoster } from './components/SocialPoster';
import type { AppSettings, AuthState, Certificate, GeneratedPost } from './types';
import { createSocialMediaService } from './utils/socialService';
import { storage } from './utils/storage';

type AppView = 'certificates' | 'generator' | 'poster' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('certificates');
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    googleToken: null,
    linkedinToken: null,
    twitterToken: null,
  });
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize app data
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);

      // Load auth state
      const authResponse = await chrome.runtime.sendMessage({ action: 'getAuthState' });
      if (authResponse.success) {
        setAuthState(authResponse.data);
      }

      // Load certificates and settings
      const [certificatesData, settingsData] = await Promise.all([
        storage.getCertificates(),
        storage.getSettings()
      ]);

      setCertificates(certificatesData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthentication = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'authenticate' });
      if (response.success) {
        setAuthState({
          isAuthenticated: true,
          user: response.data.user,
          googleToken: response.data.token,
          linkedinToken: null,
          twitterToken: null,
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'logout' });
      setAuthState({
        isAuthenticated: false,
        user: null,
        googleToken: null,
        linkedinToken: null,
        twitterToken: null,
      });
      setCertificates([]);
      setSelectedCertificate(null);
      setGeneratedPost(null);
      setCurrentView('certificates');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleScanGmail = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'scanGmail' });
      if (response.success && response.data.certificates) {
        setCertificates(response.data.certificates);
      }
    } catch (error) {
      console.error('Gmail scan error:', error);
    }
  };

  const handleGeneratePost = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setCurrentView('generator');
  };

  const handlePostGenerated = (post: GeneratedPost) => {
    setGeneratedPost(post);
    setCurrentView('poster');
  };

  const handlePostComplete = () => {
    setGeneratedPost(null);
    setSelectedCertificate(null);
    setCurrentView('certificates');
  };

  const handlePostToSocial = async (platform: string) => {
    if (!generatedPost || !settings) {
      toast.error('Missing post or settings');
      return;
    }

    try {
      // Get tokens from settings
      const twitterToken = settings.twitterClientId; // Using twitterClientId field for Twitter token
      const linkedinToken = "string"; // Will be implemented later

      const socialService = createSocialMediaService(linkedinToken, twitterToken);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await socialService.postToSocial(platform as any, generatedPost);

      if (result.success) {
        toast.success(`Posted successfully to ${platform}!`);
        if (result.data?.url) {
          // Open the posted content in a new tab
          chrome.tabs.create({ url: result.data.url });
        }
        handlePostComplete();
      } else {
        toast.error(result.error || `Failed to post to ${platform}`);
      }
    } catch (error) {
      console.error('Posting error:', error);
      toast.error(`Failed to post to ${platform}`);
    }
  };

  const handleSavePost = async () => {
    if (!generatedPost) return;

    try {
      // Save post to storage
      const post = {
        id: `post_${Date.now()}`,
        platform: generatedPost.platform,
        content: generatedPost.content,
        hashtags: generatedPost.hashtags,
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        certificateId: selectedCertificate?.id || '',
      };

      await storage.addPost(post);
      toast.success('Post saved as draft!');
      handlePostComplete();
    } catch (error) {
      console.error('Save post error:', error);
      toast.error('Failed to save post');
    }
  };

  // const handleSettingsUpdate = async (newSettings: Partial<AppSettings>) => {
  //   if (settings) {
  //     const updatedSettings = { ...settings, ...newSettings };
  //     await storage.setSettings(updatedSettings);
  //     setSettings(updatedSettings);
  //   }
  // };

  if (isLoading) {
    return (
      <div className="w-96 h-96 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Postify...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-96 min-h-96 bg-white flex flex-col">
        <Toaster position="top-center" />

        {/* Header */}
        <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6" />
              <h1 className="text-lg font-bold">Postify</h1>
            </div>
            <button
              onClick={() => setCurrentView('settings')}
              className="p-1 hover:bg-blue-500 rounded transition-colors"
              title="Settings"
            >
              <SettingsIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Navigation */}
        {authState.isAuthenticated && (
          <nav className="bg-gray-50 border-b border-gray-200 px-4 py-2">
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentView('certificates')}
                className={`flex items-center space-x-1 px-3 py-1 rounded text-sm font-medium transition-colors ${currentView === 'certificates'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                <Mail className="h-4 w-4" />
                <span>Certificates</span>
              </button>
              <button
                onClick={() => setCurrentView('generator')}
                className={`flex items-center space-x-1 px-3 py-1 rounded text-sm font-medium transition-colors ${currentView === 'generator'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                disabled={!selectedCertificate}
              >
                <Sparkles className="h-4 w-4" />
                <span>Generate</span>
              </button>
              <button
                onClick={() => setCurrentView('poster')}
                className={`flex items-center space-x-1 px-3 py-1 rounded text-sm font-medium transition-colors ${currentView === 'poster'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                disabled={!generatedPost}
              >
                <Share2 className="h-4 w-4" />
                <span>Post</span>
              </button>
            </div>
          </nav>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {!authState.isAuthenticated ? (
            <AuthStatus
              authState={authState}
              onAuthenticate={handleAuthentication}
              onLogout={handleLogout}
            />
          ) : (
            <>
              {currentView === 'certificates' && (
                <CertificateList
                  certificates={certificates}
                  onScanGmail={handleScanGmail}
                  onGeneratePost={handleGeneratePost}
                  onDeleteCertificate={async (certificateId: string) => {
                    await storage.removeCertificate(certificateId);
                    setCertificates(prev => prev.filter(c => c.id !== certificateId));
                  }}
                />
              )}

              {currentView === 'generator' && selectedCertificate && (
                <PostGenerator
                  certificate={selectedCertificate}
                  onPostGenerated={handlePostGenerated}
                  onClose={() => {
                    setSelectedCertificate(null);
                    setCurrentView('certificates');
                  }}
                />
              )}

              {currentView === 'poster' && generatedPost && (
                <SocialPoster
                  post={generatedPost}
                  onPost={handlePostToSocial}
                  onSave={handleSavePost}
                  onClose={handlePostComplete}
                />
              )}

              {currentView === 'settings' && settings && (
                <Settings
                  settings={settings}
                  onClose={() => setCurrentView('certificates')}
                  onSettingsUpdate={setSettings}
                />
              )}
            </>
          )}
        </main>

        {/* Footer */}
        {authState.isAuthenticated && (
          <footer className="bg-gray-50 border-t border-gray-200 p-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {certificates.length} certificate{certificates.length !== 1 ? 's' : ''} found
              </span>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Sign Out
              </button>
            </div>
          </footer>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
