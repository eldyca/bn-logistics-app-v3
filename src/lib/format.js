export const num = (v) => parseFloat(String(v).replace(/,/g, '')) || 0

// Giữ lại chữ số và tối đa một dấu chấm (giá trị thô, không có dấu phẩy).
export function toNumberString(s) {
  let v = String(s ?? '').replace(/,/g, '').replace(/[^\d.]/g, '')
  const parts = v.split('.')
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
  return v
}

// Hiển thị giá trị đang gõ ở dạng dấu chấm thập phân, KHÔNG chèn dấu phẩy ngăn nghìn.
export function groupThousands(s) {
  return String(s ?? '').replace(/,/g, '')
}

// Định dạng tiền tệ kiểu Mỹ: dấu phẩy ngăn nghìn + 2 số thập phân (dấu chấm).
// 0 -> "0.00", 1004 -> "1,004.00", 10000 -> "10,000.00", 1044.16 -> "1,044.16"
export const fmt = (n) =>
  (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fdate = (t) => new Date(t).toLocaleDateString('vi-VN')
export const ftime = (t) => new Date(t).toLocaleString('vi-VN')

export const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  completed: 'Hoàn tất',
  cancelled: 'Đã huỷ',
}

export const STATUS_KEYS = Object.keys(STATUS_LABELS)

export function esc(s) {
  return String(s ?? '')
}
