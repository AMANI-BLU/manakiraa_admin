import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Home, Users, CheckCircle, Settings, LogOut, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../core/supabase';
import './Sidebar.css';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const navItems = [
        { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { to: '/properties', icon: <Home size={20} />, label: 'Properties' },
        { to: '/verifications', icon: <CheckCircle size={20} />, label: 'Verifications' },
        { to: '/users', icon: <Users size={20} />, label: 'Users' },
        { to: '/reports', icon: <TrendingUp size={20} />, label: 'Reports' },
    ];

    return (
        <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-logo">
                <Home size={28} color="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
                <span>ManaKiraa Admin</span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-nav"
                                        className="nav-active-bg"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                                {item.icon}
                                <span>{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}

                <div className="nav-divider" />

                <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
                    {({ isActive }) => (
                        <>
                            {isActive && (
                                <motion.div
                                    layoutId="active-nav"
                                    className="nav-active-bg"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                            <Settings size={20} />
                            <span>Settings</span>
                        </>
                    )}
                </NavLink>
            </nav>

            <button className="sidebar-logout" onClick={handleLogout}>
                <LogOut size={20} />
                <span>Logout</span>
            </button>
        </aside>
    );
};
