const items = [
  { label: 'Available', color: 'bg-green-100 border-green-400' },
  { label: 'Selected', color: 'bg-blue-500 border-blue-600' },
  { label: 'Locked', color: 'bg-yellow-100 border-yellow-400' },
  { label: 'Booked', color: 'bg-red-100 border-red-300' },
];

export default function SeatLegend() {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={`h-4 w-4 rounded border-2 ${item.color}`} />
          <span className="text-xs text-gray-600">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
