import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import JsBarcode from 'jsbarcode'
import { fetchOrder } from '../lib/data'
import { fmt, fdate, num } from '../lib/format'
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
function Header({ order, title }) {
  return (
    <div className="rcpt-head">
      <div className="rcpt-bigttl">{title || 'CUSTOMER RECEIPT'}</div>
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

// ====== Biên nhận GỬI HÀNG ======
// ====== Điều khoản vận chuyển (POLICY) cho biên nhận GỬI HÀNG ======
const CARGO_POLICY = [
  {
    n: '1. CLIENT RESPONSIBILITY',
    t: "Client(s) must advise the company about the content's condition before it is packaged by the company in order to perform its services safely and efficiently. CLIENT(s) must provide the company with a receipt of any electronic or high valued ($100+) package. Client(s) must inform the recipient to check the package in the presence of an employee. The client must inform the company regarding any information about their contents in due time to enable the required services to be performed effectively.",
    b: [],
  },
  {
    n: '2. BN LOGISTICS & CARGO INC RESPONSIBILITY',
    t: 'The company warrants that its services shall be performed in a professional manner and will abide by the Homeland Security rules and regulations. BN Logistics & Cargo INC reserves the right to refuse service under any circumstances.',
    b: [
      'Attending employees shall inspect the package when the company receives the package from either the client or a third party, which is associated with the client.',
      'BN Logistics & Cargo INC reserves the right to inspect the package for any reason.',
      'The company is NOT responsible for: (1) unlisted products or items, (2) perishable items (glass, ornaments, foods, etc.), (3) fake or real jewelry, or (4) lost or stolen items that are not listed upon delivery.',
      'BN Logistics & Cargo INC offers insurance of 5% of the total gross receipts of claimed contents. The company strongly encourages its clients to purchase insurance for high valued items.',
    ],
  },
  {
    n: '3.',
    t: 'BN Logistics & Cargo INC will only reimburse with the maximum $150.00 (included shipping fee) for lost or stolen packages. Only insured packages will be covered 100% of claimed receipts and shipping fees if the packages are lost or stolen only.',
    b: [
      'BN Logistics & Cargo INC is NOT reliable for any damages to items and insured packages that occur during transit.',
    ],
  },
]

// ====== Biên nhận GỬI HÀNG (mẫu công ty vận chuyển) ======
// Mã vạch Code128 từ mã đơn
function Barcode({ value }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, { format: 'CODE128', displayValue: false, height: 38, width: 1.4, margin: 0 })
      } catch { /* ignore */ }
    }
  }, [value])
  return <svg ref={ref} className="crc-barcode" />
}

