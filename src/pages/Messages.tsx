import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, Home, ArrowLeft, MoreVertical, Phone, Trash2, Edit2, X, Check } from 'lucide-react';
import { supabase } from '../core/supabase';
import { format } from 'date-fns';
import './Messages.css';

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    property_id?: string;
    is_read: boolean;
}

interface Conversation {
    other_user_id: string;
    other_user_name: string;
    other_user_avatar: string;
    last_message: string;
    last_message_time: string;
    unread_count: number;
}

const Messages: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [adminId, setAdminId] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const showConfirm = (message: string, onConfirm: () => void) => {
        setConfirmDialog({ message, onConfirm });
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchUserAndConversations = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setAdminId(user.id);
                await fetchConversations(user.id);

                // Check for UID in URL to auto-select a user
                const urlParams = new URLSearchParams(window.location.search);
                const uid = urlParams.get('uid');
                if (uid) {
                    setSelectedUserId(uid);
                    // Remove param from URL without reload
                    window.history.replaceState({}, '', window.location.pathname);
                }
            }
        };

        fetchUserAndConversations();

        // Subscribe to messages for real-time updates
        const channel = supabase
            .channel('messages-all')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
                if (adminId) fetchConversations(adminId);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [adminId]);

    useEffect(() => {
        if (selectedUserId && adminId) {
            fetchMessages(selectedUserId);

            const channel = supabase
                .channel(`messages-${selectedUserId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'messages'
                }, (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newMsg = payload.new as Message;
                        const isFromTarget = newMsg.sender_id === selectedUserId && newMsg.receiver_id === adminId;
                        const isFromMe = newMsg.sender_id === adminId && newMsg.receiver_id === selectedUserId;

                        if (isFromTarget || isFromMe) {
                            setMessages(prev => {
                                if (prev.some(m => m.id === newMsg.id)) return prev;
                                if (isFromMe) {
                                    const match = prev.slice(-5).find(m => m.content === newMsg.content && m.sender_id === adminId && m.id.length > 30);
                                    if (match) return prev.map(m => m.id === match.id ? newMsg : m);
                                }
                                return [...prev, newMsg];
                            });
                            if (isFromTarget) markAsRead(selectedUserId);
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedMsg = payload.new as Message;
                        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
                    } else if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as any).id;
                        setMessages(prev => prev.filter(m => m.id !== deletedId));
                    }
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [selectedUserId, adminId]);

    useEffect(scrollToBottom, [messages]);

    const fetchConversations = async (userId: string) => {
        try {
            // This is a complex query to get unique conversations
            // In a real app, you might have a 'conversations' table
            const { data, error } = await supabase
                .from('messages')
                .select('sender_id, receiver_id, content, created_at, is_read')
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const convMap = new Map<string, Conversation>();

            for (const msg of data) {
                const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
                if (!convMap.has(otherId)) {
                    convMap.set(otherId, {
                        other_user_id: otherId,
                        other_user_name: 'Loading...', // Will fetch profiles next
                        other_user_avatar: '',
                        last_message: msg.content,
                        last_message_time: msg.created_at,
                        unread_count: (msg.receiver_id === userId && !msg.is_read) ? 1 : 0
                    });
                } else if (msg.receiver_id === userId && !msg.is_read) {
                    const existing = convMap.get(otherId)!;
                    existing.unread_count++;
                }
            }

            const convArray = Array.from(convMap.values());

            // Fetch profiles for names/avatars
            const profileIds = convArray.map(c => c.other_user_id);
            if (profileIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', profileIds);

                if (profiles) {
                    profiles.forEach(p => {
                        const conv = convArray.find(c => c.other_user_id === p.id);
                        if (conv) {
                            conv.other_user_name = p.full_name || 'User';
                            conv.other_user_avatar = p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other_user_name)}&background=random`;
                        }
                    });
                }
            }

            // If a selectedUserId was passed via URL but doesn't have a conversation yet,
            // we need to fetch their profile and add a temporary conversation item?
            // Or just rely on fetchMessages which will work if they exist.
            const urlParams = new URLSearchParams(window.location.search);
            const uid = urlParams.get('uid');
            if (uid && !convArray.some(c => c.other_user_id === uid)) {
                const { data: p } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .eq('id', uid)
                    .single();

                if (p) {
                    convArray.unshift({
                        other_user_id: p.id,
                        other_user_name: p.full_name || 'User',
                        other_user_avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || 'User')}&background=random`,
                        last_message: 'Start a new conversation',
                        last_message_time: new Date().toISOString(),
                        unread_count: 0
                    });
                }
            }

            setConversations(convArray);
        } catch (err) {
            console.error('Error fetching conversations:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (otherId: string) => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${adminId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${adminId})`)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
            markAsRead(otherId);
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    const markAsRead = async (otherId: string) => {
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('sender_id', otherId)
            .eq('receiver_id', adminId)
            .eq('is_read', false);
    };

    const handleDeleteConversation = (otherId: string) => {
        showConfirm('Delete this entire conversation? This cannot be undone.', async () => {
            try {
                const { error } = await supabase
                    .from('messages')
                    .delete()
                    .or(`and(sender_id.eq.${adminId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${adminId})`);
                if (error) throw error;
                if (selectedUserId === otherId) setSelectedUserId(null);
                fetchConversations(adminId!);
            } catch (err) {
                console.error('Error deleting conversation:', err);
            }
        });
    };

    const handleDeleteMessage = (msgId: string) => {
        setActiveMenuMessageId(null);
        showConfirm('Delete this message?', async () => {
            try {
                const { error } = await supabase.from('messages').delete().eq('id', msgId);
                if (error) throw error;
                setMessages(prev => prev.filter(m => m.id !== msgId));
            } catch (err) {
                console.error('Error deleting message:', err);
            }
        });
    };

    const startEditMessage = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditContent(msg.content);
        setActiveMenuMessageId(null);
    };

    const handleUpdateMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!editingMessageId || !editContent.trim()) return;

        try {
            const { error } = await supabase
                .from('messages')
                .update({ content: editContent.trim() })
                .eq('id', editingMessageId);

            if (error) throw error;
            setEditingMessageId(null);
            setEditContent('');
        } catch (err) {
            console.error('Error updating message:', err);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUserId || !adminId) return;

        const messageText = newMessage.trim();
        setNewMessage('');

        // Optimistic update
        const tempId = crypto.randomUUID();
        const optimisticMsg: Message = {
            id: tempId,
            sender_id: adminId,
            receiver_id: selectedUserId,
            content: messageText,
            created_at: new Date().toISOString(),
            is_read: false
        };

        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const { error } = await supabase.from('messages').insert({
                sender_id: adminId,
                receiver_id: selectedUserId,
                content: messageText
            });

            if (error) {
                setMessages(prev => prev.filter(m => m.id !== tempId));
                throw error;
            }
        } catch (err) {
            console.error('Error sending message:', err);
        }
    };

    const selectedConv = conversations.find(c => c.other_user_id === selectedUserId);

    return (
        <>
            <div className="messages-container">
                <div className={`conversations-sidebar ${selectedUserId ? 'hidden-mobile' : ''}`}>
                    <div className="sidebar-header">
                        <h2>Messages</h2>
                        <div className="search-bar">
                            <Search size={18} />
                            <input type="text" placeholder="Search chats..." />
                        </div>
                    </div>

                    <div className="conversations-list">
                        {loading ? (
                            <div className="loading-state">Loading...</div>
                        ) : conversations.length === 0 ? (
                            <div className="empty-state">No messages yet.</div>
                        ) : (
                            conversations.map(conv => (
                                <div
                                    key={conv.other_user_id}
                                    className={`conversation-item ${selectedUserId === conv.other_user_id ? 'active' : ''}`}
                                    onClick={() => setSelectedUserId(conv.other_user_id)}
                                >
                                    <img src={conv.other_user_avatar} alt={conv.other_user_name} className="user-avatar" />
                                    <div className="conv-info">
                                        <div className="conv-top">
                                            <span className="user-name">{conv.other_user_name}</span>
                                            <span className="message-time">{format(new Date(conv.last_message_time), 'HH:mm')}</span>
                                        </div>
                                        <div className="conv-bottom">
                                            <p className="last-message">{conv.last_message}</p>
                                            {conv.unread_count > 0 && <span className="unread-badge">{conv.unread_count}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className={`chat-area ${selectedUserId ? 'visible-mobile' : ''}`}>
                    {selectedUserId ? (
                        <>
                            <div className="chat-header">
                                <button className="back-btn-mobile" onClick={() => setSelectedUserId(null)}>
                                    <ArrowLeft size={24} />
                                </button>
                                <div className="user-profile">
                                    <img src={selectedConv?.other_user_avatar} alt="" />
                                    <div>
                                        <h3>{selectedConv?.other_user_name}</h3>
                                        <span>Online</span>
                                    </div>
                                </div>
                                <div className="header-actions">
                                    <button className="action-btn call-btn">
                                        <Phone size={20} />
                                    </button>
                                    <button className="action-btn delete-btn" onClick={() => handleDeleteConversation(selectedUserId!)}>
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="messages-list">
                                {messages.map((msg, i) => {
                                    const isMe = msg.sender_id === adminId;
                                    const showTime = i === 0 ||
                                        (new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000);

                                    return (
                                        <React.Fragment key={msg.id}>
                                            {showTime && (
                                                <div className="message-date-separator">
                                                    {format(new Date(msg.created_at), 'MMMM dd, yyyy')}
                                                </div>
                                            )}
                                            <div className={`message-wrapper ${isMe ? 'me' : 'other'} ${activeMenuMessageId === msg.id ? 'menu-open' : ''}`}>
                                                <div className="message-bubble-container">
                                                    {isMe && (
                                                        <div className="sender-info admin-identity">
                                                            <span className="sender-name">Mana Kira</span>
                                                            <Check size={12} className="verified-badge-inline" />
                                                        </div>
                                                    )}
                                                    <div className="message-bubble">
                                                        {editingMessageId === msg.id ? (
                                                            <div className="edit-message-ui">
                                                                <textarea
                                                                    value={editContent}
                                                                    onChange={(e) => setEditContent(e.target.value)}
                                                                    autoFocus
                                                                />
                                                                <div className="edit-actions">
                                                                    <button onClick={() => setEditingMessageId(null)} className="cancel-edit">
                                                                        <X size={14} />
                                                                    </button>
                                                                    <button onClick={() => handleUpdateMessage()} className="save-edit">
                                                                        <Check size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p>{msg.content}</p>
                                                                <span className="msg-time">
                                                                    {format(new Date(msg.created_at), 'HH:mm')}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {isMe && editingMessageId !== msg.id && (
                                                        <div className="message-actions">
                                                            <button
                                                                className="action-trigger"
                                                                onClick={() => setActiveMenuMessageId(activeMenuMessageId === msg.id ? null : msg.id)}
                                                            >
                                                                <MoreVertical size={14} />
                                                            </button>
                                                            {activeMenuMessageId === msg.id && (
                                                                <div className="action-menu">
                                                                    <button onClick={() => startEditMessage(msg)}>
                                                                        <Edit2 size={12} /> Edit
                                                                    </button>
                                                                    <button onClick={() => handleDeleteMessage(msg.id)} className="delete-action">
                                                                        <Trash2 size={12} /> Delete
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="message-input-container" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button type="submit" className="send-btn">
                                    <Send size={20} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="no-chat-selected">
                            <div className="vibe-empty">
                                <Home size={64} style={{ opacity: 0.1 }} />
                                <h3>Select a conversation to start chatting</h3>
                                <p>Real-time messaging with your platform users</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Confirm Dialog */}
            {confirmDialog && (() => {
                const dialog = confirmDialog;
                return (
                    <div className="confirm-overlay" onClick={() => setConfirmDialog(null)}>
                        <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                            <div className="confirm-icon">
                                <Trash2 size={24} color="#ff4d4d" />
                            </div>
                            <h4 className="confirm-title">Are you sure?</h4>
                            <p className="confirm-message">{dialog.message}</p>
                            <div className="confirm-actions">
                                <button className="confirm-cancel" onClick={() => setConfirmDialog(null)}>
                                    Cancel
                                </button>
                                <button
                                    className="confirm-delete"
                                    onClick={() => {
                                        dialog.onConfirm();
                                        setConfirmDialog(null);
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
};

export default Messages;
