import {
  Eye, CheckCircle2, XCircle, Flag, Calendar, Clock,
  Search, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Booking } from '@/lib/types';
import { canMarkComplete } from '@/lib/vendorData';
import { StatusBadge, SortIcon, CustomerAvatar } from './Atoms';
import {
  rowAccent, getPackageName, getEventType, SortKey, SortDir, PAGE_SIZES,
} from './helpers';

const cols: { key: SortKey; label: string; w: string }[] = [
  { key: 'customerName', label: 'Customer',   w: 'min-w-[180px]' },
  { key: 'eventDate',    label: 'Event Date', w: 'w-[140px]' },
  { key: 'status',       label: 'Status',     w: 'w-[200px]' },
  { key: 'createdAt',    label: 'Booked On',  w: 'w-[130px]' },
];

type Props = {
  loading: boolean;
  bookings: Booking[];
  paginated: Booking[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  search: string;
  sortKey: SortKey;
  sortDir: SortDir;
  vendorId?: string;
  onSearchChange: (v: string) => void;
  onPageSizeChange: (v: number) => void;
  onSort: (key: SortKey) => void;
  onPageChange: (p: number) => void;
  onView: (b: Booking) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onComplete: (id: string) => void;
};

export function BookingsTable({
  loading, bookings, paginated, page, pageSize, totalPages, totalCount, search,
  sortKey, sortDir, vendorId, onSearchChange, onPageSizeChange, onSort, onPageChange,
  onView, onAccept, onReject, onComplete,
}: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* ===== Search + Rows ===== */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-50">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, service…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 focus:shadow-lg focus:shadow-orange-100 transition-all duration-200"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto text-sm text-gray-500">
          <Filter size={14} />
          <span className="hidden sm:inline">Rows:</span>
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* ===== Table ===== */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="w-[80px] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Sr. No.
              </th>
              {cols.map(col => (
                <th
                  key={col.key}
                  onClick={() => onSort(col.key)}
                  className={`${col.w} px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none whitespace-nowrap`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                  Loading bookings...
                </td>
              </tr>
            )}

            {!loading && paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                  No bookings found
                  {bookings.length === 0 && (
                    <span className="block mt-1 text-xs text-gray-400">
                      The server returned 0 bookings for vendor {vendorId ?? 'unknown'}.
                    </span>
                  )}
                </td>
              </tr>
            )}

            {paginated.map((booking, idx) => {
              const srNo = (page - 1) * pageSize + idx + 1;
              const packageName = getPackageName(booking);
              const eventType = getEventType(booking);
              const isPending = booking.status === 'Pending';
              const isPaymentPending = booking.status === 'Payment Pending (Balance)';

              return (
                <tr
                  key={booking.id}
                  className={`hover:bg-gray-50/60 transition-colors border-l-4 ${
                    rowAccent[booking.status] ?? 'border-l-transparent'
                  }`}
                >
                  {/* SR NO */}
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                      {srNo}
                    </span>
                  </td>

                  {/* CUSTOMER */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <CustomerAvatar booking={booking} size="sm" />
                      <div>
                        <p className="font-medium text-gray-900 leading-tight">
                          {booking.customerName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 whitespace-pre-line">{packageName}</p>
                      </div>
                    </div>
                  </td>

                  {/* EVENT DATE */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Calendar size={13} className="text-gray-400" />
                      {booking.eventDate}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 ml-5">{eventType}</p>
                  </td>

                  {/* STATUS */}
                  <td className="px-4 py-3.5">
                    <StatusBadge status={booking.status} />
                  </td>

                  {/* BOOKED ON */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={11} /> {booking.createdAt}
                    </div>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View — Always */}
                      <button
                        onClick={() => onView(booking)}
                        title="View Details"
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:border-blue-300 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150"
                      >
                        <Eye size={14} />
                      </button>

                      {/* Accept / Reject — Only if Pending */}
                      {isPending && (
                        <>
                          <button
                            onClick={() => onAccept(booking.id)}
                            title="Accept"
                            className="p-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-100 hover:border-green-300 hover:shadow-sm hover:shadow-green-100 hover:-translate-y-0.5 transition-all duration-150"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button
                            onClick={() => onReject(booking.id)}
                            title="Reject"
                            className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-gradient-to-br hover:from-red-50 hover:to-rose-100 hover:border-red-300 hover:shadow-sm hover:shadow-red-100 hover:-translate-y-0.5 transition-all duration-150"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}

                      {/* Complete — Only if canMarkComplete */}
                      {canMarkComplete(booking) && (
                        <button
                          onClick={() => onComplete(booking.id)}
                          title="Mark as Completed"
                          className="p-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150"
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

      {/* ===== Pagination ===== */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 text-sm text-gray-500">
        <span>
          Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, totalCount)} of {totalCount}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
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
                  onClick={() => onPageChange(p as number)}
                  className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-all
                    ${page === p
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30'
                      : 'border border-gray-200 hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}