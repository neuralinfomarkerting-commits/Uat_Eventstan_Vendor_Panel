import {
  X,
  Calendar,
  Users,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  Clock,
  Flag,
  Package,
  Hash,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Booking } from "@/lib/types";
import { canMarkComplete } from "@/lib/vendorData";
import { StatusBadge, CustomerAvatar, AddressBlock } from "./Atoms";
import { getPackageLines, getCustomerMessage } from "./helpers";

type Props = {
  booking: Booking;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  onComplete: () => void;
};

export function BookingDetailsModal({
  booking,
  onClose,
  onAccept,
  onReject,
  onComplete,
}: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <CustomerAvatar booking={booking} size="lg" />
            <div>
              <h2 className="font-bold text-gray-900 leading-tight text-lg">
                {booking.customerName}
              </h2>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Hash size={11} className="text-gray-400" />
                <span className="font-mono">{booking.id}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={booking.status} />
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 hover:bg-gray-200/70 rounded-xl transition-colors text-gray-500 hover:text-gray-900"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <section className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Customer Information
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <InfoTile
                icon={<Mail size={13} className="text-gray-500" />}
                label="Email"
                value={booking.customerEmail || "N/A"}
              />
              <InfoTile
                icon={<Phone size={13} className="text-gray-500" />}
                label="Phone"
                value={booking.customerPhone || "N/A"}
              />
              <InfoTile
                icon={<Clock size={13} className="text-gray-500" />}
                label="Booked On"
                value={booking.createdAt || "N/A"}
              />
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Booking Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-3.5 transition-shadow hover:shadow-sm">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
                  <Package size={12} className="text-orange-500" /> Package Name
                </p>
                <div className="space-y-1">
                  {getPackageLines(booking).map((line, i) => (
                    <p key={i} className="text-sm font-semibold text-gray-900 leading-tight">{line}</p>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3.5 transition-shadow hover:shadow-sm">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                  <Calendar size={12} className="text-orange-400" /> Event Date
                </p>
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {booking.eventDate || "N/A"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3.5 transition-shadow hover:shadow-sm">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                  <Users size={12} className="text-orange-400" /> Guests
                </p>
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {booking.guests ? `${booking.guests} people` : "N/A"}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              Customer Address
            </p>
            <AddressBlock booking={booking} />
          </section>

          <section className="bg-blue-50 rounded-2xl p-4">
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <MessageSquare size={12} /> Customer Message
            </p>
            <p className="text-sm text-blue-900 leading-relaxed">
              {getCustomerMessage(booking)}
            </p>
          </section>
        </div>

        {/* Footer Actions */}
        {booking.status === "Pending" && (
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0 bg-white">
            <button
              onClick={onAccept}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg hover:shadow-green-500/30 text-white py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <CheckCircle2 size={17} /> Accept Booking
            </button>
            <button
              onClick={onReject}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <XCircle size={17} /> Reject
            </button>
          </div>
        )}
        {canMarkComplete(booking) && (
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0 bg-white">
            <button
              onClick={onComplete}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-500 hover:shadow-lg hover:shadow-indigo-500/30 text-white py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Flag size={17} /> Mark as Completed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm bg-white rounded-xl p-2 border border-gray-100">
      <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-200 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="font-medium text-gray-800 text-xs truncate">{value}</p>
      </div>
    </div>
  );
}
