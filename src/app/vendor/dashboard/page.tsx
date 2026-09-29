'use client';

import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';
import { vendorApi } from '@/api/vendorApi';
import { showError, showSuccess } from '@/lib/toast';
import { normalizeBooking, formatMoney, isFullApiBooking, type ApiBooking } from '@/lib/vendorData';
import {
  DollarSign, CalendarCheck, Clock,
  Star, ArrowRight, MessageSquare,
  Calendar, Users, MapPin,
} from 'lucide-react';
import Link from 'next/link';
import type { Booking } from '@/lib/types';
import { BookingDetailsModal } from '@/components/vendor/bookings/BookingDetailsModal';
import { AcceptModal, RejectModal } from '@/components/vendor/bookings/ActionModals';

interface DashboardSummary {
  totalRevenue: number;
  totalBookings: number;
  activeServices: number;
}
type DashboardResponse =
  | { data: DashboardSummary; recentBookings?: ApiBooking[] }
  | DashboardSummary;

async function resolveUpdatedBooking(id: string, raw: unknown, vendorId?: string | null) {
  if (isFullApiBooking(raw)) return normalizeBooking(raw, vendorId);
  const fresh = (await vendorApi.bookings.list<ApiBooking[]>()).find((item) => item.id === id);
  if (!fresh) throw new Error('Booking updated, but could not be reloaded. Please refresh.');
  return normalizeBooking(fresh, vendorId);
}

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
  
  
  const setError = (msg: string) => {
    _setError(msg);
    if (msg) showError(msg);
  };
  
  const now = new Date();
  const isThisMonth = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (!day || !month || !year) return false;
    return month === now.getMonth() + 1 && year === now.getFullYear();
  };

  const recentBookings = bookings
    .filter(b => b.status === 'Pending' && isThisMonth(b.createdAt))
    .slice(0, 5);
  const displayCurrency = bookings[0]?.currency ?? 'AED';

  useEffect(() => {
    Promise.all([
      vendorApi.dashboard.get<DashboardResponse>(),
      vendorApi.bookings.list<ApiBooking[]>(),
    ])
      .then(([dashboard, allBookings]) => {
        const vendorId = getUser()?.vendorId;
        const normalized = allBookings.map((item) => normalizeBooking(item, vendorId));
        setBookings(normalized);
        const summary = 'data' in dashboard ? dashboard.data : dashboard;
        setStats({
          totalRevenue: summary.totalRevenue,
          totalBookings: summary.totalBookings,
          pendingBookings: normalized.filter((booking) => booking.status === 'Pending').length,
          confirmedBookings: normalized.filter((booking) => booking.status === 'Confirmed').length,
          averageRating: 0,
          totalServices: summary.activeServices,
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
        const updated = await resolveUpdatedBooking(selectedBooking.id, await vendorApi.bookings.accept<unknown>(selectedBooking.id), getUser()?.vendorId);
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
        const updated = await resolveUpdatedBooking(selectedBooking.id, await vendorApi.bookings.reject<unknown>(selectedBooking.id), getUser()?.vendorId);
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
      {}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}! 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s happening with your business today.</p>
        </div>
      </div>

      {}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Revenue',
            value: loading ? '...' : formatMoney(stats.totalRevenue, displayCurrency),
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

      {}
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
              <Tooltip formatter={(v: number) => [formatMoney(v, displayCurrency), 'Revenue']} />
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

      {}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Pending Approvals — This Month</h3>
            <p className="text-xs text-gray-500 mt-0.5">Bookings awaiting your response</p>
          </div>
          <Link href="/vendor/bookings" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1 transition-colors">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        
        <div className="divide-y divide-gray-100">
          {recentBookings.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No pending approvals this month
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
                    {}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-orange-700 font-bold text-base shadow-sm shrink-0">
                      {booking.customerName.charAt(0)}
                    </div>
                    
                    {}
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
                    
                    {}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gray-900">
                        {formatMoney(booking.amount, booking.currency)}
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
                  
                  {}
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

      {}
      {showModal && selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={closeModal}
          onAccept={handleAccept}
          onReject={handleReject}
          onComplete={() => {}}
        />
      )}

      {}
      {showConfirmDialog && selectedBooking && (
        <AcceptModal
          booking={selectedBooking}
          submitting={actionLoading}
          onCancel={() => setShowConfirmDialog(false)}
          onConfirm={confirmAccept}
        />
      )}

      {}
      {showRejectDialog && selectedBooking && (
        <RejectModal
          reason={rejectionReason}
          submitting={actionLoading}
          onReasonChange={setRejectionReason}
          onCancel={() => { setShowRejectDialog(false); setRejectionReason(''); }}
          onConfirm={confirmReject}
        />
      )}
    </div>
  );
}