import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Bell, MessageSquare } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '../common/PageTransition';
import { supabase } from '../../core/supabase';
import Swal from 'sweetalert2';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import type { Notification } from '../notifications/NotificationDropdown';
import './AdminLayout.css';

const AdminLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [adminName, setAdminName] = useState('Admin User');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();
                if (data?.full_name) setAdminName(data.full_name);

                // Fetch unread messages count
                const { count } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('receiver_id', user.id)
                    .eq('is_read', false);

                setUnreadMessagesCount(count || 0);

                // Subscribe to message changes
                const msgChannel = supabase
                    .channel('unread-messages')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'messages',
                        filter: `receiver_id=eq.${user.id}`
                    }, async () => {
                        const { count: newCount } = await supabase
                            .from('messages')
                            .select('*', { count: 'exact', head: true })
                            .eq('receiver_id', user.id)
                            .eq('is_read', false);
                        setUnreadMessagesCount(newCount || 0);
                    })
                    .subscribe();

                return () => {
                    supabase.removeChannel(msgChannel);
                };
            }
        };

        const fetchNotifications = async () => {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            if (data) setNotifications(data);
        };

        fetchProfile();
        fetchNotifications();

        // Subscribe to real-time notification changes
        const channel = supabase
            .channel('public:notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
                setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 10));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const markAsRead = async (id: string) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const clearNotifications = async () => {
        const result = await Swal.fire({
            title: 'Clear all notifications?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary)',
            cancelButtonColor: 'var(--error)',
            confirmButtonText: 'Yes, clear all',
            cancelButtonText: 'Cancel',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (result.isConfirmed) {
            try {
                // Using .is('id', 'not', null) is a safer way to target all rows in Supabase logic
                const { error } = await supabase.from('notifications').delete().not('id', 'is', null);

                if (error) throw error;

                setNotifications([]);
                Swal.fire({
                    title: 'Cleared!',
                    text: 'Your notifications have been cleared.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });
            } catch (error: any) {
                console.error('Error clearing notifications:', error);
                Swal.fire({
                    title: 'Error',
                    text: error.message || 'Failed to clear notifications',
                    icon: 'error',
                    confirmButtonColor: 'var(--primary)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                });
            }
        }
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className={`admin-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Mobile Overlay */}
            {isSidebarOpen && <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)} />}

            <main className="admin-main">
                <header className="admin-header">
                    <button className="mobile-toggle" onClick={toggleSidebar}>
                        <Menu size={24} />
                    </button>
                    <div className="header-search">
                        <input type="text" placeholder="Search for properties, users..." />
                    </div>
                    <div className="header-profile">
                        <div className="notification-container">
                            <button className="bell-btn" onClick={() => navigate('/messages')} style={{ marginRight: '10px' }}>
                                <MessageSquare size={20} />
                                {unreadMessagesCount > 0 && <span className="notification-badge">{unreadMessagesCount}</span>}
                            </button>
                            <button className="bell-btn" onClick={() => setIsNotificationOpen(!isNotificationOpen)}>
                                <Bell size={20} />
                                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                            </button>
                            {isNotificationOpen && (
                                <NotificationDropdown
                                    notifications={notifications}
                                    onClose={() => setIsNotificationOpen(false)}
                                    onMarkAsRead={markAsRead}
                                    onClearAll={clearNotifications}
                                />
                            )}
                        </div>
                        <div className="profile-info">
                            <span className="profile-name">{adminName}</span>
                            <span className="profile-role">Super Admin</span>
                        </div>
                        <div className="profile-avatar">{adminName.charAt(0)}</div>
                    </div>
                </header>
                <section className={`admin-content ${location.pathname === '/messages' ? 'no-padding' : ''}`}>
                    <AnimatePresence mode="wait">
                        <PageTransition key={location.pathname}>
                            <Outlet />
                        </PageTransition>
                    </AnimatePresence>
                </section>
            </main>
        </div>
    );
};

export default AdminLayout;
