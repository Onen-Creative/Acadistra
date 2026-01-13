interface TermYearFilterProps {
  term: string;
  year: number;
  onTermChange: (term: string) => void;
  onYearChange: (year: number) => void;
  className?: string;
}

export default function TermYearFilter({ term, year, onTermChange, onYearChange, className = '' }: TermYearFilterProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className={`flex gap-3 ${className}`}>
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Term</label>
        <select 
          value={term} 
          onChange={(e) => onTermChange(e.target.value)} 
          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
        >
          <option value="Term1">Term 1</option>
          <option value="Term2">Term 2</option>
          <option value="Term3">Term 3</option>
        </select>
      </div>
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Year</label>
        <select 
          value={year} 
          onChange={(e) => onYearChange(Number(e.target.value))} 
          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}
