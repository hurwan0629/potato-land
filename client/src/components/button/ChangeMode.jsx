import { useState, useRef, useEffect } from "react"
import "./ChangeMode.css"
export default function Dropdown({ options, value, onChange, variant = "outline" }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)
  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [])

  return (
    <div className="dropdown" ref={ref}>
      <button
        className={`dropdown-trigger dropdown-trigger-${variant}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedLabel}
        <span className={`dropdown-arrow ${isOpen ? "open" : ""}`}>⌄</span>
      </button>

      {isOpen && (
        <ul className="dropdown-menu">
          {options.map((option) => (
            <li
              key={option.value}
              className={value === option.value ? "dropdown-item active" : "dropdown-item"}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}