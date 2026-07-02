import { useEffect, useRef } from 'react'
import { placesEnabled, attachAutocomplete } from '../lib/places'

// Ô nhập "Địa chỉ nhận tiền" có gợi ý Google Places nếu có API key,
// nếu không thì là input thường (không gây lỗi).
export default function PayoutAddress({ value, onChange, placeholder }) {
  const ref = useRef(null)

  useEffect(() => {
    let cleanup = () => {}
    if (placesEnabled && ref.current) {
      attachAutocomplete(ref.current, (p) => {
        const full = p.formatted || [p.streetNumber, p.route, p.city, p.state, p.zip].filter(Boolean).join(', ')
        onChange(full)
      }).then((fn) => { cleanup = fn })
    }
    return () => cleanup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <input
      ref={ref}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}
