import React, { useEffect, useState } from 'react';
import { Search, Mail, Phone, Calendar, User as UserIcon, UserPlus, UserMinus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { supabase } from '../core/supabase';
import Swal from 'sweetalert2';
import './Users.css';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: "easeOut"
        }
    }
};

interface Profile {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    created_at: string;
    avatar_url: string | null;
    is_active?: boolean;
}

const Users: React.FC = () => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data, error: supabaseError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (supabaseError) throw supabaseError;
            setUsers(data || []);
        } catch (err: any) {
            console.error('Error fetching users:', err);
            setError(err.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleStatusToggle = async (id: string, currentStatus: boolean, name: string) => {
        const action = currentStatus ? 'deactivate' : 'activate';
        const result = await Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} User?`,
            text: `Are you sure you want to ${action} ${name}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: currentStatus ? '#F59E0B' : '#10B981',
            confirmButtonText: `Yes, ${action}!`
        });

        if (result.isConfirmed) {
            try {
                const { error } = await supabase.rpc('admin_set_user_active', {
                    target_user_id: id,
                    set_active: !currentStatus
                });

                if (error) throw error;

                Swal.fire('Updated!', `User has been ${action}d.`, 'success');
                fetchUsers();
            } catch (error) {
                Swal.fire('Error', (error as any).message, 'error');
            }
        }
    };

    const handleDeleteUser = async (id: string, name: string) => {
        const result = await Swal.fire({
            title: 'Delete Entire Account?',
            text: `WARNING: This will permanently delete ${name} from both the database AND Supabase Auth. This action cannot be undone. Continue?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            confirmButtonText: 'Yes, delete profile!'
        });

        if (result.isConfirmed) {
            try {
                const { error } = await supabase.rpc('admin_delete_user', {
                    target_user_id: id
                });

                if (error) throw error;

                Swal.fire('Deleted!', 'User profile has been removed.', 'success');
                fetchUsers();
            } catch (error) {
                Swal.fire('Error', (error as any).message, 'error');
            }
        }
    };

    const filteredUsers = users.filter(u =>
        u.email !== 'admin@manakiraa.com' && (
            (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (u.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (u.phone?.includes(searchTerm))
        )
    );

    return (
        <div className="users-page">
            <motion.header
                className="page-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1>User Management</h1>
                    <p>View and manage registered users on the platform.</p>
                </div>
            </motion.header>

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
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="user-count">
                    Total Users: <strong>{users.filter(u => u.email !== 'admin@manakiraa.com').length}</strong>
                </div>
            </motion.div>

            <motion.div
                className="users-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {error && (
                    <div className="error-message glass" style={{ color: 'var(--error)', padding: '20px', textAlign: 'center', width: '100%', marginBottom: '20px' }}>
                        {error}
                    </div>
                )}
                {loading ? (
                    <div className="loading-state">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="empty-state">No users found.</div>
                ) : (
                    <AnimatePresence>
                        {filteredUsers.map(user => (
                            <motion.div
                                key={user.id}
                                variants={itemVariants}
                                exit={{ opacity: 0, scale: 0.9 }}
                                layout
                                className={`user-card glass ${user.is_active === false ? 'deactivated' : ''}`}
                            >
                                <div className="user-avatar">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.full_name} />
                                    ) : (
                                        <UserIcon size={24} />
                                    )}
                                </div>
                                <div className="user-details">
                                    <div className="user-name-row">
                                        <h3>{user.full_name || 'Unnamed User'}</h3>
                                        {user.is_active === false && <span className="status-badge inactive">Deactivated</span>}
                                    </div>
                                    <div className="user-info-row">
                                        <Mail size={14} />
                                        <span>{user.email || 'No email provided'}</span>
                                    </div>
                                    <div className="user-info-row">
                                        <Phone size={14} />
                                        <span>{user.phone || 'No phone provided'}</span>
                                    </div>
                                    <div className="user-info-row">
                                        <Calendar size={14} />
                                        <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                                    </div>

                                    <div className="user-actions">
                                        <button
                                            className={`action-btn ${user.is_active === false ? 'activate' : 'deactivate'}`}
                                            onClick={() => handleStatusToggle(user.id, user.is_active ?? true, user.full_name)}
                                            title={user.is_active === false ? 'Activate User' : 'Deactivate User'}
                                        >
                                            {user.is_active === false ? <UserPlus size={16} /> : <UserMinus size={16} />}
                                        </button>
                                        <button
                                            className="action-btn delete"
                                            onClick={() => handleDeleteUser(user.id, user.full_name)}
                                            title="Delete Profile"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </motion.div>
        </div>
    );
};

export default Users;
