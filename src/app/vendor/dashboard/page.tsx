'use client';

import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';
import { vendorApi } from '@/api/vendorApi';
import { showError, showSuccess } from '@/lib/toast';
import { normalizeBooking, type ApiBooking } from '@/lib/vendorData';
import {
  DollarSign, CalendarCheck, Clock,
  Star, ArrowRight, X, CheckCircle, XCircle, MessageSquare,
  Calendar, Users, MapPin, Phone, Mail, Briefcase
} from 'lucide-react';
import Link from 'next/link';
import type { Booking } from '@/lib/types';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

type DashboardBooking = Booking & { rejectionReason?: string };

const statusColor: Record<string, string> = {
  'Pending': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Accepted': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Confirmed': 'bg-green-50 text-green-700 border border-green-200',
  'Completed': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  'Rejected (Vendor)': 'bg-red-50 text-red-700 border border-red-200',
  'Payment Pending (Balance)': 'bg-orange-50 text-orange-700 border border-orange-200',
  'Cancelled (Admin/User)': 'bg-gray-100 text-gray-600 border border-gray-200',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const [firstName] = useState(() => getUser()?.name?.split(' ')[0] ?? '');
  const [selectedBooking, setSelectedBooking] = useState<DashboardBooking | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0, totalBookings: 0, pendingBookings: 0,
    confirmedBookings: 0, averageRating: 0, totalServices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, _setError] = useState('');
  // Wrapping the raw setter means every existing setError(...) call
  // further down also pops an error toast that holds until closed.
  const setError = (msg: string) => {
    _setError(msg);
    if (msg) showError(msg);
  };
  
  const recentBookings = bookings.slice(0, 5);

  useEffect(() => {
    Promise.all([
      vendorApi.dashboard.get<{
        data: { totalRevenue: number; totalBookings: number; activeServices: number };
        recentBookings: ApiBooking[];
      }>(),
      vendorApi.bookings.list<ApiBooking[]>(),
    ])
      .then(([dashboard, allBookings]) => {
        const normalized = allBookings.map(normalizeBooking);
        setBookings(normalized);
        setStats({
          totalRevenue: dashboard.data.totalRevenue,
          totalBookings: dashboard.data.totalBookings,
          pendingBookings: normalized.filter((booking) => booking.status === 'Pending').length,
          confirmedBookings: normalized.filter((booking) => booking.status === 'Confirmed').length,
          averageRating: 0,
          totalServices: dashboard.data.activeServices,
        });
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const revenueData = [
    { month: new Date().toLocaleString('en', { month: 'short' }), revenue: stats.totalRevenue },
  ];
  const bookingsByMonth = [
    { month: new Date().toLocaleString('en', { month: 'short' }), bookings: stats.totalBookings },
  ];

  const handleBookingClick = (booking: DashboardBooking) => {
    setSelectedBooking(booking);
    setShowModal(true);
  };

  const handleAccept = () => {
    setShowConfirmDialog(true);
  };

  const handleReject = () => {
    setShowRejectDialog(true);
  };

  const confirmAccept = async () => {
    if (selectedBooking) {
      setActionLoading(true);
      setError('');
      try {
        const updated = normalizeBooking(await vendorApi.bookings.accept<ApiBooking>(selectedBooking.id));
        setBookings(current => current.map(booking => booking.id === selectedBooking.id ? updated : booking));
        setStats(current => ({ ...current, pendingBookings: Math.max(0, current.pendingBookings - 1) }));
        setShowConfirmDialog(false);
        setShowModal(false);
        setSelectedBooking(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to accept booking');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const confirmReject = async () => {
    if (selectedBooking && rejectionReason.trim()) {
      setActionLoading(true);
      setError('');
      try {
        const updated = normalizeBooking(await vendorApi.bookings.reject<ApiBooking>(selectedBooking.id));
        setBookings(current => current.map(booking => booking.id === selectedBooking.id ? updated : booking));
        setStats(current => ({ ...current, pendingBookings: Math.max(0, current.pendingBookings - 1) }));
        setRejectionReason('');
        setShowRejectDialog(false);
        setShowModal(false);
        setSelectedBooking(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to reject booking');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}! 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s happening with your business today.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Revenue',
            value: loading ? '...' : `AED ${stats.totalRevenue.toLocaleString()}`,
            sub: 'Successful payments',
            icon: DollarSign,
            color: 'bg-green-50 text-green-600',
            trend: '+12% this month',
          },
          {
            label: 'Total Bookings',
            value: loading ? '...' : stats.totalBookings,
            sub: `${stats.confirmedBookings} confirmed`,
            icon: CalendarCheck,
            color: 'bg-blue-50 text-blue-600',
            trend: '+5 new this week',
          },
          {
            label: 'Pending',
            value: loading ? '...' : stats.pendingBookings,
            sub: 'Need your response',
            icon: Clock,
            color: 'bg-amber-50 text-amber-600',
            trend: 'Within 4hrs window',
          },
          {
            label: 'Avg. Rating',
            value: stats.averageRating || '-',
            sub: `${stats.totalServices} active services`,
            icon: Star,
            color: 'bg-purple-50 text-purple-600',
            trend: '↑ 0.1 from last month',
          },
        ].map(({ label, value, sub, icon: Icon, color, trend }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{sub}</p>
            <p className="text-xs text-green-600 mt-2 font-medium">{trend}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Revenue Overview</h3>
              <p className="text-xs text-gray-500 mt-0.5">Last 6 months</p>
            </div>
            <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">↑ 14.2%</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
              <Tooltip formatter={(v: number) => [`AED ${v.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ fill: '#f97316', strokeWidth: 0, r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900">Monthly Bookings</h3>
            <p className="text-xs text-gray-500 mt-0.5">Last 6 months</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bookingsByMonth} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="bookings" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Bookings Section */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Recent Bookings</h3>
            <p className="text-xs text-gray-500 mt-0.5">Latest 5 booking requests</p>
          </div>
          <Link href="/vendor/bookings" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1 transition-colors">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        
        <div className="divide-y divide-gray-100">
          {recentBookings.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No bookings found
            </div>
          ) : (
            recentBookings.map(booking => (
              <div 
                key={booking.id} 
                className="group hover:bg-gray-50/80 transition-all duration-200 cursor-pointer"
                onClick={() => handleBookingClick(booking)}
              >
                <div className="p-5">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-orange-700 font-bold text-base shadow-sm shrink-0">
                      {booking.customerName.charAt(0)}
                    </div>
                    
                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-base font-semibold text-gray-900">
                          {booking.customerName}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{booking.serviceName}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {booking.eventDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {booking.guests} guests
                        </span>
                        {booking.eventVenue && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin size={12} />
                            {booking.eventVenue}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Amount & Actions */}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gray-900">
                        AED {booking.amount.toLocaleString()}
                      </p>
                      {booking.status === 'Pending' && (
                        <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(booking);
                              setShowConfirmDialog(true);
                            }}
                            className="px-3 py-1 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-medium"
                          >
                            Accept
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(booking);
                              setShowRejectDialog(true);
                            }}
                            className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {booking.status !== 'Pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBookingClick(booking);
                          }}
                          className="mt-2 text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1 justify-end"
                        >
                          View Details <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Customer Message if exists */}
                  {booking.message && (
                    <div className="mt-3 ml-16 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
                        <MessageSquare size={12} /> Message from customer:
                      </p>
                      <p className="text-sm text-blue-800">{booking.message}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Booking Details Modal - Fixed blur issue */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop without blur - just dark overlay */}
          <div 
            className="fixed inset-0 bg-black/50 transition-all duration-300"
            onClick={closeModal}
          />
          
          {/* Modal Content */}
          <div className="flex min-h-full items-center justify-center p-4 relative z-[101]">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white rounded-t-2xl flex items-center justify-between p-6 border-b border-gray-100 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-orange-700 font-bold text-lg">
                    {selectedBooking.customerName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedBooking.customerName}</h3>
                    <p className="text-sm text-gray-500">Booking #{selectedBooking.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[selectedBooking.status] || 'bg-gray-100 text-gray-600'}`}>
                    {selectedBooking.status}
                  </span>
                  <button 
                    onClick={closeModal} 
                    className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-5">
                {/* Customer Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Customer Information</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Email</p>
                        <p className="text-sm font-medium text-gray-800">{selectedBooking.customerEmail || 'customer@example.com'}</p>
                      </div>
                    </div>
                    {selectedBooking.customerPhone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-400">Phone</p>
                          <p className="text-sm font-medium text-gray-800">{selectedBooking.customerPhone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Details */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Event Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Service</p>
                      <div className="flex items-center gap-1.5">
                        <Briefcase size={14} className="text-orange-400" />
                        <p className="text-sm font-semibold text-gray-900">{selectedBooking.serviceName}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Event Type</p>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-orange-400" />
                        <p className="text-sm font-semibold text-gray-900">{selectedBooking.eventType}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Event Date</p>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-orange-400" />
                        <p className="text-sm font-semibold text-gray-900">{selectedBooking.eventDate}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Guests</p>
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-orange-400" />
                        <p className="text-sm font-semibold text-gray-900">{selectedBooking.guests} people</p>
                      </div>
                    </div>
                    {selectedBooking.eventVenue && (
                      <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                        <p className="text-xs text-gray-400 mb-1">Venue</p>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-orange-400" />
                          <p className="text-sm font-semibold text-gray-900">{selectedBooking.eventVenue}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment Summary</p>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-xs text-gray-500">Total Amount</p>
                      <p className="text-2xl font-bold text-orange-600">AED {selectedBooking.amount.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Paid Amount</p>
                      <p className="text-lg font-bold text-green-600">AED {selectedBooking.paidAmount.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="h-2 bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-400 rounded-full transition-all"
                      style={{ width: `${(selectedBooking.paidAmount / selectedBooking.amount) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Balance: AED {(selectedBooking.amount - selectedBooking.paidAmount).toLocaleString()}</span>
                    <span>{Math.round((selectedBooking.paidAmount / selectedBooking.amount) * 100)}% paid</span>
                  </div>
                </div>

                {/* Customer Message */}
                {selectedBooking.message && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <MessageSquare size={12} /> Customer Message
                    </p>
                    <p className="text-sm text-blue-900 leading-relaxed">{selectedBooking.message}</p>
                  </div>
                )}

                {/* Rejection Reason if rejected */}
                {selectedBooking.status === 'Rejected (Vendor)' && selectedBooking.rejectionReason && (
                  <div className="bg-red-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <XCircle size={12} /> Rejection Reason
                    </p>
                    <p className="text-sm text-red-800 leading-relaxed">{selectedBooking.rejectionReason}</p>
                  </div>
                )}
              </div>
              
              {/* Footer Actions */}
              {selectedBooking.status === 'Pending' && (
                <div className="flex gap-3 p-6 border-t border-gray-100">
                  <button
                    onClick={handleReject}
                    className="flex-1 px-4 py-2.5 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} />
                    Reject Booking
                  </button>
                  <button
                    onClick={handleAccept}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Accept Booking
                  </button>
                </div>
              )}
              
              {selectedBooking.status !== 'Pending' && (
                <div className="p-6 border-t border-gray-100">
                  <button
                    onClick={closeModal}
                    className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Accept Confirmation Dialog */}
      {showConfirmDialog && selectedBooking && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/50 transition-all duration-300"
            onClick={() => setShowConfirmDialog(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4 relative z-[101]">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto transform transition-all duration-300 scale-100">
              <div className="p-6">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Confirm Booking</h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  You are about to accept booking for <strong>{selectedBooking.customerName}</strong>
                </p>
                <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service:</span>
                    <span className="font-medium text-gray-900">{selectedBooking.serviceName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Event Date:</span>
                    <span className="font-medium text-gray-900">{selectedBooking.eventDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Amount:</span>
                    <span className="font-bold text-orange-600">AED {selectedBooking.amount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAccept}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
                  >
                    {actionLoading ? 'Accepting...' : 'Yes, Accept'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && selectedBooking && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/50 transition-all duration-300"
            onClick={() => {
              setShowRejectDialog(false);
              setRejectionReason('');
            }}
          />
          <div className="flex min-h-full items-center justify-center p-4 relative z-[101]">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto transform transition-all duration-300 scale-100">
              <div className="p-6">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle size={28} className="text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Reject Booking</h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  Please provide a reason for rejecting this booking from <strong>{selectedBooking.customerName}</strong>
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason for rejection *</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="e.g., Service unavailable on selected date, vendor not available, location not serviceable, etc."
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRejectDialog(false);
                      setRejectionReason('');
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmReject}
                    disabled={!rejectionReason.trim() || actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
