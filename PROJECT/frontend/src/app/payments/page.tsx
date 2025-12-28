'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { supabase, Rent, Student, Profile } from '@/lib/supabase';
import { CreditCard, Plus, Loader2, AlertCircle, X, Check, Clock, AlertTriangle, Search, DollarSign } from 'lucide-react';

interface RentWithStudent extends Rent {
  student: Student & { profile: Profile };
}

export default function PaymentsPage() {
  const { profile } = useAuth();
  const [rents, setRents] = useState<RentWithStudent[]>([]);
  const [students, setStudents] = useState<(Student & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'OVERDUE'>('ALL');
  const [newRent, setNewRent] = useState({ 
    studentId: '', 
    month: new Date().toISOString().slice(0, 7),
    amount: 5000
  });

  const isAdmin = profile?.role === 'ADMIN';

  const fetchRents = async () => {
    try {
      let query = supabase
        .from('rent')
        .select(`
          *,
          student:students(*, profile:profiles(*))
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'ALL') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRents((data as any) || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rent records');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('*, profile:profiles(*)')
      .eq('active', true);
    setStudents((data as any) || []);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchRents();
      fetchStudents();

      const channel = supabase
        .channel('rent-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rent' }, () => {
          fetchRents();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin, filter]);

  const handleAddRent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from('rent').insert({
        student_id: newRent.studentId,
        month: newRent.month,
        amount: newRent.amount,
        status: 'PENDING',
      });
      if (error) throw error;
      setShowAddModal(false);
      setNewRent({ studentId: '', month: new Date().toISOString().slice(0, 7), amount: 5000 });
    } catch (err: any) {
      setError(err.message || 'Failed to create rent record');
    } finally {
      setSubmitting(false);
    }
  };

  const updateRentStatus = async (id: string, status: 'PAID' | 'PENDING' | 'OVERDUE') => {
    try {
      const { error } = await supabase
        .from('rent')
        .update({ 
          status,
          paid_at: status === 'PAID' ? new Date().toISOString() : null 
        })
        .eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return <Check className="h-4 w-4 text-green-500" />;
      case 'OVERDUE': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800 border-green-200';
      case 'OVERDUE': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const totalPending = rents.filter(r => r.status === 'PENDING').reduce((sum, r) => sum + Number(r.amount), 0);
  const totalOverdue = rents.filter(r => r.status === 'OVERDUE').reduce((sum, r) => sum + Number(r.amount), 0);
  const totalCollected = rents.filter(r => r.status === 'PAID').reduce((sum, r) => sum + Number(r.amount), 0);

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-gray-600">Only administrators can access this page.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
              <p className="text-gray-600 mt-1">Track and manage rent payments</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rent Record
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-xl font-bold text-gray-900">${totalPending.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-xl font-bold text-gray-900">${totalOverdue.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Collected</p>
                  <p className="text-xl font-bold text-gray-900">${totalCollected.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
            {(['ALL', 'PENDING', 'PAID', 'OVERDUE'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status === 'ALL' ? 'All Records' : status}
              </button>
            ))}
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
          ) : rents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No rent records</h3>
              <p className="mt-1 text-sm text-gray-500">Create your first rent record.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </button>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rents.map((rent) => (
                      <tr key={rent.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {rent.student?.profile?.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{rent.student?.profile?.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(rent.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${Number(rent.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(rent.status)}`}>
                            {getStatusIcon(rent.status)}
                            <span className="ml-1">{rent.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {rent.status !== 'PAID' && (
                              <button
                                onClick={() => updateRentStatus(rent.id, 'PAID')}
                                className="text-green-600 hover:text-green-900 text-xs font-medium px-2 py-1 bg-green-50 rounded"
                              >
                                Mark Paid
                              </button>
                            )}
                            {rent.status === 'PENDING' && (
                              <button
                                onClick={() => updateRentStatus(rent.id, 'OVERDUE')}
                                className="text-red-600 hover:text-red-900 text-xs font-medium px-2 py-1 bg-red-50 rounded"
                              >
                                Mark Overdue
                              </button>
                            )}
                            {rent.status === 'PAID' && (
                              <button
                                onClick={() => updateRentStatus(rent.id, 'PENDING')}
                                className="text-yellow-600 hover:text-yellow-900 text-xs font-medium px-2 py-1 bg-yellow-50 rounded"
                              >
                                Undo
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Add Rent Record</h2>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleAddRent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                    <select
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      value={newRent.studentId}
                      onChange={(e) => setNewRent({ ...newRent, studentId: e.target.value })}
                    >
                      <option value="">Select student...</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.profile?.name} ({student.profile?.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                      <input
                        type="month"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={newRent.month}
                        onChange={(e) => setNewRent({ ...newRent, month: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={newRent.amount}
                        onChange={(e) => setNewRent({ ...newRent, amount: parseFloat(e.target.value) })}
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
                      Create Record
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
