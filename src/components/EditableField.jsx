import { useState, useRef, useEffect } from 'react';
function EditableField({
  value,
  onSave,
  spanClassName,
  inputClassName,
  multiline = false
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const inputRef = useRef(null);
  if (value !== prevValue) {
    setPrevValue(value);
    setCurrentValue(value);
  }
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);
  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue.trim() !== value) {
      onSave(currentValue);
    }
  };
  const handleKeyDown = e => {
    if (e.key === 'Enter' && !multiline) {
      inputRef.current.blur();
    }
  };
  if (isEditing) {
    return multiline ? <textarea ref={inputRef} className={inputClassName} value={currentValue} onChange={e => setCurrentValue(e.target.value)} onBlur={handleBlur} rows="3" /> : <input type="text" ref={inputRef} className={inputClassName} value={currentValue} onChange={e => setCurrentValue(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown} />;
  }
  return <span onClick={() => setIsEditing(true)} className={`${spanClassName} ${multiline ? "d-block" : "d-inline-block"}`}>
            {value}
        </span>;
}
export default EditableField;