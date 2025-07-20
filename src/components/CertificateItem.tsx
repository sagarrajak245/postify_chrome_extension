import { Building, Calendar, MoreVertical, Sparkles, Tag, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import type { Certificate } from '../types';

interface CertificateItemProps {
    certificate: Certificate;
    onGeneratePost: (certificate: Certificate) => void;
    onDelete: (certificateId: string) => Promise<void>;
}

const CertificateItem: React.FC<CertificateItemProps> = ({
    certificate,
    onGeneratePost,
    onDelete
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this certificate?')) {
            setIsDeleting(true);
            try {
                await onDelete(certificate.id);
            } finally {
                setIsDeleting(false);
            }
        }
        setShowMenu(false);
    };

    const handleGeneratePost = () => {
        onGeneratePost(certificate);
    };

    return (
        <div className="p-4 hover:bg-gray-50 transition-colors relative">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    {/* Title and Issuer */}
                    <div className="mb-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                            {certificate.title}
                        </h3>
                        <div className="flex items-center space-x-1 mt-1">
                            <Building className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600">{certificate.issuer}</span>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center space-x-1 mb-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{certificate.date}</span>
                    </div>

                    {/* Description */}
                    {certificate.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {certificate.description}
                        </p>
                    )}

                    {/* Skills */}
                    {certificate.skills.length > 0 && (
                        <div className="flex items-center space-x-1 mb-3">
                            <Tag className="h-3 w-3 text-gray-400" />
                            <div className="flex flex-wrap gap-1">
                                {certificate.skills.slice(0, 3).map((skill, index) => (
                                    <span
                                        key={index}
                                        className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full"
                                    >
                                        {skill}
                                    </span>
                                ))}
                                {certificate.skills.length > 3 && (
                                    <span className="text-xs text-gray-500">
                                        +{certificate.skills.length - 3} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleGeneratePost}
                            className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            <Sparkles className="h-3 w-3" />
                            <span>Generate Post</span>
                        </button>
                    </div>
                </div>

                {/* Menu */}
                <div className="relative ml-2">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                        <MoreVertical className="h-4 w-4" />
                    </button>

                    {showMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMenu(false)}
                            />
                            <div className="absolute right-0 top-6 z-20 w-32 bg-white rounded-md shadow-lg border border-gray-200 py-1">
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex items-center space-x-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CertificateItem;