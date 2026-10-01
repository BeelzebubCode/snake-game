import { useState, useRef, useEffect } from 'react';

export interface SelectOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
}

interface CustomSelectProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  className?: string;
}

export function CustomSelect<T extends string | number>({
  value,
  onChange,
  options,
  className = '',
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`custom-select ${className}`} ref={containerRef}>
      <div className={`custom-select-trigger ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
        <span>{selectedOption?.label}</span>
      </div>
      {open && (
        <div className="custom-select-dropdown">
          {options.map((option) => (
            <div
              key={option.value}
              className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
