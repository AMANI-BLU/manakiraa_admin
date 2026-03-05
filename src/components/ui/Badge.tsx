import React from 'react';
import './Badge.css';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'verified' | 'pending' | 'unverified' | 'info' | 'error' | 'success';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'info' }) => {
    return (
        <span className={`badge badge-${variant}`}>
            {children}
        </span>
    );
};
