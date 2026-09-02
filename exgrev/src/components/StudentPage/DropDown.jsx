function DropDown({ label, options, selectedOption, onSelect }) {
  function handleOptionSelect(option) {
    onSelect?.(option);
  }

  return (
    <div className="col-12 col-sm-6 d-flex justify-content-sm-end justify-content-center dropdown">
      <button
        className="btn btn-secondary dropdown-toggle"
        data-bs-toggle="dropdown"
        type="button"
        aria-expanded="false"
      >
        {selectedOption || label}
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
