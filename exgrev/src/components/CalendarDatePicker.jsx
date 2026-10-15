import { useRef } from "react";

function CalendarDatePicker({ value, onChange, min, required = false }) {
  const inputRef = useRef(null);

  function openCalendar() {
    const input = inputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  return (
    <div className="calendar-date-picker">
      <input
        ref={inputRef}
        type="date"
        value={value}
        min={min}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="calendar-picker-button"
        onClick={openCalendar}
        aria-label="Open calendar"
      >
        <svg
          viewBox="0 0 24 24"
          width="19"
          height="19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3.5 10h17" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" />
        </svg>
      </button>
    </div>
  );
}

export default CalendarDatePicker;
