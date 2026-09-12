'use client';

import { useState, useMemo, useEffect } from 'react';
import { Booking, BookingStatus } from '@/lib/types';
import { vendorApi } from '@/api/vendorApi';
import { showError, showSuccess } from '@/lib/toast';
import { normalizeBooking, canMarkComplete, type ApiBooking } from '@/lib/vendorData';
import {
  Search, CheckCircle2, XCircle, Eye, Calendar, Users,
  MessageSquare, X, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, ChevronsUpDown, Phone, Mail,
  MapPin, Clock, Download, Filter, Briefcase, Flag,
} from 'lucide-react';

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  'Pending':                          { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  'Accepted':                         { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  'Confirmed':                        { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400' },
  'Completed':                        { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  'Rejected (Vendor)':                { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400' },
  'Rejected (Admin – No Response)':   { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400' },
  'Payment Pending (Balance)':        { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  'Cancelled (Admin/User)':           { bg: 'bg-gray-100',  text: 'text-gray-600',   dot: 'bg-gray-400' },
};

const tabs: { label: string; value: BookingStatus | 'All' }[] = [
  { label: 'All',       value: 'All' },
  { label: 'Pending',   value: 'Pending' },
  { label: 'Accepted',  value: 'Accepted' },
  { label: 'Confirmed', value: 'Confirmed' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Rejected',  value: 'Rejected (Vendor)' },
];

type SortKey = 'id' | 'customerName' | 'eventDate' | 'amount' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [5, 10, 25];

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={13} className="text-gray-300" />;
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-orange-500" />
    : <ChevronDown size={13} className="text-orange-500" />;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, _setError] = useState('');
  // Wrapping the raw setter means every existing setError(...) call
  // further down also pops an error toast that holds until closed.
  const setError = (msg: string) => {
    _setError(msg);
    if (msg) showError(msg);
  };
  const [tab, setTab] = useState<BookingStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acceptModal, setAcceptModal] = useState<string | null>(null);
  const [completeModal, setCompleteModal] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  useEffect(() => {
    vendorApi.bookings.list<ApiBooking[]>()
      .then((items) => setBookings(items.map(normalizeBooking)))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id: string) => {
    setActionId(id);
    setError('');
    try {
      const updated = await vendorApi.bookings.accept<ApiBooking>(id);
      const normalized = normalizeBooking(updated);
      setBookings(prev => prev.map(b => b.id === id ? normalized : b));
      setSelected(null);
      setAcceptModal(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to accept booking');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    setActionId(id);
    setError('');
    try {
      const updated = await vendorApi.bookings.reject<ApiBooking>(id);
      const normalized = normalizeBooking(updated);
      setBookings(prev => prev.map(b => b.id === id ? normalized : b));
      setSelected(null);
      setRejectConfirm(null);
      setRejectReason('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reject booking');
    } finally {
      setActionId(null);
    }
  };

  const handleComplete = async (id: string) => {
    setActionId(id);
    setError('');
    try {
      const updated = await vendorApi.bookings.complete<ApiBooking>(id);
      const normalized = normalizeBooking(updated);
      setBookings(prev => prev.map(b => b.id === id ? normalized : b));
      setSelected(null);
      setCompleteModal(null);
      showSuccess('Booking marked as completed');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to complete booking');
    } finally {
      setActionId(null);
    }
  };

  const exportBookings = () => {
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [
      ['Sr. No.', 'Booking ID', 'Customer', 'Email', 'Service', 'Event Date', 'Amount', 'Paid', 'Status'],
      ...bookings.map((booking, i) => [
        i + 1, booking.id, booking.customerName, booking.customerEmail, booking.serviceName,
        booking.eventDate, booking.amount, booking.paidAmount, booking.status,
      ]),
    ];
    const blob = new Blob([rows.map(row => row.map(escape).join(',')).join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `eventstan-vendor-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      const matchTab = tab === 'All' || b.status === tab;
      const q = search.toLowerCase();
      const matchSearch = !q || [b.customerName, b.serviceName, b.id, b.eventType, b.customerEmail]
        .some(f => f.toLowerCase().includes(q));
      return matchTab && matchSearch;
    });
  }, [bookings, tab, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number = a[sortKey] ?? '';
      let bv: string | number = b[sortKey] ?? '';
      if (sortKey === 'amount') { av = a.amount; bv = b.amount; }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const tabCount = (t: BookingStatus | 'All') =>
    t === 'All' ? bookings.length : bookings.filter(b => b.status === t).length;

  // Sr. No. column is not sortable, so separate from sortable cols
  const cols: { key: SortKey; label: string; w: string }[] = [
    { key: 'customerName', label: 'Customer',   w: 'min-w-[160px]' },
    { key: 'eventDate',    label: 'Event Date', w: 'w-[120px]' },
    { key: 'amount',       label: 'Amount',     w: 'w-[130px]' },
    { key: 'status',       label: 'Status',     w: 'w-[180px]' },
    { key: 'createdAt',    label: 'Booked On',  w: 'w-[110px]' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and respond to booking requests</p>
        </div>
        <button onClick={exportBookings} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <Download size={15} /> Export
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',     val: bookings.length,                                                    color: 'text-gray-900' },
          { label: 'Pending',   val: bookings.filter(b => b.status === 'Pending').length,                color: 'text-amber-600' },
          { label: 'Confirmed', val: bookings.filter(b => b.status === 'Confirmed').length,              color: 'text-green-600' },
          { label: 'Completed', val: bookings.filter(b => b.status === 'Completed').length,              color: 'text-indigo-600' },
          { label: 'Rejected',  val: bookings.filter(b => b.status.startsWith('Rejected')).length,       color: 'text-red-500' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className={`text-2xl font-bold ${c.color}`}>{c.val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => { setTab(value); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
              ${tab === value ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === value ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {tabCount(value)}
            </span>
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-50">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, service…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto text-sm text-gray-500">
            <Filter size={14} />
            <span className="hidden sm:inline">Rows:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {/* Sr. No. — not sortable */}
                <th className="w-[60px] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Sr. No.
                </th>
                {cols.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`${col.w} px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none`}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">Loading bookings...</td></tr>
              )}
              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">No bookings found</td>
                </tr>
              )}
              {paginated.map((booking, idx) => {
                // Sr. No. = global index across all pages
                const srNo = (page - 1) * pageSize + idx + 1;
                return (
                  <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Sr. No. */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                        {srNo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-orange-700 font-bold text-xs shrink-0">
                          {booking.customerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 leading-tight">{booking.customerName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{booking.serviceName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Calendar size={13} className="text-gray-400" />
                        {booking.eventDate}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 ml-5">{booking.eventType}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-900">AED {booking.amount.toLocaleString()}</p>
                      <div className="mt-1 h-1.5 bg-gray-100 rounded-full w-20">
                        <div
                          className="h-full bg-orange-400 rounded-full"
                          style={{ width: `${Math.min(100, (booking.paidAmount / booking.amount) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Paid: AED {booking.paidAmount.toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={booking.status} />
                      {booking.message && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-blue-400">
                          <MessageSquare size={11} /> Has note
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={11} /> {booking.createdAt}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelected(booking)}
                          title="View Details"
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        {booking.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => setAcceptModal(booking.id)}
                              title="Accept"
                              className="p-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              onClick={() => setRejectConfirm(booking.id)}
                              title="Reject"
                              className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {canMarkComplete(booking) && (
                          <button
                            onClick={() => setCompleteModal(booking.id)}
                            title="Mark as Completed"
                            className="p-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Flag size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 text-sm text-gray-500">
          <span>
            Showing {sorted.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-2 text-gray-300">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors
                      ${page === p ? 'bg-orange-500 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Booking Detail Modal ── */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white rounded-t-3xl flex items-center justify-between px-6 py-5 border-b border-gray-100 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-orange-700 font-bold">
                  {selected.customerName.charAt(0)}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 leading-tight">{selected.customerName}</h2>
                  <p className="text-xs text-gray-500">Booking #{selected.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={selected.status} />
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Customer Information</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-gray-200">
                      <Mail size={13} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="font-medium text-gray-800 text-xs">{selected.customerEmail}</p>
                    </div>
                  </div>
                  {selected.customerPhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-gray-200">
                        <Phone size={13} className="text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Phone</p>
                        <p className="font-medium text-gray-800 text-xs">{selected.customerPhone}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-gray-200">
                      <Clock size={13} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Booked On</p>
                      <p className="font-medium text-gray-800 text-xs">{selected.createdAt}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Event Details</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Service',    value: selected.serviceName,           icon: <Calendar size={14} /> },
                    { label: 'Event Type', value: selected.eventType,             icon: <Calendar size={14} /> },
                    { label: 'Event Date', value: selected.eventDate,             icon: <Calendar size={14} /> },
                    { label: 'Guests',     value: `${selected.guests} people`,    icon: <Users size={14} /> },
                    { label: 'Venue',      value: selected.eventVenue ?? '—',     icon: <MapPin size={14} /> },
                    { label: 'Booking ID', value: `#${selected.id}`,              icon: null },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <div className="flex items-center gap-1.5">
                        {icon && <span className="text-orange-400">{icon}</span>}
                        <p className="text-sm font-semibold text-gray-900 leading-tight">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-orange-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment Summary</p>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="text-2xl font-bold text-orange-600">AED {selected.amount.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="text-lg font-bold text-green-600">AED {selected.paidAmount.toLocaleString()}</p>
                  </div>
                </div>
                <div className="h-2 bg-white/70 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-orange-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (selected.paidAmount / selected.amount) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Balance due: AED {(selected.amount - selected.paidAmount).toLocaleString()}</span>
                  <span>{Math.round((selected.paidAmount / selected.amount) * 100)}% paid</span>
                </div>
              </div>

              {selected.message && (
                <div className="bg-blue-50 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <MessageSquare size={12} /> Customer Message
                  </p>
                  <p className="text-sm text-blue-900 leading-relaxed">{selected.message}</p>
                </div>
              )}
            </div>

            {selected.status === 'Pending' && (
              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={() => { setAcceptModal(selected.id); setSelected(null); }}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={17} /> Accept Booking
                </button>
                <button
                  onClick={() => { setRejectConfirm(selected.id); setSelected(null); }}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle size={17} /> Reject
                </button>
              </div>
            )}
            {canMarkComplete(selected) && (
              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={() => { setCompleteModal(selected.id); setSelected(null); }}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Flag size={17} /> Mark as Completed
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Accept Modal ── */}
      {acceptModal && (() => {
        const booking = bookings.find(b => b.id === acceptModal);
        if (!booking) return null;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={22} className="text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Accept Booking?</h3>
              <p className="text-sm text-gray-500 text-center mb-5">
                You are about to accept booking <strong>{booking.id}</strong> for <strong>{booking.customerName}</strong>.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5"><Briefcase size={13} className="text-orange-400" /> Service</span>
                  <span className="font-semibold text-gray-900 text-right max-w-[60%]">{booking.serviceName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5"><Calendar size={13} className="text-orange-400" /> Event Date</span>
                  <span className="font-semibold text-gray-900">{booking.eventDate}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5"><Users size={13} className="text-orange-400" /> Guests</span>
                  <span className="font-semibold text-gray-900">{booking.guests} people</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-orange-600">AED {booking.amount.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setAcceptModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAccept(acceptModal)}
                  disabled={actionId === acceptModal}
                  className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={15} /> {actionId === acceptModal ? 'Accepting...' : 'Confirm Accept'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Reject Confirmation Modal ── */}
      {rejectConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle size={22} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Reject Booking?</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              Please provide a <strong>reason</strong> for rejecting booking <strong>{rejectConfirm}</strong>
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Date not available, capacity exceeded, service not offered in this area…"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none mb-5"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectConfirm(null); setRejectReason(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectConfirm)}
                disabled={!rejectReason.trim() || actionId === rejectConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {actionId === rejectConfirm ? 'Rejecting...' : 'Yes, Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Complete Confirmation Modal ── */}
      {completeModal && (() => {
        const booking = bookings.find(b => b.id === completeModal);
        if (!booking) return null;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Flag size={22} className="text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Mark as Completed?</h3>
              <p className="text-sm text-gray-500 text-center mb-5">
                Confirm that booking <strong>{booking.id}</strong> for <strong>{booking.customerName}</strong> has been fulfilled.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setCompleteModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleComplete(completeModal)}
                  disabled={actionId === completeModal}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Flag size={15} /> {actionId === completeModal ? 'Completing...' : 'Confirm Complete'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}