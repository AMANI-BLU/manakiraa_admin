import React from 'react';
import { Bell, User, Home, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const formatTime = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return past.toLocaleDateString();
};
import './NotificationDropdown.css';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'user' | 'property' | 'system';
    is_read: boolean;
    created_at: string;
    link?: string;
}

interface Props {
    notifications: Notification[];
    onClose: () => void;
    onMarkAsRead: (id: string) => void;
}

export const NotificationDropdown: React.FC<Props> = ({ notifications, onClose, onMarkAsRead }) => {
    const navigate = useNavigate();

    const getIcon = (type: string) => {
        switch (type) {
            case 'user': return <User size={16} className="type-icon user" />;
            case 'property': return <Home size={16} className="type-icon property" />;
            default: return <Info size={16} className="type-icon system" />;
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        onMarkAsRead(notification.id);
        if (notification.link) {
            navigate(notification.link);
        }
        onClose();
    };

    return (
        <div className="notification-dropdown glass">
            <div className="dropdown-header">
                <h3>Notifications</h3>
                <span className="unread-count">
                    {notifications.filter(n => !n.is_read).length} Unread
                </span>
            </div>

            <div className="notification-list">
                {notifications.length === 0 ? (
                    <div className="empty-notifications">
                        <Bell size={32} />
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            <div className="notification-icon">
                                {getIcon(notification.type)}
                            </div>
                            <div className="notification-content">
                                <p className="notification-title">{notification.title}</p>
                                <p className="notification-msg text-truncate">{notification.message}</p>
                                <span className="notification-time">
                                    {formatTime(notification.created_at)}
                                </span>
                            </div>
                            {!notification.is_read && (
                                <div className="unread-dot"></div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="dropdown-footer">
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
};
