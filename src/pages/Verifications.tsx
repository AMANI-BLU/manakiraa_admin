import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Eye, Clock } from 'lucide-react';
import { supabase } from '../core/supabase';
import { Badge } from '../components/ui/Badge';
import Swal from 'sweetalert2';
import './Verifications.css';

interface Property {
    id: string;
    name: string;
    location: string;
    price: number;
    verification_status: string;
    verification_document_url: string | null;
    created_at: string;
    owner_id: string;
}

const Verifications: React.FC = () => {
    const [pendingProperties, setPendingProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPendingProperties = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('verification_status', 'pending')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setPendingProperties(data || []);
        } catch (error) {
            console.error('Error fetching pending verifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingProperties();
    }, []);

    const handleAction = async (id: string, status: 'verified' | 'unverified') => {
        try {
            const { error: updateError } = await supabase
                .from('properties')
                .update({
                    verification_status: status,
                    is_verified: status === 'verified'
                })
                .eq('id', id);

            if (updateError) throw updateError;

            Swal.fire({
                title: status === 'verified' ? 'Approved!' : 'Rejected',
                text: `Verification has been ${status}.`,
                icon: status === 'verified' ? 'success' : 'info',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });

            fetchPendingProperties();
        } catch (error) {
            Swal.fire('Error', (error as any).message, 'error');
        }
    };

    return (
        <div className="verifications-page">
            <header className="page-header">
                <div>
                    <h1>Pending Verifications</h1>
                    <p>Review and approve National ID documents for property owners.</p>
                </div>
            </header>

            <div className="verifications-list">
                {loading ? (
                    <div className="loading-state">Loading pending verifications...</div>
                ) : pendingProperties.length === 0 ? (
                    <div className="empty-state glass">
                        <CheckCircle size={48} color="var(--success)" strokeWidth={1} />
                        <h3>All Caught Up!</h3>
                        <p>There are no pending verification requests at the moment.</p>
                    </div>
                ) : (
                    <div className="grid-layout">
                        {pendingProperties.map(property => (
                            <div key={property.id} className="verification-card glass">
                                <div className="card-header">
                                    <Badge variant="pending">Pending Review</Badge>
                                    <span className="timestamp">
                                        <Clock size={12} />
                                        {new Date(property.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="property-preview">
                                    <h3>{property.name}</h3>
                                    <p>{property.location}</p>
                                </div>

                                <div className="document-preview">
                                    {property.verification_document_url ? (
                                        <div className="id-image-container" onClick={() => window.open(property.verification_document_url!, '_blank')}>
                                            <img src={property.verification_document_url} alt="National ID" />
                                            <div className="overlay">
                                                <Eye size={20} />
                                                <span>Click to Expand</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="no-document">No document uploaded</div>
                                    )}
                                </div>

                                <div className="card-actions">
                                    <button
                                        className="btn-approve"
                                        onClick={() => handleAction(property.id, 'verified')}
                                    >
                                        <CheckCircle size={18} />
                                        Approve
                                    </button>
                                    <button
                                        className="btn-reject"
                                        onClick={() => handleAction(property.id, 'unverified')}
                                    >
                                        <XCircle size={18} />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Verifications;
