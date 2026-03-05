import React, { useEffect, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { Download, RefreshCw } from 'lucide-react';
import { supabase } from '../core/supabase';
import './Reports.css';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

interface ChartData {
    name: string;
    value: number;
}

interface TrendData {
    month: string;
    users: number;
    properties: number;
}

const Reports: React.FC = () => {
    const [trendData, setTrendData] = useState<TrendData[]>([]);
    const [categoryData, setCategoryData] = useState<ChartData[]>([]);
    const [statusData, setStatusData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReportData = async () => {
        try {
            setLoading(true);

            // 1. Fetch User Registration Trends (Last 6 Months)
            const { data: users } = await supabase
                .from('profiles')
                .select('created_at');

            const { data: properties } = await supabase
                .from('properties')
                .select('created_at, type');

            // Process Trends
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const last6Months = Array.from({ length: 6 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                return {
                    month: months[date.getMonth()],
                    year: date.getFullYear(),
                    users: 0,
                    properties: 0,
                    timestamp: date.getTime()
                };
            }).reverse();

            users?.forEach(u => {
                const d = new Date(u.created_at);
                const m = months[d.getMonth()];
                const y = d.getFullYear();
                const match = last6Months.find(l => l.month === m && l.year === y);
                if (match) match.users++;
            });

            properties?.forEach(p => {
                const d = new Date(p.created_at);
                const m = months[d.getMonth()];
                const y = d.getFullYear();
                const match = last6Months.find(l => l.month === m && l.year === y);
                if (match) match.properties++;
            });

            setTrendData(last6Months.map(l => ({ month: l.month, users: l.users, properties: l.properties })));

            // 2. Process Categories (Real Data)
            const categories: Record<string, number> = {};
            properties?.forEach(p => {
                const cat = (p as any).type || 'Other';
                categories[cat] = (categories[cat] || 0) + 1;
            });
            setCategoryData(Object.entries(categories).map(([name, value]) => ({ name, value })));

            // 3. Process Verification Status (Real Data)
            const { data: statusCounts } = await supabase
                .from('properties')
                .select('verification_status');

            const statuses: Record<string, number> = {};
            statusCounts?.forEach(s => {
                const status = s.verification_status || 'pending';
                statuses[status] = (statuses[status] || 0) + 1;
            });
            setStatusData(Object.entries(statuses).map(([name, value]) => ({ name, value })));

        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        const headers = ['Month', 'New Users', 'New Properties'];
        const csvContent = [
            headers.join(','),
            ...trendData.map(row => `${row.month},${row.users},${row.properties}`)
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `manakiraa_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    useEffect(() => {
        fetchReportData();
    }, []);

    if (loading) return <div className="loading-state">Generating platform reports...</div>;

    return (
        <div className="reports-page">
            <header className="page-header">
                <div>
                    <h1>Platform Reports</h1>
                    <p>Visualizing growth and distribution across ManaKiraa.</p>
                </div>
                <div className="header-actions">
                    <button className="icon-btn secondary" onClick={downloadCSV} title="Export CSV">
                        <Download size={20} />
                        <span>Export CSV</span>
                    </button>
                    <button className={`icon-btn primary ${loading ? 'spinning' : ''}`} onClick={fetchReportData} title="Refresh Data">
                        <RefreshCw size={20} />
                        <span>Refresh Data</span>
                    </button>
                </div>
            </header>

            <div className="reports-grid">
                {/* Growth Trend */}
                <div className="report-card glass wide">
                    <h3>Growth Trends (Last 6 Months)</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} name="New Users" />
                                <Line type="monotone" dataKey="properties" stroke="#10B981" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} name="New Properties" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Categories Pie */}
                <div className="report-card glass">
                    <h3>Property Categories</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {categoryData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Verification Status */}
                <div className="report-card glass">
                    <h3>Verification Overview</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={statusData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Count" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
