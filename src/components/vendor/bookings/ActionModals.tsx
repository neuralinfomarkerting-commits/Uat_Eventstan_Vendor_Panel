import { CheckCircle2, XCircle, Flag, Hash, Package, Calendar, Users } from 'lucide-react';
import { Booking } from '@/lib/types';
import { formatMoney } from '@/lib/vendorData';
import { getPackageName } from './helpers';

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        {children}
      </div>
    </div>
  );
}

export function AcceptModal({
  booking, submitting, onCancel, onConfirm,
}: { booking: Booking; submitting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <ModalShell>
      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={24} className="text-green-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Accept Booking?</h3>
      <p className="text-sm text-gray-500 text-center mb-5">
        You are about to accept booking for <strong>{booking.customerName}</strong>.
      </p>
      <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2.5">
        <Row icon={<Hash size={13} className="text-orange-400" />} label="Booking ID" value={booking.id} mono />
        <Row icon={<Package size={13} className="text-orange-400" />} label="Package" value={getPackageName(booking)} />
        <Row icon={<Calendar size={13} className="text-orange-400" />} label="Event Date" value={booking.eventDate || 'N/A'} />
        <Row icon={<Users size={13} className="text-orange-400" />} label="Guests" value={booking.guests ? `${booking.guests} people` : 'N/A'} />
        <div className="flex items-center justify-between text-sm gap-3 pt-1 border-t border-gray-200">
          <span className="text-gray-500 shrink-0">Amount</span>
          <span className="font-bold text-orange-600 text-right">{formatMoney(booking.amount, booking.currency)}</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg hover:shadow-green-500/30 disabled:opacity-60 text-white font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <CheckCircle2 size={15} /> {submitting ? 'Accepting...' : 'Confirm Accept'}
        </button>
      </div>
    </ModalShell>
  );
}

export function RejectModal({
  reason, submitting, onReasonChange, onCancel, onConfirm,
}: { reason: string; submitting: boolean; onReasonChange: (v: string) => void; onCancel: () => void; onConfirm: () => void }) {
  return (
    <ModalShell>
      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <XCircle size={24} className="text-red-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Reject Booking?</h3>
      <p className="text-sm text-gray-500 text-center mb-4">
        Please provide a <strong>reason</strong> for rejecting this booking.
      </p>
      <textarea
        value={reason}
        onChange={e => onReasonChange(e.target.value)}
        placeholder="e.g. Date not available, capacity exceeded, service not offered in this area…"
        rows={3}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none mb-5 transition-shadow"
      />
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={!reason.trim() || submitting}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all active:scale-[0.98]"
        >
          {submitting ? 'Rejecting...' : 'Yes, Reject'}
        </button>
      </div>
    </ModalShell>
  );
}

export function CompleteModal({
  booking, submitting, onCancel, onConfirm,
}: { booking: Booking; submitting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <ModalShell>
      <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Flag size={24} className="text-indigo-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Mark as Completed?</h3>
      <p className="text-sm text-gray-500 text-center mb-5">
        Confirm that booking for <strong>{booking.customerName}</strong> has been fulfilled.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-60 text-white font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Flag size={15} /> {submitting ? 'Completing...' : 'Confirm Complete'}
        </button>
      </div>
    </ModalShell>
  );
}

function Row({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm gap-3">
      <span className="text-gray-500 flex items-center gap-1.5 shrink-0">{icon} {label}</span>
      <span className={`font-semibold text-gray-900 text-right whitespace-pre-line ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</span>
    </div>
  );
}
