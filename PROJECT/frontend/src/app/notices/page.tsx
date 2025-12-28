'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { supabase, Notice } from '@/lib/supabase';
import { Bell, Plus, Loader2, AlertCircle, X, Trash2, AlertTriangle, Info, Clock } from 'lucide-react';

export default function NoticesPage() {
  const { profile, user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newNotice, setNewNotice] = useState({ 
    title: '', 
    message: '', 
    priority: 'NORMAL' as const,
    expiresAt: ''
  });

  const isAdmin = profile?.role === 'ADMIN';

  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (err) {
      setError('Failed to fetch notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();

    const channel = supabase
      .channel('notices-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        fetchNotices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from('notices').insert({
        title: newNotice.title,
        message: newNotice.message,
        priority: newNotice.priority,
        created_by: user?.id,
        expires_at: newNotice.expiresAt || null,
      });
      if (error) throw error;
      setShowAddModal(false);
      setNewNotice({ title: '', message: '', priority: 'NORMAL', expiresAt: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to post notice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
      const { error } = await supabase.from('notices').delete().eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to delete notice');
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'HIGH': return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'NORMAL': return <Info className="h-5 w-5 text-blue-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-50 border-red-200';
      case 'HIGH': return 'bg-orange-50 border-orange-200';
      case 'NORMAL': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'NORMAL': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isExpired = (expiresAt: string | undefined) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notices</h1>
              <p className="text-gray-600 mt-1">
                {isAdmin ? 'Post and manage hostel announcements' : 'Stay updated with hostel announcements'}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Post Notice
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 flex items-center rounded-r-lg">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
              <button onClick={() => setError('')} className="ml-auto">
                <X className="h-4 w-4 text-red-400" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : notices.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <Bell className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No notices</h3>
              <p className="mt-1 text-sm text-gray-500">
                {isAdmin ? 'Post your first announcement.' : 'No announcements at the moment.'}
              </p>
              {isAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Post Notice
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {notices.map((notice) => {
                const expired = isExpired(notice.expires_at);
                return (
                  <div
                    key={notice.id}
                    className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                      expired ? 'opacity-60' : ''
                    } ${getPriorityColor(notice.priority)}`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 mt-1">
                            {getPriorityIcon(notice.priority)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{notice.title}</h3>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityBadgeColor(notice.priority)}`}>
                                {notice.priority}
                              </span>
                              {expired && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                                  Expired
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">{notice.message}</p>
                            <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                              <span>
                                Posted: {new Date(notice.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {notice.expires_at && (
                                <span>
                                  Expires: {new Date(notice.expires_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteNotice(notice.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete notice"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Post Notice</h2>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleAddNotice} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Notice title"
                      value={newNotice.title}
                      onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Notice content..."
                      required
                      value={newNotice.message}
                      onChange={(e) => setNewNotice({ ...newNotice, message: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        value={newNotice.priority}
                        onChange={(e) => setNewNotice({ ...newNotice, priority: e.target.value as any })}
                      >
                        <option value="LOW">Low</option>
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expires (optional)</label>
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={newNotice.expiresAt}
                        onChange={(e) => setNewNotice({ ...newNotice, expiresAt: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Post Notice
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
