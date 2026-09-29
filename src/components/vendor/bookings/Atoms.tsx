import { ChevronUp, ChevronDown, ChevronsUpDown, MapPin } from 'lucide-react';
import { Booking } from '@/lib/types';
import { statusConfig, getAvatarColor, getProfileImage, getAddressLines, SortKey, SortDir } from './helpers';

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

export function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={13} className="text-gray-300" />;
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-orange-500" />
    : <ChevronDown size={13} className="text-orange-500" />;
}

export function CustomerAvatar({ booking, size = 'md' }: { booking: Booking; size?: 'sm' | 'md' | 'lg' }) {
  const imgUrl = getProfileImage(booking);

  const sizeClass = size === 'sm'
    ? 'w-8 h-8 text-xs'
    : size === 'lg'
      ? 'w-11 h-11 text-base'
      : 'w-9 h-9 text-sm';

  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={booking.customerName}
        className={`${sizeClass} rounded-full object-cover shrink-0 shadow-sm ring-2 ring-white`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${getAvatarColor(booking.customerName)} flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}>
      {booking.customerName.charAt(0).toUpperCase()}
    </div>
  );
}

export function AddressBlock({ booking }: { booking: Booking }) {
  const lines = getAddressLines(booking);
  return (
    <div className="space-y-2">
      {lines.map((line, i) =>
        line.label ? (
          <div key={i} className="flex items-start gap-2 text-sm">
            <MapPin size={13} className="text-orange-400 mt-0.5 shrink-0" />
            <span className="text-gray-400 shrink-0 min-w-[100px]">{line.label}</span>
            <span className="text-gray-800 leading-relaxed">{line.value}</span>
          </div>
        ) : (
          <p key={i} className="text-sm text-gray-800 leading-relaxed">{line.value}</p>
        )
      )}
    </div>
  );
}
