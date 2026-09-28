function DropDown({ label, options, selectedOption, onSelect }) {
  function handleOptionSelect(option) {
    onSelect?.(option);
  }

  return (
    <div className="form-field dropdown-field dropdown">
      <span className="form-label">{label}</span>
      <button
        className="dropdown-button dropdown-toggle"
        data-bs-toggle="dropdown"
        type="button"
        aria-expanded="false"
      >
        {selectedOption || "Choose an option"}
      </button>
      <ul className="dropdown-menu">
        {options.map((option) => (
          <li key={option}>
            <button
              className="dropdown-item"
              type="button"
              onClick={() => handleOptionSelect(option)}
            >
              {option}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DropDown;
