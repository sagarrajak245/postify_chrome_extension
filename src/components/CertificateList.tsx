import { Mail, Plus, RefreshCw, Search } from 'lucide-react';
import React, { useState } from 'react';
import type { Certificate } from '../types';
import CertificateItem from './CertificateItem';

interface CertificateListProps {
    certificates: Certificate[];
    onScanGmail: () => Promise<void>;
    onGeneratePost: (certificate: Certificate) => void;
    onDeleteCertificate: (certificateId: string) => Promise<void>;
}

const CertificateList: React.FC<CertificateListProps> = ({
    certificates,
    onScanGmail,
    onGeneratePost,
    onDeleteCertificate
}) => {
    const [isScanning, setIsScanning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleScanGmail = async () => {
        setIsScanning(true);
        try {
            await onScanGmail();
        } finally {
            setIsScanning(false);
        }
    };

    const filteredCertificates = certificates.filter(cert =>
        cert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.issuer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (certificates.length === 0) {
        return (
            <div className="p-6 text-center">
                <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No certificates found
                </h3>
                <p className="text-gray-600 mb-6">
                    Scan your Gmail to find certificate and achievement emails.
                </p>
                <button
                    onClick={handleScanGmail}
                    disabled={isScanning}
                    className="btn-primary flex items-center space-x-2 mx-auto"
                >
                    <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>{isScanning ? 'Scanning...' : 'Scan Gmail'}</span>
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Your Certificates
                    </h2>
                    <button
                        onClick={handleScanGmail}
                        disabled={isScanning}
                        className="btn-secondary flex items-center space-x-1 text-sm"
                        title="Scan Gmail for new certificates"
                    >
                        <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
                        <span>Scan</span>
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search certificates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field pl-10 text-sm"
                    />
                </div>
            </div>

            {/* Certificate List */}
            <div className="flex-1 overflow-y-auto">
                {filteredCertificates.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        <p>No certificates match your search.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredCertificates.map((certificate) => (
                            <CertificateItem
                                key={certificate.id}
                                certificate={certificate}
                                onGeneratePost={onGeneratePost}
                                onDelete={onDeleteCertificate}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                        {filteredCertificates.length} of {certificates.length} certificate{certificates.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center space-x-1">
                        <Plus className="h-3 w-3" />
                        <span>Scan for more</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CertificateList;