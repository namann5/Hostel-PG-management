'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { supabase, Room, Complaint, Notice, Rent } from '@/lib/supabase';
import { Home, Users, MessageSquare, Bell, CreditCard, Plus, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRooms: 0,
    occupiedBeds: 0,
    totalBeds: 0,
    openComplaints: 0,
    pendingRent: 0,
  });
  const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);

  const fetchDashboardData = async () => {
    try {
      const [roomsRes, bedsRes, complaintsRes, noticesRes, rentRes] = await Promise.all([
        supabase.from('rooms').select('id'),
        supabase.from('beds').select('id, is_occupied'),
        supabase.from('complaints').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(3),
        supabase.from('rent').select('id').eq('status', 'PENDING'),
      ]);

      const beds = bedsRes.data || [];
      const occupiedBeds = beds.filter(b => b.is_occupied).length;
      const openComplaints = (complaintsRes.data || []).filter(c => c.status !== 'RESOLVED').length;

      setStats({
        totalRooms: roomsRes.data?.length || 0,
        occupiedBeds,
        totalBeds: beds.length,
        openComplaints,
        pendingRent: rentRes.data?.length || 0,
      });

      setRecentNotices(noticesRes.data || []);
      setRecentComplaints(complaintsRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const complaintsChannel = supabase
      .channel('complaints-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const noticesChannel = supabase
      .channel('notices-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const roomsChannel = supabase
      .channel('rooms-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const bedsChannel = supabase
      .channel('beds-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(complaintsChannel);
      supabase.removeChannel(noticesChannel);
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(bedsChannel);
    };
  }, []);

  const statsCards = [
    { name: 'Total Rooms', value: stats.totalRooms.toString(), icon: Home, color: 'bg-blue-500', href: '/rooms' },
    { name: 'Occupied Beds', value: `${stats.occupiedBeds}/${stats.totalBeds}`, icon: Users, color: 'bg-green-500', href: '/rooms' },
    { name: 'Open Complaints', value: stats.openComplaints.toString(), icon: MessageSquare, color: 'bg-red-500', href: '/complaints' },
    { name: 'Pending Rent', value: stats.pendingRent.toString(), icon: CreditCard, color: 'bg-yellow-500', href: '/payments' },
  ];

  const quickActions = [
    { name: 'Add Room', icon: Home, href: '/rooms', color: 'blue', adminOnly: true },
    { name: 'View Complaints', icon: MessageSquare, href: '/complaints', color: 'purple', adminOnly: false },
    { name: 'Post Notice', icon: Bell, href: '/notices', color: 'orange', adminOnly: true },
    { name: 'Manage Payments', icon: CreditCard, href: '/payments', color: 'green', adminOnly: true },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'NORMAL': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {profile?.name}!
            </h1>
            <p className="text-gray-600 mt-1">
              {profile?.role === 'ADMIN' 
                ? 'Here\'s an overview of your hostel management dashboard.'
                : 'View your accommodation details and updates.'}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                {statsCards.map((stat) => (
                  <Link
                    key={stat.name}
                    href={stat.href}
                    className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 rounded-xl p-3 ${stat.color} text-white`}>
                          <stat.icon className="h-6 w-6" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                            <dd className="text-2xl font-bold text-gray-900">{stat.value}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {profile?.role === 'ADMIN' && (
                  <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {quickActions
                        .filter(action => !action.adminOnly || profile?.role === 'ADMIN')
                        .map((action) => (
                          <Link
                            key={action.name}
                            href={action.href}
                            className={`flex flex-col items-center justify-center p-4 bg-${action.color}-50 rounded-xl hover:bg-${action.color}-100 transition-colors group`}
                          >
                            <action.icon className={`h-8 w-8 text-${action.color}-600 mb-2 group-hover:scale-110 transition-transform`} />
                            <span className={`text-sm font-medium text-${action.color}-900`}>{action.name}</span>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}

                <div className={`bg-white shadow-sm rounded-xl p-6 border border-gray-100 ${profile?.role !== 'ADMIN' ? 'lg:col-span-2' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Notices</h2>
                    <Link href="/notices" className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
                      View all <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {recentNotices.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No notices yet</p>
                    ) : (
                      recentNotices.map((notice) => (
                        <div key={notice.id} className="border-l-4 border-blue-500 pl-4 py-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-900">{notice.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(notice.priority)}`}>
                              {notice.priority}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notice.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notice.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {profile?.role === 'ADMIN' && (
                  <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Complaints</h2>
                      <Link href="/complaints" className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
                        View all <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                    <div className="overflow-x-auto">
                      {recentComplaints.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">No complaints yet</p>
                      ) : (
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Category</th>
                              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Description</th>
                              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {recentComplaints.map((complaint) => (
                              <tr key={complaint.id} className="hover:bg-gray-50">
                                <td className="py-3 px-4 text-sm font-medium text-gray-900">{complaint.category}</td>
                                <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">{complaint.description}</td>
                                <td className="py-3 px-4">
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(complaint.status)}`}>
                                    {complaint.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-500">
                                  {new Date(complaint.created_at).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
