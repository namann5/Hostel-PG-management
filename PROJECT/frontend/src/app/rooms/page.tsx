'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { supabase, Room, Bed } from '@/lib/supabase';
import { Bed as BedIcon, Plus, Loader2, AlertCircle, Trash2, Users, X } from 'lucide-react';

interface RoomWithBeds extends Room {
  beds: Bed[];
}

export default function RoomsPage() {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<RoomWithBeds[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRoom, setNewRoom] = useState({ roomNumber: '', totalBeds: 4, floor: 1, rentAmount: 5000 });

  const isAdmin = profile?.role === 'ADMIN';

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, beds(*)')
        .order('room_number');

      if (error) throw error;
      setRooms(data || []);
    } catch (err: any) {
      setError('Failed to fetch rooms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();

    const roomsChannel = supabase
      .channel('rooms-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchRooms();
      })
      .subscribe();

    const bedsChannel = supabase
      .channel('beds-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(bedsChannel);
    };
  }, []);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          room_number: newRoom.roomNumber,
          floor: newRoom.floor,
          rent_amount: newRoom.rentAmount,
          capacity: newRoom.totalBeds,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      const beds = Array.from({ length: newRoom.totalBeds }, (_, i) => ({
        bed_number: `${i + 1}`,
        room_id: room.id,
        is_occupied: false,
      }));

      const { error: bedsError } = await supabase.from('beds').insert(beds);
      if (bedsError) throw bedsError;

      setShowAddModal(false);
      setNewRoom({ roomNumber: '', totalBeds: 4, floor: 1, rentAmount: 5000 });
      fetchRooms();
    } catch (err: any) {
      setError(err.message || 'Failed to add room');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room? All beds will be removed.')) return;
    
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);
      if (error) throw error;
      fetchRooms();
    } catch (err: any) {
      setError(err.message || 'Failed to delete room');
    }
  };

  const toggleBedOccupancy = async (bedId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('beds')
        .update({ is_occupied: !currentStatus })
        .eq('id', bedId);
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to update bed status');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
              <p className="text-gray-600 mt-1">Manage hostel rooms and bed availability</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 flex items-center rounded-r-lg">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                  <BedIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No rooms</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding a new room.</p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Room
                    </button>
                  )}
                </div>
              ) : (
                rooms.map((room) => {
                  const occupiedCount = room.beds?.filter(b => b.is_occupied).length || 0;
                  const totalBeds = room.beds?.length || 0;
                  const occupancyPercent = totalBeds > 0 ? (occupiedCount / totalBeds) * 100 : 0;

                  return (
                    <div key={room.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">Room {room.room_number}</h3>
                            <p className="text-sm text-gray-500">Floor {room.floor}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              occupancyPercent === 100 ? 'bg-red-100 text-red-800' :
                              occupancyPercent > 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {occupiedCount}/{totalBeds} Occupied
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteRoom(room.id)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete room"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Occupancy</span>
                            <span>{Math.round(occupancyPercent)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                occupancyPercent === 100 ? 'bg-red-500' :
                                occupancyPercent > 50 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${occupancyPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 mb-4">
                          <span className="font-medium">Rent:</span> ${room.rent_amount}/month
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {room.beds?.map((bed) => (
                            <button
                              key={bed.id}
                              onClick={() => isAdmin && toggleBedOccupancy(bed.id, bed.is_occupied)}
                              disabled={!isAdmin}
                              className={`flex items-center justify-between p-2 rounded-lg border text-sm transition-colors ${
                                bed.is_occupied
                                  ? 'bg-red-50 border-red-200 text-red-700'
                                  : 'bg-green-50 border-green-200 text-green-700'
                              } ${isAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                            >
                              <span className="flex items-center">
                                <BedIcon className="h-4 w-4 mr-1" />
                                Bed {bed.bed_number}
                              </span>
                              <span className="text-xs font-medium">
                                {bed.is_occupied ? 'Occupied' : 'Free'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Add New Room</h2>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleAddRoom} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 101, A1"
                      value={newRoom.roomNumber}
                      onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={newRoom.floor}
                        onChange={(e) => setNewRoom({ ...newRoom, floor: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Beds</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={newRoom.totalBeds}
                        onChange={(e) => setNewRoom({ ...newRoom, totalBeds: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount ($/month)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={newRoom.rentAmount}
                      onChange={(e) => setNewRoom({ ...newRoom, rentAmount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
                    >
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Room
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
