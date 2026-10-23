import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { useListQuery } from "./useListQuery";

/** The list's search box (design `.tsearch`): writes `?search=` a moment after typing stops. */
export function SearchBox({ placeholder, label }: { placeholder: string; label: string }) {
  const { read, update } = useListQuery();
  const searchInUrl = read("search");
  const [searchText, setSearchText] = useState(searchInUrl);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // follow the URL when it changes elsewhere (back button, "Clear filters")
  const [lastSearchInUrl, setLastSearchInUrl] = useState(searchInUrl);
  if (lastSearchInUrl !== searchInUrl) {
    setLastSearchInUrl(searchInUrl);
    setSearchText(searchInUrl);
  }
  useEffect(() => () => clearTimeout(debounceTimer.current), []);
  return (
    <label className="tsearch">
      <Icon name="search" size={15} />
      <input
        type="search"
        value={searchText}
        onChange={(e) => {
          const typedText = e.target.value;
          setSearchText(typedText);
          clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(() => update({ search: typedText.trim() || null }), 300);
        }}
        placeholder={placeholder}
        aria-label={label}
        maxLength={100}
      />
    </label>
  );
}
