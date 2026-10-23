import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { apiData } from "@/track/api";
import type { SummaryReport } from "@/track/api-types";
import { Icon } from "@/track/components/Icon";
import { useListQuery } from "@/track/components/list/useListQuery";
import { employeePickerPath } from "@/track/lib/report-query";
import { useTrack } from "@/track/TrackContext";
import { rememberEmployeeName, useEmployeeName } from "./useEmployeeName";

interface PickerOption {
  /** null = everyone (no employee filter). */
  id: string | null;
  label: string;
  employeeCode: string | null;
}

/** Typing pauses this long before the list is asked for again. */
const SEARCH_DELAY_MILLISECONDS = 250;

/**
 * The employee filter (`?employeeId=`): a combobox that searches by name, email or code among the people of the report's range and
 * scope. Its list is the report itself grouped by employee (`GET /reports/summaries?groupBy=employee&search=…`), so it offers exactly
 * the people the report can show (those with workdays in the range); it is asked for only while the list is open. The chosen
 * person's name comes from the list, or after a reload from the same endpoint filtered by `employeeId`.
 * Keyboard: arrow keys move, Enter chooses, Escape closes.
 */
export function EmployeePicker({ searchParams }: { searchParams: Record<string, string> }) {
  const { t } = useTrack();
  const { update } = useListQuery();
  const listId = useId();
  const selectedId = searchParams.employeeId || null;
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [delayedSearch, setDelayedSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const employeeName = useEmployeeName(searchParams);

  useEffect(() => {
    const timer = setTimeout(() => setDelayedSearch(searchText), SEARCH_DELAY_MILLISECONDS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const optionsPath = employeePickerPath(searchParams, delayedSearch);
  const optionsQuery = useQuery({ queryKey: ["track", optionsPath], queryFn: () => apiData<SummaryReport>(optionsPath), enabled: isOpen, placeholderData: keepPreviousData });

  const selectedName = selectedId ? (employeeName ?? t("Selected employee")) : t("Everyone");
  const options: PickerOption[] = [
    { id: null, label: t("Everyone"), employeeCode: null },
    ...(optionsQuery.data?.rows ?? []).map((row) => ({ id: row.key, label: row.label ?? "—", employeeCode: row.employeeCode })),
  ];
  const optionId = (index: number) => `${listId}-option-${index}`;

  const open = () => {
    if (isOpen) return;
    setSearchText("");
    setDelayedSearch("");
    setActiveIndex(0);
    setIsOpen(true);
  };
  const choose = (option: PickerOption) => {
    if (option.id) rememberEmployeeName(option.id, option.label);
    setIsOpen(false);
    if (option.id !== selectedId) update({ employeeId: option.id });
  };
  const moveWithKeys = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) { open(); return; }
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => Math.min(options.length - 1, Math.max(0, index + step)));
    } else if (e.key === "Enter" && isOpen) {
      e.preventDefault();
      const option = options[activeIndex];
      if (option) choose(option);
    } else if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className="picker">
      <label className="tsel picker-field">
        <span>{t("Employee")}</span>
        <input
          type="text"
          role="combobox"
          aria-label={t("Employee")}
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && options[activeIndex] ? optionId(activeIndex) : undefined}
          autoComplete="off"
          maxLength={100}
          placeholder={t("Search by name")}
          value={isOpen ? searchText : selectedName}
          onFocus={open}
          onClick={open}
          onBlur={() => setIsOpen(false)}
          onChange={(e) => { setSearchText(e.target.value); setActiveIndex(0); if (!isOpen) setIsOpen(true); }}
          onKeyDown={moveWithKeys}
        />
      </label>
      {selectedId && !isOpen && (
        <button type="button" className="picker-clear" aria-label={t("Show everyone")} title={t("Show everyone")} onClick={() => update({ employeeId: null })}>
          <Icon name="x" size={14} />
        </button>
      )}
      {isOpen && (
        <ul id={listId} role="listbox" className="menu picker-menu" aria-label={t("Employees")}>
          {options.map((option, index) => (
            <li key={option.id ?? "everyone"} id={optionId(index)} role="option" aria-selected={option.id === selectedId}
              className={index === activeIndex ? "active" : undefined}
              onMouseDown={(e) => e.preventDefault()} onClick={() => choose(option)} onMouseEnter={() => setActiveIndex(index)}>
              <span>{option.label}</span>
              {option.employeeCode && <small className="muted num">{option.employeeCode}</small>}
            </li>
          ))}
          {optionsQuery.isFetching && !optionsQuery.data && <li role="presentation" className="picker-note">{t("Searching…")}</li>}
          {optionsQuery.isError && <li role="presentation" className="picker-note">{t("The list could not be loaded.")}</li>}
          {optionsQuery.data && optionsQuery.data.rows.length === 0 && <li role="presentation" className="picker-note">{t("No one with workdays in this range matches.")}</li>}
          {optionsQuery.data && optionsQuery.data.total > optionsQuery.data.rows.length && (
            <li role="presentation" className="picker-note">{t("Type more of the name to see others.")}</li>
          )}
        </ul>
      )}
    </div>
  );
}
