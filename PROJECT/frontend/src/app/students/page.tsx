'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { supabase, Student, Profile, Bed, Room } from '@/lib/supabase';
import { Users, Loader2, AlertCircle, X, UserCheck, UserX, Bed as BedIcon, Search } from 'lucide-react';

interface StudentWithDetails extends Student {
  profile: Profile;
  bed?: Bed & { room?: Room };
}

export default function StudentsPage() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignModal, setShowAssignModal] = useState<StudentWithDetails | null>(null);
  const [availableBeds, setAvailableBeds] = useState<(Bed & { room: Room })[]>([]);
  const [selectedBed, setSelectedBed] = useState('');

  const isAdmin = profile?.role === 'ADMIN';

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          profile:profiles(*),
          bed:beds(*, room:rooms(*))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents((data as any) || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBeds = async () => {
    const { data } = await supabase
      .from('beds')
      .select('*, room:rooms(*)')
      .eq('is_occupied', false);
    setAvailableBeds((data as any) || []);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStudents();
      fetchAvailableBeds();
    }
  }, [isAdmin]);

  const toggleStudentStatus = async (studentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ active: !currentStatus })
        .eq('id', studentId);
      if (error) throw error;
      fetchStudents();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const assignBed = async () => {
    if (!showAssignModal || !selectedBed) return;
    try {
      if (showAssignModal.bed_id) {
        await supabase.from('beds').update({ is_occupied: false }).eq('id', showAssignModal.bed_id);
      }

      const [studentUpdate, bedUpdate] = await Promise.all([
        supabase.from('students').update({ bed_id: selectedBed }).eq('id', showAssignModal.id),
        supabase.from('beds').update({ is_occupied: true }).eq('id', selectedBed),
      ]);

      if (studentUpdate.error) throw studentUpdate.error;
      if (bedUpdate.error) throw bedUpdate.error;

      setShowAssignModal(null);
      setSelectedBed('');
      fetchStudents();
      fetchAvailableBeds();
    } catch (err: any) {
      setError(err.message || 'Failed to assign bed');
    }
  };

  const unassignBed = async (studentId: string, bedId: string) => {
    try {
      const [studentUpdate, bedUpdate] = await Promise.all([
        supabase.from('students').update({ bed_id: null }).eq('id', studentId),
        supabase.from('beds').update({ is_occupied: false }).eq('id', bedId),
      ]);

      if (studentUpdate.error) throw studentUpdate.error;
      if (bedUpdate.error) throw bedUpdate.error;

      fetchStudents();
      fetchAvailableBeds();
    } catch (err: any) {
      setError(err.message || 'Failed to unassign bed');
    }
  };

  const filteredStudents = students.filter(s => 
    s.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
              <p className="text-gray-600 mt-1">Manage student profiles and room assignments</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">Students will appear here after registration.</p>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room/Bed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold">
                                {student.profile?.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{student.profile?.name}</div>
                              <div className="text-sm text-gray-500">{student.profile?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {student.bed ? (
                            <div className="flex items-center text-sm">
                              <BedIcon className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-gray-900">Room {student.bed.room?.room_number}, Bed {student.bed.bed_number}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 italic">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(student.join_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {student.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                setShowAssignModal(student);
                                setSelectedBed(student.bed_id || '');
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Assign/Change bed"
                            >
                              <BedIcon className="h-4 w-4" />
                            </button>
                            {student.bed_id && (
                              <button
                                onClick={() => unassignBed(student.id, student.bed_id!)}
                                className="text-orange-600 hover:text-orange-900"
                                title="Unassign bed"
                              >
                                <UserX className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => toggleStudentStatus(student.id, student.active)}
                              className={student.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                              title={student.active ? 'Deactivate' : 'Activate'}
                            >
                              {student.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showAssignModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Assign Bed</h2>
                  <button onClick={() => setShowAssignModal(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Assign a bed to <strong>{showAssignModal.profile?.name}</strong>
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Bed</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      value={selectedBed}
                      onChange={(e) => setSelectedBed(e.target.value)}
                    >
                      <option value="">Select a bed...</option>
                      {availableBeds.map((bed) => (
                        <option key={bed.id} value={bed.id}>
                          Room {bed.room?.room_number} - Bed {bed.bed_number} (Floor {bed.room?.floor})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={assignBed}
                      disabled={!selectedBed}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Assign Bed
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
