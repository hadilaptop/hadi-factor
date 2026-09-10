import React, { useState, useRef, useEffect } from "react";

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "انتخاب کنید...",
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // بستن منو هنگام کلیک یا لمس خارج از کادر
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const handleSelect = (optValue) => {
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${className}`}
      
    >
      {/* دکمه اصلی انتخاب */}
      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="custom-select-label">
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        {/* فلش ثابت - هرگز حذف نمیشود و هنگام باز شدن میچرخد */}
        <span className={`custom-select-arrow ${isOpen ? "is-rotated" : ""}`}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>

      {/* منوی کشویی گزینه‌ها با استایل شیک و یکسان در موبایل و وب */}
      {isOpen && (
        <div className="custom-select-dropdown">
          {options.length === 0 ? (
            <div className="custom-select-empty">موردی یافت نشد</div>
          ) : (
            options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={opt.value}
                  className={`custom-select-option ${isSelected ? "is-selected" : ""}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <span className="option-label">{opt.label}</span>
                  {isSelected && <span className="option-checkmark">✓</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
