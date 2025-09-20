import { useState, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { db, type Anfrage, type Mitarbeiter, type Unternehmen, type Kostenstelle } from "@/lib/supabase"

export function SearchAutocomplete({
  anfragen,
  allVisible,
  setAllVisible,
  onSearch,
}: {
  anfragen: Anfrage[];
  allVisible: boolean;
  setAllVisible: (v: boolean) => void;
  onSearch: (term: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

const allSearchValues = useMemo(() => {
  const s = new Set<string>();

  anfragen.forEach(a => {
    // Strings nur hinzufügen, wenn nicht leer/null
    if (a.von) s.add(a.von);
    if (a.nach) s.add(a.nach);
    if (a.mitarbeiter?.name) s.add(a.mitarbeiter.name);

    // Zahl nur hinzufügen, wenn nicht null/undefined
    if (a.kostenstelle_id != null) {
      s.add(a.kostenstelle_id.toString());
    }
  });

  return Array.from(s);
}, [anfragen]);


  const suggestions = useMemo(() => {
    if (!searchTerm) return [];
    const lower = searchTerm.toLowerCase();
    return allSearchValues.filter(val => val.toLowerCase().includes(lower)).slice(0, 8);
  }, [searchTerm, allSearchValues]);

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        placeholder="Von, Nach, Mitarbeit., Kostenstelle-ID"
        value={searchTerm}
        onChange={e => {
          const val = e.target.value;
          setSearchTerm(val);
          setAllVisible(!!val);
          onSearch(val);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
        className="pr-10 bg-gray-800 text-white placeholder:text-gray-400 border border-gray-700"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded border border-gray-700 bg-gray-800">
          {suggestions.map((val, idx) => (
            <li
              key={idx}
              className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-white"
              onMouseDown={e => {
                e.preventDefault();
                setSearchTerm(val);
                onSearch(val);
                setAllVisible(true);
                setShowSuggestions(false);
                inputRef.current?.blur(); // Keyboard schließen
              }}
            >
              {val}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
