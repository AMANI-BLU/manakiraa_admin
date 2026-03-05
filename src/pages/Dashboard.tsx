import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Home, ClipboardCheck, TrendingUp } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../core/supabase';
import './Dashboard.css';

interface Stats {
    totalUsers: number;
    totalProperties: number;
    pendingVerifications: number;
    newListingsToday: number;
    growthRate: string;
}

interface Activity {
    id: string;
    type: 'user' | 'property';
    title: string;
    subtitle: string;
    timestamp: string;
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend: string;
    color: string;
    isAction?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color, isAction }) => {
    return (
        <div className={`stat-card ${isAction ? 'pulse' : ''}`}>
            <div className={`stat-icon ${color}`}>
                {icon}
            </div>
            <div className="stat-info">
                <span className="stat-title">{title}</span>
                <span className="stat-value">{value}</span>
                <span className="stat-trend">{trend}</span>
            </div>
        </div>
    );
};

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats>({
        totalUsers: 0,
        totalProperties: 0,
        pendingVerifications: 0,
        newListingsToday: 0,
        growthRate: '0%'
    });
    const [activities, setActivities] = useState<Activity[]>([]);

    const fetchStats = async () => {
        try {
            // 1. Fetch Basic Totals
            const [profilesRes, propertiesRes, pendingRes] = await Promise.all([
                supabase.from('profiles').select('email', { count: 'exact', head: true }),
                supabase.from('properties').select('*', { count: 'exact', head: true }),
                supabase.from('properties').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending')
            ]);

            if (profilesRes.error) throw new Error(`Profiles: ${profilesRes.error.message}`);
            if (propertiesRes.error) throw new Error(`Properties: ${propertiesRes.error.message}`);
            if (pendingRes.error) throw new Error(`Pending: ${pendingRes.error.message}`);

            // 2. Fetch Listings Today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count: todayCount, error: todayError } = await supabase
                .from('properties')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());

            if (todayError) throw todayError;

            // 3. Simple Growth Logic
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            const { count: lastWeekCount, error: lastWeekError } = await supabase
                .from('properties')
                .select('*', { count: 'exact', head: true })
                .lte('created_at', lastWeek.toISOString());

            if (lastWeekError) throw lastWeekError;

            const currentTotal = propertiesRes.count || 0;
            const previousTotal = lastWeekCount || 0;
            const growth = previousTotal > 0
                ? ((currentTotal - previousTotal) / previousTotal * 100).toFixed(1) + '%'
                : 'stable';

            // 4. Fetch Recent Activity
            const [recentUsersRes, recentPropertiesRes] = await Promise.all([
                supabase.from('profiles').select('id, full_name, email, created_at').order('created_at', { ascending: false }).limit(6),
                supabase.from('properties').select('id, name, created_at').order('created_at', { ascending: false }).limit(6)
            ]);

            if (recentUsersRes.error) throw recentUsersRes.error;
            if (recentPropertiesRes.error) throw recentPropertiesRes.error;

            const filteredRecentUsers = (recentUsersRes.data || [])
                .filter(u => u.email !== 'admin@manakiraa.com');

            const combinedActivity: Activity[] = [
                ...filteredRecentUsers.map(u => ({
                    id: u.id,
                    type: 'user' as const,
                    title: `New User: ${u.full_name || 'Anonymous'}`,
                    subtitle: 'Joined the platform',
                    timestamp: u.created_at
                })),
                ...(recentPropertiesRes.data || []).map(p => ({
                    id: p.id,
                    type: 'property' as const,
                    title: `New Property: ${p.name}`,
                    subtitle: 'Awaiting verification',
                    timestamp: p.created_at
                }))
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6);

            setStats({
                totalUsers: (profilesRes.count || 0) > 0 ? profilesRes.count! - 1 : 0, // Quick hack for admin
                totalProperties: propertiesRes.count || 0,
                pendingVerifications: pendingRes.count || 0,
                newListingsToday: todayCount || 0,
                growthRate: growth
            });
            setActivities(combinedActivity);
        } catch (err: any) {
            console.error('Error fetching dashboard stats:', err);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1>Dashboard Overview</h1>
                    <p>Monitoring ManaKiraa platform activity and growth.</p>
                </div>
                <button className="refresh-btn" onClick={fetchStats}>Refresh Data</button>
            </header>

            <div className="stats-grid">
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={<Users size={24} />}
                    trend={`${stats.newListingsToday} today`}
                    color="blue"
                />
                <StatCard
                    title="Total Properties"
                    value={stats.totalProperties}
                    icon={<Home size={24} />}
                    trend={stats.growthRate}
                    color="green"
                />
                <StatCard
                    title="Pending"
                    value={stats.pendingVerifications}
                    icon={<ClipboardCheck size={24} />}
                    trend="Action required"
                    color="orange"
                    isAction={stats.pendingVerifications > 0}
                />
                <StatCard
                    title="Platform Activity"
                    value={activities.length}
                    icon={<TrendingUp size={24} />}
                    trend="Recent"
                    color="purple"
                />
            </div>

            <div className="dashboard-layout">
                <div className="dashboard-main">
                    <div className="dashboard-card latest-activity">
                        <div className="card-header">
                            <h3>Recent System Activity</h3>
                            <TrendingUp size={18} className="text-muted" />
                        </div>
                        <div className="activity-list">
                            {activities.length > 0 ? (
                                activities.map(activity => (
                                    <div
                                        key={`${activity.type}-${activity.id}`}
                                        className="activity-item clickable"
                                        onClick={() => navigate(activity.type === 'user' ? '/users' : '/properties')}
                                    >
                                        <div className={`activity-dot ${activity.type === 'user' ? 'bg-blue' : 'bg-green'}`}></div>
                                        <div className="activity-info">
                                            <p className="activity-title">{activity.title}</p>
                                            <p className="activity-subtitle">{activity.subtitle}</p>
                                        </div>
                                        <span className="activity-time">
                                            {new Date(activity.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state">No recent activity detected.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="dashboard-sidebar">
                    <div className="dashboard-card quick-actions">
                        <h3>Quick Actions</h3>
                        <div className="actions-list">
                            <button className="action-item" onClick={() => navigate('/properties')}>
                                <ClipboardCheck size={18} />
                                <span>Verify Properties</span>
                            </button>
                            <button className="action-item" onClick={() => navigate('/users')}>
                                <Users size={18} />
                                <span>Manage Users</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
