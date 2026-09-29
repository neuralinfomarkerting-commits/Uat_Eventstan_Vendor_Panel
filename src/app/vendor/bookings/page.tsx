'use client';

import { useState, useMemo, useEffect } from 'react';
import { Booking } from '@/lib/types';
import { vendorApi } from '@/api/vendorApi';
import { showError, showSuccess } from '@/lib/toast';
import { getUser } from '@/lib/auth';
import { normalizeBooking, type ApiBooking } from '@/lib/vendorData';

import { StatsCards, BookingsTabs } from '@/components/vendor/bookings/StatsAndTabs';
import { BookingsTable } from '@/components/vendor/bookings/BookingsTable';
import { BookingDetailsModal } from '@/components/vendor/bookings/BookingDetailsModal';
import { AcceptModal, RejectModal, CompleteModal } from '@/components/vendor/bookings/ActionModals';
import { TabValue, SortKey, SortDir, matchesTab } from '@/components/vendor/bookings/helpers';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, _setError] = useState('');

  const setError = (msg: string) => {
    _setError(msg);
    if (msg) showError(msg);
  };

  const [tab, setTab] = useState<TabValue>('All');
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

  // const vendorId = getUser()?.vendorId;
  const vendorId = getUser()?.vendorId ?? undefined;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  useEffect(() => {
    vendorApi.bookings.list<ApiBooking[]>()
      .then((items) => setBookings((Array.isArray(items) ? items : []).map((item) => normalizeBooking(item, vendorId))))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load bookings'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyBookingUpdate = async (id: string, updated: unknown) => {
    const candidate = updated as Partial<ApiBooking> | null | undefined;
    if (candidate && Array.isArray(candidate.items) && candidate.customer) {
      const normalized = normalizeBooking(candidate as ApiBooking, vendorId);
      setBookings(prev => prev.map(b => b.id === id ? normalized : b));
      return;
    }
    const fresh = await vendorApi.bookings.list<ApiBooking[]>();
    setBookings(fresh.map((item) => normalizeBooking(item, vendorId)));
  };

  const handleAccept = async (id: string) => {
    setActionId(id);
    setError('');
    try {
      await applyBookingUpdate(id, await vendorApi.bookings.accept<unknown>(id));
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
      await applyBookingUpdate(id, await vendorApi.bookings.reject<unknown>(id));
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
      await applyBookingUpdate(id, await vendorApi.bookings.complete<unknown>(id));
      setSelected(null);
      setCompleteModal(null);
      showSuccess('Booking marked as completed');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to complete booking');
    } finally {
      setActionId(null);
    }
  };

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      const matchTab = matchesTab(b.status, tab);
      const q = search.toLowerCase();
      const matchSearch = !q || [b.customerName, b.serviceName, b.id, b.eventType, b.customerEmail]
        .some(f => f.toLowerCase().includes(q));
      return matchTab && matchSearch;
    });
  }, [bookings, tab, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av: string | number = a[sortKey] ?? '';
      const bv: string | number = b[sortKey] ?? '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const acceptBooking = acceptModal ? bookings.find(b => b.id === acceptModal) : null;
  const completeBooking = completeModal ? bookings.find(b => b.id === completeModal) : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Bookings
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage and respond to booking requests</p>
      </div>

      <StatsCards bookings={bookings} />

      <BookingsTabs
        bookings={bookings}
        tab={tab}
        onChange={(t) => { setTab(t); setPage(1); }}
      />

      <BookingsTable
        loading={loading}
        bookings={bookings}
        paginated={paginated}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalCount={sorted.length}
        search={search}
        sortKey={sortKey}
        sortDir={sortDir}
        vendorId={vendorId}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
        onSort={handleSort}
        onPageChange={setPage}
        onView={setSelected}
        onAccept={setAcceptModal}
        onReject={setRejectConfirm}
        onComplete={setCompleteModal}
      />

      {selected && (
        <BookingDetailsModal
          booking={selected}
          onClose={() => setSelected(null)}
          onAccept={() => { setAcceptModal(selected.id); setSelected(null); }}
          onReject={() => { setRejectConfirm(selected.id); setSelected(null); }}
          onComplete={() => { setCompleteModal(selected.id); setSelected(null); }}
        />
      )}

      {acceptBooking && (
        <AcceptModal
          booking={acceptBooking}
          submitting={actionId === acceptModal}
          onCancel={() => setAcceptModal(null)}
          onConfirm={() => acceptModal && handleAccept(acceptModal)}
        />
      )}

      {rejectConfirm && (
        <RejectModal
          reason={rejectReason}
          submitting={actionId === rejectConfirm}
          onReasonChange={setRejectReason}
          onCancel={() => { setRejectConfirm(null); setRejectReason(''); }}
          onConfirm={() => handleReject(rejectConfirm)}
        />
      )}

      {completeBooking && (
        <CompleteModal
          booking={completeBooking}
          submitting={actionId === completeModal}
          onCancel={() => setCompleteModal(null)}
          onConfirm={() => completeModal && handleComplete(completeModal)}
        />
      )}
    </div>
  );
}
