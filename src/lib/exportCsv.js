import { ftime, fmt, STATUS_LABELS } from './format'

function csvRow(arr) {
  return arr
    .map((c) => {
      const s = String(c ?? '')
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    })
    .join(',')
}

function download(name, csv) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportOrders(orders) {
  if (!orders.length) {
    alert('Chưa có dữ liệu để xuất.')
    return
  }
  const head = [
    'Ma', 'Ngay', 'TrangThai',
    'NG_Ho', 'NG_Ten', 'NG_SDT', 'NG_TP', 'NG_DiaChi', 'NG_GhiChu',
    'NN_Ho', 'NN_Ten', 'NN_SDT', 'NN_Tinh', 'NN_HinhThucNhan', 'NN_DiaChi', 'NN_DiaChiNhanTien',
    'NganHang', 'SoTaiKhoan', 'ChuTaiKhoan', 'ChiNhanh',
    'TienGui', 'TyGia', 'TienNhan', 'DonViNhan', 'PhanTramThue', 'Thue', 'PhanTramPhiGD', 'PhiGD',
    'ThanhToan', 'TongCong', 'GhiChu',
  ]
  const rows = orders.map((x) => {
    const bk = x.bank || {}
    return [
      x.code, ftime(x.createdAt), STATUS_LABELS[x.status],
      x.sender.first, x.sender.last, x.sender.phone, x.sender.city, x.sender.addr, x.sender.note || '',
      x.ben.last, x.ben.first, x.ben.phone, x.ben.province, x.ben.delivery, x.ben.addr, x.ben.payoutAddr || '',
      bk.name || '', bk.account || '', bk.holder || '', bk.branch || '',
      x.tx.send, x.tx.rate, x.tx.receive, x.tx.cur, x.tx.taxPct, x.tx.tax, x.tx.feePct, x.tx.fee,
      x.tx.pay, x.tx.total, x.tx.memo,
    ]
  })
  download(
    'don-hang-' + new Date().toISOString().slice(0, 10) + '.csv',
    [csvRow(head), ...rows.map(csvRow)].join('\n')
  )
}

export function exportStatement(orders) {
  const f = (k) => orders.reduce((s, x) => s + x.tx[k], 0)
  const rows = [
    ['Khoan', 'SoTien'],
    ['Tong tien gui', fmt(f('send'))],
    ['Tong tien nhan', fmt(f('receive'))],
    ['Tong phi GD', fmt(f('fee'))],
    ['Tong thue', fmt(f('tax'))],
    ['Tong cong', fmt(f('total'))],
  ]
  download(
    'sao-ke-' + new Date().toISOString().slice(0, 10) + '.csv',
    rows.map(csvRow).join('\n')
  )
}