function CargoReceipt({ order, recvAddr }) {
  const c = order.cargo || {}
  const items = c.items || []
  const declTotal = items.reduce((s, it) => s + num(it.qty) * num(it.price), 0)
  const freight = declTotal > 0 ? declTotal : num(c.freight)
  const grand = freight + num(c.surcharge) + num(c.insurance)
  const perLb = num(c.weight) > 0 ? freight / num(c.weight) : 0
  const descText = items.length > 0 ? items.map((it) => `${it.qty} ${it.product || '—'}`).join(', ') : (c.desc || '')
  const shipper = `${order.sender.first} ${order.sender.last}`.trim()
  const consignee = `${order.ben.first} ${order.ben.last}`.trim()
  const usd = (v) => `$${fmt(v)}`
  return (
    <div className="crc">
      {/* Header: công ty (trái) + mã vạch/mã đơn/ngày (phải) */}
      <div className="crc-head">
        <div className="crc-co">
          <div className="crc-co-name">BN LOGISTICS &amp; CARGO INC</div>
          <div className="crc-co-addr">15222 Whitestate St, Westminster, CA 92683<br />Tel: (626) 885-8259</div>
        </div>
        <div className="crc-head-right">
          <Barcode value={order.code} />
          <div className="crc-code">{order.code}</div>
          <div className="crc-date">{fdate(order.createdAt)}</div>
          <div className="crc-emp">Nhân viên nhận đơn: {order.employee || '—'}</div>
        </div>
      </div>

      {/* Thân biên nhận: các dòng label:value, ngăn bởi đường kẻ */}
      <div className="crc-rows">
        <div className="crc-row"><span><b>Người gửi:</b> {shipper}</span><span><b>Số ĐT:</b> {order.sender.phone}</span></div>
        <div className="crc-row"><span><b>Người nhận:</b> {consignee}</span><span><b>Số ĐT:</b> {order.ben.phone}</span></div>
        <div className="crc-full"><b>Địa chỉ:</b> {recvAddr}</div>
        <div className="crc-full"><b>Chi tiết hàng:</b> {descText}</div>
        <div className="crc-full"><b>Mô tả hàng:</b> {c.desc}</div>
        <div className="crc-hr" />
        <div className="crc-row"><span><b>Loại dịch vụ:</b> {c.service}</span><span><b>Hình thức thanh toán:</b> {c.pay}</span></div>
        <div className="crc-row3"><span><b>Số kiện:</b> {c.pieces}</span><span><b>Giá cước/lbs:</b> {usd(perLb)}</span><span><b>Trọng lượng (lbs):</b> {c.weight}</span></div>
        <div className="crc-row"><span><b>Tiền cước:</b> {usd(freight)}</span><span><b>Phụ phí:</b> {usd(num(c.surcharge))}</span></div>
        <div className="crc-row"><span><b>Tiền hàng:</b> {usd(num(c.goodsValue))}</span><span><b>Bảo hiểm:</b> {usd(num(c.insurance))}</span></div>
        <div className="crc-total"><b>TỔNG PHÍ: {usd(grand)}</b></div>

        {items.length > 0 && (
          <table className="rcpt-decl rcpt-mt">
            <thead><tr><th>Sản phẩm</th><th className="c">SL</th><th className="r">Đơn giá</th><th className="r">Thành tiền</th></tr></thead>
            <tbody>{items.map((it, i) => (
              <tr key={i}><td>{it.product || '—'}</td><td className="c">{it.qty}</td><td className="r">{usd(num(it.price))}</td><td className="r">{usd(num(it.qty) * num(it.price))}</td></tr>
            ))}</tbody>
          </table>
        )}

        {c.allowMsg && (c.msg || '').trim() ? (
          <div className="crc-msg"><b>Tin nhắn cho người nhận:</b> {c.msg}</div>
        ) : null}

        <table className="rcpt-signs crc-signs"><tbody><tr>
          <td><div className="rcpt-sigline" />Chữ ký khách hàng</td>
          <td><div className="rcpt-sigline" />Chữ ký nhân viên</td>
        </tr></tbody></table>
      </div>

      <div className="crc-note">LƯU Ý: KHÔNG THANH TOÁN BẤT KỲ PHÍ NÀO KHI NHẬN HÀNG</div>
      <div className="crc-note-sub">Cảm ơn quý khách đã sử dụng dịch vụ của BN Logistics &amp; Cargo INC. Mọi ý kiến đóng góp xin liên hệ (626) 885-8259 hoặc kiểm tra tình trạng thùng hàng qua web bnlogistics.us.</div>

      <div className="crc-policy-ttl">POLICY</div>
      {CARGO_POLICY.map((p, i) => (
        <div className="crc-policy" key={i}>
          <b>{p.n}{p.n.endsWith('.') ? '' : ':'}</b> {p.t}
          {p.b.map((bl, j) => <div className="crc-bullet" key={j}>• {bl}</div>)}
        </div>
      ))}
      <div className="crc-cert">“I certify that this cargo does not contain unauthorized explosives, incendiaries, or other destructive substances or items. I am aware that this endorsement and original signature and other shipping documents will be retained on file for a minimum of 30 calendar days.”</div>
    </div>
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
  const isCargo = order.orderType === 'cargo'
  const senderAddr = [order.sender.addr, order.sender.city, order.sender.state, order.sender.zip].filter(Boolean).join(', ')
  const recvAddr = order.ben.payoutAddr || [order.ben.addr, order.ben.city, order.ben.state || order.ben.province].filter(Boolean).join(', ')
  const parts = { order, isBank, senderAddr, recvAddr }

  const actions = (
    <div className="receipt-actions no-print">
      <button className="btn btn-ghost" onClick={() => navigate('/search-orders')}>{t('receipt.finish')}</button>
      <button className="btn btn-ghost" onClick={() => navigate('/create')}>{t('receipt.newOrder')}</button>
      <button className="btn btn-primary" onClick={() => downloadReceiptPdf({ order })}>Tải / In PDF (1 trang Letter)</button>
      <button className="btn btn-ghost" onClick={() => window.print()} title="Có thể bị tràn 2 trang trên một số trình duyệt">In bằng trình duyệt</button>
    </div>
  )

  // ===== Biên nhận GỬI HÀNG =====
  if (isCargo) {
    return (
      <>
        {actions}
        <div className="rcpt-scroll">
          <div className="rcpt-page" id="receipt-sheet">
            <CargoReceipt order={order} senderAddr={senderAddr} recvAddr={recvAddr} />
          </div>
        </div>
      </>
    )
  }

  // ===== Biên nhận GỬI TIỀN (giữ nguyên) =====
  return (
    <>
      {actions}
      <div className="rcpt-scroll">
        <div className="rcpt-page" id="receipt-sheet">
          {/* ===== BẢN CHÍNH ===== */}
          <Header order={order} title="CUSTOMER RECEIPT" />
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
