import { useEffect, useState } from 'react'
import { fmt, toNumberString } from '../lib/format'

// Ô nhập tiền: input số + ô đơn vị (suffix), cùng khối .inunit.
// - readOnly: caller truyền chuỗi đã format sẵn (vd fmt(receive)) -> hiển thị nguyên trạng.
// - nhập tay: khi đang focus cho gõ số bình thường (không dấu phẩy); khi blur thì
//   hiển thị định dạng 1,004.00. Giá trị thô (không dấu phẩy) trả về qua onChange.
export default function CurrencyInput({ value, onChange, unit, readOnly = false, placeholder, bold = false }) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')

  // Khi không focus và không readOnly: hiển thị bản format từ value model.
  useEffect(() => {
    if (!focused && !readOnly) {
      const raw = toNumberString(value)
      setDraft(raw === '' ? '' : fmt(raw))
    }
  }, [value, focused, readOnly])

  if (readOnly) {
    return (
      <div className="inunit">
        <input type="text" readOnly value={value ?? ''} style={bold ? { fontWeight: 700 } : undefined} />
        <span className="unit">{unit}</span>
      </div>
    )
  }

  return (
    <div className="inunit">
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        placeholder={placeholder}
        onFocus={(e) => {
          setFocused(true)
          setDraft(toNumberString(value))
          const el = e.target
          requestAnimationFrame(() => { try { el.select() } catch { /* noop */ } })
        }}
        onChange={(e) => {
          setDraft(e.target.value)
          onChange(toNumberString(e.target.value))
        }}
        onBlur={() => {
          setFocused(false)
          const raw = toNumberString(value)
          setDraft(raw === '' ? '' : fmt(raw))
        }}
        style={bold ? { fontWeight: 700 } : undefined}
      />
      <span className="unit">{unit}</span>
    </div>
  )
}
