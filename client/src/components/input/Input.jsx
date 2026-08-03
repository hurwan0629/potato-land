import "./Input.css"
export default function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}) {
  return (
    <input
      className="input"
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}