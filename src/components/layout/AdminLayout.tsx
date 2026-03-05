import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '../common/PageTransition';
import { supabase } from '../../core/supabase';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import type { Notification } from '../notifications/NotificationDropdown';
import './AdminLayout.css';

const AdminLayout: React.FC = () => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [adminName, setAdminName] = useState('Admin User');
    const [notifications, setNotifications] = useState<Notification[]>([]);
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
                            <button className="bell-btn" onClick={() => setIsNotificationOpen(!isNotificationOpen)}>
                                <Bell size={20} />
                                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                            </button>
                            {isNotificationOpen && (
                                <NotificationDropdown
                                    notifications={notifications}
                                    onClose={() => setIsNotificationOpen(false)}
                                    onMarkAsRead={markAsRead}
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
                <section className="admin-content">
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
