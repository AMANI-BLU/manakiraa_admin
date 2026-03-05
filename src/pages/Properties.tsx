import React, { useEffect, useState } from 'react';
import { Search, CheckCircle, XCircle, Eye, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Variants } from 'framer-motion';
import { supabase } from '../core/supabase';
import { Badge } from '../components/ui/Badge';
import Swal from 'sweetalert2';
import './Properties.css';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

const rowVariants: Variants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.3,
            ease: "easeOut"
        }
    }
};

interface Property {
    id: string;
    name: string;
    location: string;
    price: number;
    verification_status: string;
    verification_document_url: string | null;
    created_at: string;
}

const Properties: React.FC = () => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');

    const fetchProperties = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProperties(data || []);
        } catch (error) {
            console.error('Error fetching properties:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, []);

    const handleVerify = async (id: string, status: 'verified' | 'unverified') => {
        try {
            console.log(`Attempting to set ${id} to ${status}`);
            const { error: updateError } = await supabase
                .from('properties')
                .update({
                    verification_status: status,
                    is_verified: status === 'verified'
                })
                .eq('id', id);

            if (updateError) throw updateError;

            Swal.fire({
                title: status === 'verified' ? 'Verified!' : 'Rejected',
                text: `Property status has been updated to ${status}.`,
                icon: status === 'verified' ? 'success' : 'info',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });

            fetchProperties();
        } catch (error) {
            Swal.fire('Error', (error as any).message, 'error');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete "${name}". This cannot be undone!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const { error } = await supabase
                    .from('properties')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                Swal.fire('Deleted!', 'Property has been removed.', 'success');
                fetchProperties();
            } catch (error) {
                Swal.fire('Error', (error as any).message, 'error');
            }
        }
    };

    const filteredProperties = properties.filter(p => {
        const name = p.name || '';
        const location = p.location || '';
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || p.verification_status === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="properties-page">
            <header className="page-header">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1>Property Management</h1>
                    <p>Review listings, verify documents, and manage platform content.</p>
                </motion.div>
                <div className="header-actions">
                    <button className="add-property-btn" onClick={() => navigate('/properties/add')}>
                        <Plus size={20} />
                        <span>Add New Property</span>
                    </button>
                </div>
            </header>

            <motion.div
                className="controls-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search properties..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        Pending
                    </button>
                    <button
                        className={`filter-btn ${filter === 'verified' ? 'active' : ''}`}
                        onClick={() => setFilter('verified')}
                    >
                        Verified
                    </button>
                </div>
            </motion.div>

            <motion.div
                className="table-container glass"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <table className="properties-table">
                    <thead>
                        <tr>
                            <th>Property Name</th>
                            <th>Location</th>
                            <th>Price (ETB)</th>
                            <th>Status</th>
                            <th>Added On</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <motion.tbody
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {loading ? (
                            <tr><td colSpan={6} className="table-loading">Loading listings...</td></tr>
                        ) : filteredProperties.length === 0 ? (
                            <tr><td colSpan={6} className="table-empty">No properties found.</td></tr>
                        ) : (
                            <AnimatePresence>
                                {filteredProperties.map(property => (
                                    <motion.tr
                                        key={property.id}
                                        variants={rowVariants}
                                        exit={{ opacity: 0, x: 20 }}
                                        layout
                                    >
                                        <td className="font-bold">{property.name || 'Unnamed Property'}</td>
                                        <td>{property.location || 'Unknown Location'}</td>
                                        <td>{(property.price || 0).toLocaleString()}</td>
                                        <td>
                                            <Badge variant={property.verification_status as any}>
                                                {property.verification_status}
                                            </Badge>
                                        </td>
                                        <td>{new Date(property.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div className="action-btns">
                                                {property.verification_document_url && (
                                                    <button
                                                        className="action-btn view"
                                                        title="View ID document"
                                                        onClick={() => window.open(property.verification_document_url!, '_blank')}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                )}

                                                {property.verification_status === 'pending' && (
                                                    <>
                                                        <button
                                                            className="action-btn verify"
                                                            title="Approve Verification"
                                                            onClick={() => handleVerify(property.id, 'verified')}
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                        <button
                                                            className="action-btn reject"
                                                            title="Reject Verification"
                                                            onClick={() => handleVerify(property.id, 'unverified')}
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    </>
                                                )}

                                                <button
                                                    className="action-btn delete"
                                                    title="Delete Property"
                                                    onClick={() => handleDelete(property.id, property.name)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        )}
                    </motion.tbody>
                </table>
            </motion.div>
        </div>
    );
};

export default Properties;
