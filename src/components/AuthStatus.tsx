import { CheckCircle, LogIn, User } from 'lucide-react';
import React from 'react';
import type { AuthState } from '../types';

interface AuthStatusProps {
    authState: AuthState;
    onAuthenticate: () => void;
    onLogout: () => void;
}

const AuthStatus: React.FC<AuthStatusProps> = ({ authState, onAuthenticate, onLogout }) => {
    if (!authState.isAuthenticated) {
        return (
            <div className="p-6 text-center">
                <div className="mb-6">
                    <LogIn className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Welcome to Postify
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Connect your Gmail account to scan for certificates and generate social media posts.
                    </p>
                </div>

                <button
                    onClick={onAuthenticate}
                    className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                    <LogIn className="h-4 w-4" />
                    <span>Sign in with Google</span>
                </button>

                <div className="mt-6 text-xs text-gray-500">
                    <p>We'll scan your Gmail for certificate emails and help you create engaging social media posts.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 bg-green-50 border-b border-green-200">
            <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                    {authState.user?.picture ? (
                        <img
                            src={authState.user.picture}
                            alt={authState.user.name || 'User'}
                            className="h-8 w-8 rounded-full"
                        />
                    ) : (
                        <User className="h-8 w-8 text-green-600" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-medium text-green-900">
                            Connected as {authState.user?.name || authState.user?.email}
                        </p>
                    </div>
                    <p className="text-xs text-green-700">
                        Gmail access granted
                    </p>
                </div>
                <button
                    onClick={onLogout}
                    className="text-xs text-green-700 hover:text-green-900 font-medium"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default AuthStatus;