import { Booking } from '@/lib/types';
import { tabs, tabStyles, matchesTab, TabValue } from './helpers';

export function StatsCards({ bookings }: { bookings: Booking[] }) {
  const stats = [
    { label: 'Total',     val: bookings.length,                                              color: 'text-gray-900',   ring: 'hover:border-gray-300',   accent: 'bg-gray-400' },
    { label: 'Pending',   val: bookings.filter(b => b.status === 'Pending').length,           color: 'text-amber-600',  ring: 'hover:border-amber-300',  accent: 'bg-amber-400' },
    { label: 'Confirmed', val: bookings.filter(b => b.status === 'Confirmed').length,         color: 'text-green-600',  ring: 'hover:border-green-300',  accent: 'bg-green-400' },
    { label: 'Completed', val: bookings.filter(b => b.status === 'Completed').length,         color: 'text-indigo-600', ring: 'hover:border-indigo-300', accent: 'bg-indigo-400' },
    { label: 'Cancelled', val: bookings.filter(b => b.status === 'Cancelled').length,  color: 'text-red-500',    ring: 'hover:border-red-300',    accent: 'bg-red-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map(s => (
        <div
          key={s.label}
          className={`group relative bg-white rounded-2xl border border-gray-100 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${s.ring}`}
        >
          <span className={`absolute top-3 right-3 w-1.5 h-1.5 rounded-full ${s.accent}`} />
          <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
          <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export function BookingsTabs({
  bookings, tab, onChange,
}: { bookings: Booking[]; tab: TabValue; onChange: (t: TabValue) => void }) {
  const tabCount = (t: TabValue) => bookings.filter(b => matchesTab(b.status, t)).length;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {tabs.map(({ label, value }) => {
        const style = tabStyles[value];
        const isActive = tab === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200
              ${isActive ? style.active : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? style.badge : 'bg-gray-100 text-gray-500'}`}>
              {tabCount(value)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
