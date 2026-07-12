import React, { useRef } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function PrintReceipt({ order, onClose }) {
  const receiptRef = useRef(null)

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    try {
      const element = receiptRef.current
      const canvas = await html2canvas(element, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`receipt-${order.code}.pdf`)
    } catch (e) {
      console.error('PDF download error:', e)
    }
  }

  // Format dữ liệu từ order
  const senderName = order.sender_name || 'Chưa cập nhật'
  const senderPhone = order.sender_phone || '—'
  const senderAddress = order.sender_address || 'Chưa cập nhật'
  const receiverName = order.receiver_name || 'Chưa cập nhật'
  const receiverPhone = order.receiver_phone || '—'
  const receiverAddress = order.receiver_address || 'Chưa cập nhật'
  const weight = order.weight || 0
  const pricePerLb = order.price_per_lb || 0
  const totalPrice = order.total_price || 0
  const shipFee = order.ship_fee || 0
  const insurance = order.insurance || 0
  const otherFees = order.other_fees || 0
  const finalTotal = totalPrice + shipFee + insurance + otherFees

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div style={{ background: '#fff', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', borderRadius: '8px' }}>
        {/* Actions */}
        <div style={{ padding: '16px', borderBottom: '1px solid #ddd', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={handlePrint} style={{ padding: '8px 16px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
            🖨️ In
          </button>
          <button onClick={handleDownloadPDF} style={{ padding: '8px 16px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
            📥 Tải PDF
          </button>
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
            Đóng
          </button>
        </div>

        {/* Receipt */}
        <div ref={receiptRef} style={{ padding: '40px', fontFamily: 'Arial, sans-serif', fontSize: '13px', lineHeight: '1.6', background: '#fff', color: '#333' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px', paddingBottom: '12px', borderBottom: '2px solid #333' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: 'bold', color: '#d32f2f' }}>TMS</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Thành minh shipping</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666' }}>
              15222 Weststate St, Westminster, CA92683<br />
              Tel: 628 999 9989
            </p>
          </div>

          {/* Info Grid */}
          <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', borderRight: '1px solid #ddd', width: '50%', borderBottom: '1px solid #ddd' }}>
                  <strong>Người gửi:</strong> {senderName}
                </td>
                <td style={{ padding: '8px', width: '50%', borderBottom: '1px solid #ddd' }}>
                  <strong>Số ĐT:</strong> {senderPhone}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderRight: '1px solid #ddd', width: '50%', borderBottom: '1px solid #ddd' }}>
                  <strong>Người nhận:</strong> {receiverName}
                </td>
                <td style={{ padding: '8px', width: '50%', borderBottom: '1px solid #ddd' }}>
                  <strong>Số ĐT:</strong> {receiverPhone}
                </td>
              </tr>
              <tr>
                <td colSpan="2" style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                  <strong>Địa chỉ:</strong> {receiverAddress}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Details */}
          <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', borderRight: '1px solid #ddd', width: '50%', borderBottom: '1px solid #ddd' }}>
                  <strong>Chi tiết hàng:</strong> {order.description || '—'}
                </td>
                <td style={{ padding: '8px', width: '50%', borderBottom: '1px solid #ddd' }}></td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderRight: '1px solid #ddd', width: '50%', borderBottom: '1px solid #ddd' }}>
                  <strong>Loại dịch vụ:</strong> {order.service_type === 'money' ? 'Gửi tiền' : 'Gửi hàng'}
                </td>
                <td style={{ padding: '8px', width: '50%', borderBottom: '1px solid #ddd' }}>
                  <strong>Hình thức TT:</strong> Đã thanh toán
                </td>
              </tr>
            </tbody>
          </table>

          {/* Calculation */}
          <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', borderRight: '1px solid #ddd', width: '25%', borderBottom: '1px solid #ddd' }}>
                  <strong>Số kiện:</strong> 1
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid #ddd', width: '25%', borderBottom: '1px solid #ddd', background: '#ffffcc' }}>
                  <strong>Giá cước/lbs:</strong> ${pricePerLb.toFixed(2)}
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid #ddd', width: '25%', borderBottom: '1px solid #ddd' }}>
                  <strong>Trọng lượng (lbs):</strong> {weight}
                </td>
                <td style={{ padding: '8px', width: '25%', borderBottom: '1px solid #ddd' }}>
                  <strong>Phí phí:</strong> ${shipFee.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderRight: '1px solid #ddd', width: '25%', borderBottom: '1px solid #ddd', background: '#ffffcc' }}>
                  <strong>Tiền cước:</strong> ${totalPrice.toFixed(2)}
                </td>
                <td style={{ padding: '8px', borderRight: '1px solid #ddd', width: '25%', borderBottom: '1px solid #ddd' }}>
                  <strong>Tiền hàng:</strong> $0.00
                </td>
                <td colSpan="2" style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                  <strong>Bảo hiểm:</strong> ${insurance.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td colSpan="4" style={{ padding: '12px', background: '#f0f0f0', fontWeight: 'bold', fontSize: '14px', borderBottom: '2px solid #333' }}>
                  TỔNG PHÍ: ${finalTotal.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signature */}
          <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '40px 8px 8px 8px', textAlign: 'center', width: '50%', borderRight: '1px solid #ddd', minHeight: '60px' }}>
                  <strong>Chủ ký khách hàng</strong>
                </td>
                <td style={{ padding: '40px 8px 8px 8px', textAlign: 'center', width: '50%', minHeight: '60px' }}>
                  <strong>Chủ ký nhân viên</strong>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Policy */}
          <div style={{ borderTop: '2px solid #333', paddingTop: '16px', fontSize: '11px', lineHeight: '1.5', color: '#666' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold' }}>LƯU Ý: KHÔNG THANH TOÁN BẤT KỲ PHÍ NÀO KHI NHẬN HÀNG</h4>
            <p style={{ margin: 0, marginBottom: '8px' }}>
              Cảm ơn quý khách đã sử dụng dịch vụ của BN Logistics & Cargo INC. Mọi kiến động góp ý liên hệ <strong>628 999 9989</strong> hoặc kiểm tra trạng thái thủng hàng qua website: <strong>www.thanhminhshipping.com</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
