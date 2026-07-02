import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchOrder } from '../lib/data'
import { fmt, fdate } from '../lib/format'
import { downloadReceiptPdf } from '../lib/receiptPdf'

// ====== Trạng thái song ngữ ======
const STATUS_BI = {
  pending: 'Chờ xử lý / Pending',
  processing: 'Đang xử lý / Processing',
  completed: 'Hoàn tất / Completed',
  cancelled: 'Đã huỷ / Cancelled',
}

// ====== Điều khoản pháp lý (mỗi mục: tiêu đề EN/VI, rồi đoạn EN trên - VI dưới) ======
const LEGAL = [
  {
    en: 'RIGHT TO A REFUND',
    vi: 'QUYỀN ĐƯỢC HOÀN TIỀN',
    paras: [
      { en: true, text: 'The sender is entitled to a refund if, within 10 days after the Company receives the sender’s funds, the Company fails to transfer the money or fails to deliver it to the designated recipient, unless the sender has provided other instructions.' },
      { en: false, text: 'Người gửi sẽ được hoàn lại tiền nếu trong vòng 10 ngày kể từ ngày Công Ty nhận tiền của quý vị mà không chuyển được số tiền đó hoặc không giao được cho người nhận mà quý vị đã yêu cầu, trừ khi người gửi có yêu cầu khác.' },
      { en: true, text: 'If the funds have not been transferred in accordance with the sender’s instructions, the sender has the right to request a refund. To receive the refund, the sender must present the original receipt at the Company’s office.' },
      { en: false, text: 'Khi số tiền chưa được chuyển giao theo yêu cầu của người gửi, người gửi có quyền yêu cầu hoàn lại tiền. Để nhận lại tiền, người gửi phải mang biên nhận gốc đến văn phòng Công Ty.' },
    ],
  },
  {
    en: "SENDER'S RIGHT TO CANCEL AND RECEIVE A REFUND",
    vi: 'QUYỀN CỦA NGƯỜI GỬI ĐỐI VỚI VIỆC HỦY GIAO DỊCH VÀ HOÀN TIỀN',
    paras: [
      { en: true, text: 'You may cancel the transaction and receive a full refund within thirty (30) minutes of payment, unless the funds have already been received by the beneficiary or deposited into an account.' },
      { en: false, text: 'Quý vị có thể hủy giao dịch và được hoàn lại toàn bộ số tiền trong vòng ba mươi (30) phút kể từ thời điểm thanh toán, trừ khi khoản tiền đó đã được người nhận nhận hoặc đã được ghi có vào tài khoản.' },
    ],
  },
  {
    en: 'ERROR RESOLUTION',
    vi: 'GIẢI QUYẾT SAI SÓT',
    paras: [
      { en: true, text: 'If you believe there is an error in your transaction, please contact us at (626) 885-8259 within forty-eight (48) hours.' },
      { en: false, text: 'Nếu quý vị cho rằng có sai sót trong giao dịch của mình, vui lòng liên hệ với chúng tôi qua số điện thoại (626) 885-8259 trong vòng bốn mươi tám (48) giờ.' },
    ],
  },
  {
    en: 'PRIVACY POLICY',
    vi: 'CHÍNH SÁCH QUYỀN RIÊNG TƯ',
    paras: [
      { en: true, text: 'We do not disclose any non-public personal or financial information of its customers to third parties, except as permitted by law or as necessary to process and complete transactions requested and authorized by the customer.' },
      { en: false, text: 'Chúng tôi không tiết lộ bất kỳ thông tin cá nhân hoặc thông tin tài chính không công khai nào của khách hàng cho bên thứ ba, ngoại trừ các trường hợp được pháp luật cho phép hoặc cần thiết để xử lý và thực hiện giao dịch mà quý khách đã yêu cầu và cho phép.' },
    ],
  },
]

// Một dòng dữ liệu: "Nhãn (song ngữ): GIÁ TRỊ"
function Line({ k, v }) {
  return (
    <div className="rcpt-line"><span className="lk">{k}:</span> <span className="lv">{v || ''}</span></div>
  )
}

// Tiêu đề + hàng thông tin đơn (căn giữa)
function Header({ order }) {
  return (
    <div className="rcpt-head">
      <div className="rcpt-bigttl">CUSTOMER RECEIPT</div>
      <table className="rcpt-metarow"><tbody><tr>
        <td><b>Order No:</b> {order.code}</td>
        <td><b>Date / Ngày:</b> {fdate(order.createdAt)}</td>
        <td><b>Status:</b> {STATUS_BI[order.status] || order.status}</td>
        <td><b>Employee / Nhân viên:</b> {order.employee || '—'}</td>
      </tr></tbody></table>
    </div>
  )
}

