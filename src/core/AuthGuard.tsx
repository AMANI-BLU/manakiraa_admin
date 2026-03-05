import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { supabase } from '../core/supabase';

interface AuthGuardProps {
    children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const [session, setSession] = useState<any>(null);
    const [profileActive, setProfileActive] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    const statusChannelRef = React.useRef<any>(null);

    useEffect(() => {
        let mounted = true;

        const setupRealtimeSubscription = (uid: string) => {
            if (statusChannelRef.current) {
                console.log('Cleaning up existing status channel...');
                statusChannelRef.current.unsubscribe();
            }

            console.log(`Setting up Realtime for user: ${uid}`);

            const channel = supabase
                .channel(`profile-status-${uid}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*', // UPDATE and DELETE
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${uid}`
                    },
                    async (payload) => {
                        console.log('--- REALTIME EVENT RECEIVED ---');
                        console.log('Event Type:', payload.eventType);
                        console.log('New Data:', payload.new);

                        // MASTER ADMIN EXEMPTION
                        const { data: { session: currentSession } } = await supabase.auth.getSession();
                        if (currentSession?.user?.email === 'admin@manakiraa.com') {
                            console.log('Admin account detected, ignoring realtime deactivation.');
                            return;
                        }

                        if (payload.eventType === 'UPDATE') {
                            if (payload.new && payload.new.is_active === false) {
                                console.log('CRITICAL: Account deactivated via Realtime! Forcing logout.');
                                setProfileActive(false);
                                await supabase.auth.signOut();
                            } else if (payload.new && payload.new.is_active === true) {
                                console.log('Account activated via Realtime.');
                                setProfileActive(true);
                            }
                        }

                        if (payload.eventType === 'DELETE') {
                            console.log('CRITICAL: Account deleted via Realtime! Forcing logout.');
                            setProfileActive(false);
                            await supabase.auth.signOut();
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`Realtime Subscription Status for ${uid}:`, status);
                });

            statusChannelRef.current = channel;
            return channel;
        };

        const checkProfileStatus = async (uid: string, email?: string) => {
            if (email === 'admin@manakiraa.com') {
                console.log('Master Admin detected, bypassing profile check.');
                setProfileActive(true);
                setLoading(false);
                return;
            }

            console.log(`Initial profile check for ${uid}...`);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('is_active')
                    .eq('id', uid)
                    .single();

                if (mounted) {
                    if (error) {
                        console.error("Profile check error:", error);
                        setProfileActive(true); // Default to active if missing
                    } else {
                        console.log('Profile status:', data?.is_active);
                        setProfileActive(data?.is_active ?? true);
                        if (data?.is_active === false) {
                            console.log('Initial check: Account is inactive! Signing out.');
                            await supabase.auth.signOut();
                        }
                    }
                    setLoading(false);
                }
            } catch (err) {
                console.error("Catch in checkProfileStatus:", err);
                if (mounted) setLoading(false);
            }
        };

        const initAuth = async () => {
            const { data: { session: initialSession } } = await supabase.auth.getSession();
            if (mounted) {
                setSession(initialSession);
                if (initialSession) {
                    await checkProfileStatus(initialSession.user.id, initialSession.user.email);
                    setupRealtimeSubscription(initialSession.user.id);
                } else {
                    setLoading(false);
                }
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            console.log('Auth state changed:', _event);
            if (mounted) {
                setSession(newSession);
                if (newSession) {
                    checkProfileStatus(newSession.user.id, newSession.user.email);
                    setupRealtimeSubscription(newSession.user.id);
                } else {
                    setProfileActive(null);
                    setLoading(false);
                    if (statusChannelRef.current) {
                        statusChannelRef.current.unsubscribe();
                        statusChannelRef.current = null;
                    }
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
            if (statusChannelRef.current) {
                statusChannelRef.current.unsubscribe();
            }
        };
    }, []);

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-main)',
                color: 'var(--text-muted)',
                fontFamily: 'inherit'
            }}>
                <div className="spinner" style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid var(--shadow-sm)',
                    borderTop: '4px solid var(--primary)',
                    borderRadius: '50%',
                    marginBottom: '20px'
                }}></div>
                <p style={{ fontWeight: 600 }}>Connecting to ManaKiraa Admin...</p>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check for blocked status first
    if (profileActive === false) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '20px',
                background: 'var(--bg-main)'
            }}>
                <div style={{ padding: '24px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', marginBottom: '24px' }}>
                    <Shield size={48} color="var(--error)" />
                </div>
                <h1 style={{ color: 'var(--error)', marginBottom: '10px' }}>Account Deactivated</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '400px' }}>
                    Your administrative access has been suspended. Please contact the system owner if you believe this is an error.
                </p>
                <button
                    onClick={() => supabase.auth.signOut()}
                    style={{
                        padding: '12px 32px',
                        background: 'var(--error)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    Return to Login
                </button>
            </div>
        );
    }

    // Check for admin status in both metadata locations
    const appRole = session.user.app_metadata?.role;
    const userRole = session.user.user_metadata?.role;
    const isAdmin = appRole === 'admin' || userRole === 'admin' || session.user.email === 'admin@manakiraa.com';

    if (!isAdmin) {
        console.log('Access Denied. User Data:', {
            email: session.user.email,
            appMetadata: session.user.app_metadata,
            userMetadata: session.user.user_metadata
        });

        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '20px',
                background: 'var(--bg-main)'
            }}>
                <h1 style={{ color: 'var(--error)', marginBottom: '10px' }}>Unauthorized</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Administrative access only.</p>
                <button
                    onClick={() => supabase.auth.signOut()}
                    style={{
                        padding: '10px 24px',
                        background: 'var(--secondary)',
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: 600
                    }}
                >
                    Log Out & Try Again
                </button>
            </div>
        );
    }

    return <>{children}</>;
};
