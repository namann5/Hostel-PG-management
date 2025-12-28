'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { supabase, Complaint } from '@/lib/supabase';
import { MessageSquare, Plus, Loader2, AlertCircle, Clock, CheckCircle, HelpCircle, X, Send } from 'lucide-react';

export default function ComplaintsPage() {
  const { profile, user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<Complaint | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newComplaint, setNewComplaint] = useState({ category: 'Maintenance', description: '' });
  const [adminResponse, setAdminResponse] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);

  const isAdmin = profile?.role === 'ADMIN';

  const fetchStudentId = async () => {
    if (!user || isAdmin) return;
    const { data } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (data) setStudentId(data.id);
  };

  const fetchComplaints = async () => {
    try {
      let query = supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin && studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setComplaints(data || []);
    } catch (err) {
      setError('Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentId();
  }, [user, isAdmin]);

  useEffect(() => {
    if (isAdmin || studentId) {
      fetchComplaints();

      const channel = supabase
        .channel('complaints-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
          fetchComplaints();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin, studentId]);

  const handleAddComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      setError('Student profile not found. Please contact admin.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('complaints').insert({
        student_id: studentId,
        category: newComplaint.category,
        description: newComplaint.description,
        status: 'OPEN',
      });
      if (error) throw error;
      setShowAddModal(false);
      setNewComplaint({ category: 'Maintenance', description: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const updateComplaintStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setShowDetailModal(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const submitAdminResponse = async (id: string) => {
    if (!adminResponse.trim()) return;
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ 
          admin_response: adminResponse, 
          status: 'IN_PROGRESS',
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      if (error) throw error;
      setAdminResponse('');
      setShowDetailModal(null);
    } catch (err: any) {
      setError(err.message || 'Failed to submit response');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'IN_PROGRESS': return <Clock className="h-5 w-5 text-yellow-500" />;
      default: return <HelpCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const categories = ['Maintenance', 'Cleanliness', 'Food', 'Internet', 'Security', 'Noise', 'Plumbing', 'Electrical', 'Others'];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
              <p className="text-gray-600 mt-1">
                {isAdmin ? 'Manage and respond to complaints' : 'Submit and track your complaints'}
              </p>
            </div>
            {!isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Complaint
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
          ) : complaints.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No complaints</h3>
              <p className="mt-1 text-sm text-gray-500">
                {isAdmin ? 'No complaints have been submitted yet.' : 'You haven\'t submitted any complaints yet.'}
              </p>
              {!isAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Complaint
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {complaints.map((complaint) => (
                  <li
                    key={complaint.id}
                    onClick={() => setShowDetailModal(complaint)}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                            {complaint.category}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(complaint.status)}`}>
                            {complaint.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-900 line-clamp-2">{complaint.description}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {new Date(complaint.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="ml-4">
                        {getStatusIcon(complaint.status)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Submit Complaint</h2>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleAddComplaint} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      value={newComplaint.category}
                      onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Describe your issue in detail..."
                      required
                      value={newComplaint.description}
                      onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                    />
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
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showDetailModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                      {showDetailModal.category}
                    </span>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(showDetailModal.status)}`}>
                      {showDetailModal.status}
                    </span>
                  </div>
                  <button onClick={() => setShowDetailModal(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                    <p className="mt-1 text-gray-900">{showDetailModal.description}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Submitted</h3>
                    <p className="mt-1 text-gray-900">
                      {new Date(showDetailModal.created_at).toLocaleString()}
                    </p>
                  </div>

                  {showDetailModal.admin_response && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-blue-800">Admin Response</h3>
                      <p className="mt-1 text-blue-700">{showDetailModal.admin_response}</p>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Admin Actions</h3>
                      <div className="space-y-3">
                        <div className="flex space-x-2">
                          {showDetailModal.status !== 'IN_PROGRESS' && (
                            <button
                              onClick={() => updateComplaintStatus(showDetailModal.id, 'IN_PROGRESS')}
                              className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200"
                            >
                              Mark In Progress
                            </button>
                          )}
                          {showDetailModal.status !== 'RESOLVED' && (
                            <button
                              onClick={() => updateComplaintStatus(showDetailModal.id, 'RESOLVED')}
                              className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="Add a response..."
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={adminResponse}
                            onChange={(e) => setAdminResponse(e.target.value)}
                          />
                          <button
                            onClick={() => submitAdminResponse(showDetailModal.id)}
                            disabled={!adminResponse.trim()}
                            className="px-3 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