// Bảng SENDER / RECIPIENT
function Parties({ order, isBank, senderAddr, recvAddr }) {
  return (
    <table className="rcpt-grid">
      <thead><tr><th>SENDER (Người gửi)</th><th>RECIPIENT (Người nhận)</th></tr></thead>
      <tbody><tr>
        <td>
          <Line k="Full Name (Họ tên)" v={`${order.sender.first} ${order.sender.last}`.trim()} />
          <Line k="Address (Địa chỉ)" v={senderAddr} />
          <Line k="Phone (Điện thoại)" v={order.sender.phone} />
          <Line k="Amount to be transmitted (Số tiền gửi)" v={`${fmt(order.tx.send)} USD`} />
          <Line k="Transmission fee (Phí giao dịch)" v={`${fmt(order.tx.fee)} USD`} />
          <Line k="Transfer tax (Thuế)" v={`${fmt(order.tx.tax)} USD`} />
          <Line k="Total (Tổng cộng)" v={`${fmt(order.tx.total)} USD`} />
          <Line k="Receive amount (Số tiền nhận)" v={`${fmt(order.tx.receive)} ${order.tx.cur}`} />
          <Line k="Currency to be delivered (Giao tiền)" v={order.tx.cur} />
        </td>
        <td>
          <Line k="Full Name (Họ tên)" v={`${order.ben.first} ${order.ben.last}`.trim()} />
          <Line k="Phone (Điện thoại)" v={order.ben.phone} />
          {isBank ? (
            <>
              <Line k="Bank (Ngân hàng)" v={order.bank.name} />
              <Line k="Account No. (Số tài khoản)" v={order.bank.account} />
              <Line k="Account holder (Chủ tài khoản)" v={order.bank.holder} />
            </>
          ) : (
            <Line k="Payout address (Địa chỉ nhận tiền)" v={recvAddr} />
          )}
          <Line k="Method of Payment (Thanh toán)" v={order.tx.pay} />
          <Line k="Delivery method (Hình thức nhận)" v={order.ben.delivery} />
          <Line k="Message (Lời nhắn)" v={order.sender.msg} />
          <Line k="Notes (Ghi chú)" v={order.tx.memo} />
        </td>
      </tr></tbody>
    </table>
  )
}

// Hàng chữ ký (gạch ký + nhãn) — dùng chung cho bản chính & bản sao
function Signs() {
  return (
    <table className="rcpt-signs"><tbody><tr>
      <td><div className="rcpt-sigline" />Sender's Signature (Chữ ký người gửi)</td>
      <td><div className="rcpt-sigline" />Received By (Nhận bởi)</td>
    </tr></tbody></table>
  )
}

export default function Receipt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    fetchOrder(id).then(setOrder).catch((e) => setErr(e.message || String(e)))
  }, [id])

  if (err) return <div className="banner err">{err}</div>
  if (!order) return <div className="empty">{t('common.loading')}</div>

  const isBank = (order.ben.delivery || '').includes('Chuyển khoản')
  const senderAddr = [order.sender.addr, order.sender.city, order.sender.state, order.sender.zip].filter(Boolean).join(', ')
  const recvAddr = order.ben.payoutAddr || [order.ben.addr, order.ben.city, order.ben.state || order.ben.province].filter(Boolean).join(', ')
  const parts = { order, isBank, senderAddr, recvAddr }

  return (
    <>
      <div className="receipt-actions no-print">
        <button className="btn btn-ghost" onClick={() => navigate('/search-orders')}>{t('receipt.finish')}</button>
        <button className="btn btn-ghost" onClick={() => navigate('/create')}>{t('receipt.newOrder')}</button>
        <button className="btn btn-primary" onClick={() => downloadReceiptPdf({ order })}>Tải / In PDF (1 trang Letter)</button>
        <button className="btn btn-ghost" onClick={() => window.print()} title="Có thể bị tràn 2 trang trên một số trình duyệt">In bằng trình duyệt</button>
      </div>

      <div className="rcpt-scroll">
        <div className="rcpt-page" id="receipt-sheet">
          {/* ===== BẢN CHÍNH ===== */}
          <Header order={order} />
          <Parties {...parts} />
          <Signs />

          {/* ===== ĐIỀU KHOẢN ===== */}
          <div className="rcpt-legal">
            {LEGAL.map((s, i) => (
              <div className="rcpt-legal-sec" key={i}>
                <div className="rcpt-legal-ttl">{s.en} / {s.vi}</div>
                {s.paras.map((p, j) => (
                  <div className={p.en ? 'rcpt-legal-en' : 'rcpt-legal-vi'} key={j}>{p.text}</div>
                ))}
              </div>
            ))}
          </div>

          {/* ===== BẢN SAO ===== */}
          <div className="rcpt-copydiv">— — — — — — — — — — &nbsp; COPY / BẢN SAO &nbsp; — — — — — — — — — —</div>
          <table className="rcpt-copymeta"><tbody><tr>
            <td><b>Order No:</b> {order.code}</td>
            <td><b>Date / Ngày:</b> {fdate(order.createdAt)}</td>
            <td><b>Employee / Nhân viên:</b> {order.employee || '—'}</td>
          </tr></tbody></table>
          <Parties {...parts} />
          <Signs />
        </div>
      </div>
    </>
  )
}
