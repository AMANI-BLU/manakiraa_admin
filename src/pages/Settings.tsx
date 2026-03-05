import React, { useEffect, useState } from 'react';
import { User, Shield, Moon, Sun, Globe, Save } from 'lucide-react';
import { supabase } from '../core/supabase';
import Swal from 'sweetalert2';
import './Settings.css';

const Settings: React.FC = () => {
    const [theme, setTheme] = useState(localStorage.getItem('admin-theme') || 'light');
    const [notifications, setNotifications] = useState(localStorage.getItem('admin-notifications') === 'true');
    const [adminName, setAdminName] = useState('Platform Admin');
    const [currency, setCurrency] = useState(localStorage.getItem('admin-currency') || 'ETB');
    const [loading, setLoading] = useState(true);
    const [adminId, setAdminId] = useState<string | null>(null);

    useEffect(() => {
        fetchAdminProfile();
        // Set initial theme
        document.documentElement.setAttribute('data-theme', theme);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('admin-theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('admin-currency', currency);
    }, [currency]);

    const fetchAdminProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setAdminId(user.id);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();

                if (data && !error) {
                    setAdminName(data.full_name || 'Admin User');
                }
            }
        } catch (error) {
            console.error('Error fetching admin profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (adminId) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ full_name: adminName })
                    .eq('id', adminId);

                if (error) throw error;
            }

            localStorage.setItem('admin-notifications', String(notifications));

            Swal.fire({
                title: 'Settings Saved',
                text: 'Your profile information has been updated.',
                icon: 'success',
                confirmButtonColor: 'var(--primary)',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } catch (error: any) {
            Swal.fire('Error', error.message, 'error');
        }
    };

    if (loading) return <div className="loading-state">Loading your preferences...</div>;

    return (
        <div className="settings-page">
            <header className="page-header">
                <div>
                    <h1>System Settings</h1>
                    <p>Configure your administrative preferences and platform defaults.</p>
                </div>
            </header>

            <div className="settings-grid">
                <section className="settings-section glass">
                    <div className="section-header">
                        <User size={20} />
                        <h3>Profile Information</h3>
                    </div>
                    <div className="section-content">
                        <div className="form-group">
                            <label>Display Name</label>
                            <input
                                type="text"
                                value={adminName}
                                onChange={(e) => setAdminName(e.target.value)}
                                placeholder="Enter your name"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input type="email" value="admin@manakiraa.com" disabled />
                            <small>Managed by Supabase Auth</small>
                        </div>
                    </div>
                </section>

                <section className="settings-section glass">
                    <div className="section-header">
                        <Shield size={20} />
                        <h3>Preferences</h3>
                    </div>
                    <div className="section-content">
                        <div className="toggle-group">
                            <div className="toggle-label">
                                <span>Dark Mode</span>
                                <small>Toggle between light and dark themes</small>
                            </div>
                            <button
                                className={`theme-toggle ${theme === 'dark' ? 'dark' : ''}`}
                                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                            >
                                {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                        </div>
                        <div className="toggle-group">
                            <div className="toggle-label">
                                <span>System Notifications</span>
                                <small>Receive alerts for new property verifications</small>
                            </div>
                            <input
                                type="checkbox"
                                checked={notifications}
                                onChange={(e) => setNotifications(e.target.checked)}
                                className="settings-checkbox"
                            />
                        </div>
                    </div>
                </section>

                <section className="settings-section glass">
                    <div className="section-header">
                        <Globe size={20} />
                        <h3>Platform Defaults</h3>
                    </div>
                    <div className="section-content">
                        <div className="form-group">
                            <label>Default Currency</label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                            >
                                <option value="ETB">Ethiopian Birr (ETB)</option>
                                <option value="USD">US Dollar (USD)</option>
                            </select>
                        </div>
                    </div>
                </section>
            </div>

            <div className="settings-actions">
                <button className="btn-save" onClick={handleSave}>
                    <Save size={18} />
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default Settings;
