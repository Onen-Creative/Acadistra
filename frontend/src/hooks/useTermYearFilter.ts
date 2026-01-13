import { useState } from 'react';

export function useTermYearFilter() {
  const [term, setTerm] = useState('Term1');
  const [year, setYear] = useState(new Date().getFullYear());

  return {
    term,
    year,
    setTerm,
    setYear,
  };
}
