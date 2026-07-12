# 🧾 CHỨC NĂNG: IN RECEIPT - TMS SHIPPING

## ✅ Thay Đổi

### **File Mới: src/components/PrintReceipt.jsx**

Component in receipt theo mẫu TMS Shipping:

```javascript
import PrintReceipt from '../components/PrintReceipt'

// Sử dụng:
const [showReceipt, setShowReceipt] = useState(false)

// Button
<button onClick={() => setShowReceipt(true)}>🧾 In Receipt</button>

// Modal
{showReceipt && <PrintReceipt order={order} onClose={() => setShowReceipt(false)} />}
```

---

## 📋 RECEIPT TEMPLATE

### **Header:**
- Logo TMS (đỏ)
- "Thành minh shipping"
- Địa chỉ: 15222 Weststate St, Westminster, CA92683
- Tel: 628 999 9989

### **Nội Dung (lấy từ order):**
- ✅ Người gửi (sender_name)
- ✅ Số ĐT gửi (sender_phone)
- ✅ Người nhận (receiver_name)
- ✅ Số ĐT nhận (receiver_phone)
- ✅ Địa chỉ nhận (receiver_address)
- ✅ Chi tiết hàng (description)
- ✅ Loại dịch vụ (Gửi tiền / Gửi hàng)

### **Tính Toán:**
- ✅ Số kiện: 1
- ✅ Giá cước/lbs (tô vàng): order.price_per_lb
- ✅ Trọng lượng: order.weight
- ✅ Phí phí: order.ship_fee
- ✅ Tiền cước (tô vàng): order.total_price
- ✅ Tiền hàng: $0.00
- ✅ Bảo hiểm: order.insurance
- ✅ TỔNG PHÍ: totalPrice + shipFee + insurance + otherFees

### **Chữ Ký:**
- Chữ ký khách hàng (trống)
- Chữ ký nhân viên (trống)

### **Lưu Ý:**
- "KHÔNG THANH TOÁN BẤT KỲ PHÍ NÀO KHI NHẬN HÀNG"
- Cảm ơn quý khách, liên hệ 628 999 9989
- Website: www.thanhminhshipping.com

---

## ✨ Tính Năng

✅ **In Receipt:** Print từ browser (Ctrl+P)
✅ **Tải PDF:** Download PDF file (receipt-[code].pdf)
✅ **Modal Popup:** Xem receipt trước khi in
✅ **Đóng Modal:** Click nút "Đóng" hoặc X
✅ **Auto Format:** Tính toán tự động từ order data
✅ **Fallback:** Hiển thị "—" nếu dữ liệu thiếu

---

## 🔧 Cách Sử Dụng

### **Thêm vào Order List:**

```javascript
// Ở file Orders page, Import:
import PrintReceipt from '../components/PrintReceipt'

// State
const [selectedOrder, setSelectedOrder] = useState(null)

// Button ở mỗi row:
<button onClick={() => setSelectedOrder(order)}>🧾 In</button>

// Modal
{selectedOrder && <PrintReceipt order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
```

### **Thêm vào CreateOrder Detail:**

```javascript
// Khi lưu đơn thành công, show receipt:
<button onClick={() => setShowReceipt(true)}>🧾 In Receipt</button>

{showReceipt && <PrintReceipt order={savedOrder} onClose={() => setShowReceipt(false)} />}
```

---

## 📊 Order Table Cần Có Fields:

```javascript
{
  code: "BN123",
  sender_name: "Nguyễn Văn A",
  sender_phone: "0123456789",
  sender_address: "123 Đường A",
  receiver_name: "Trần Thị B",
  receiver_phone: "0987654321",
  receiver_address: "456 Đường B, HCM",
  description: "Quần áo",
  service_type: "cargo",  // "money" hoặc "cargo"
  weight: 39,
  price_per_lb: 68.00,
  total_price: 2652.00,
  ship_fee: 0.00,
  insurance: 0.00,
  other_fees: 0.00
}
```

---

## 🎨 Styling

✅ **Phần tô vàng:**
- Giá cước/lbs: `background: '#ffffcc'`
- Tiền cước: `background: '#ffffcc'`

✅ **Phần bình thường:**
- Trắng/trắng

✅ **Font:**
- Arial, sans-serif
- 13px (body), 11-12px (chi tiết)
- Bold cho labels

---

## 🖨️ Thao Tác

| Button | Chức Năng |
|--------|----------|
| 🖨️ In | Mở dialog in browser |
| 📥 Tải PDF | Download PDF file |
| Đóng | Đóng modal |

---

## 📥 PDF Download

Dùng **jsPDF** + **html2canvas**:
1. Convert HTML → Canvas
2. Canvas → PNG
3. PNG → PDF
4. Save: `receipt-{order.code}.pdf`

---

## ⏳ Chưa Làm

- [ ] Thêm button Print vào Orders list page
- [ ] Thêm button Print vào CreateOrder success
- [ ] Database migration để thêm fields nếu thiếu
- [ ] i18n translation

---

## ✅ Ready to Use

Component `PrintReceipt` đã sẵn sàng, chỉ cần import vào page cần dùng!

```javascript
import PrintReceipt from '../components/PrintReceipt'

<PrintReceipt order={order} onClose={() => setShowReceipt(false)} />
```

---

## 🧪 Test

1. Click button "🧾 In Receipt"
2. Verify receipt hiển thị đúng
3. Click "🖨️ In" → Browser print dialog
4. Click "📥 Tải PDF" → PDF download
5. Click "Đóng" → Modal close
6. Verify PDF content chính xác

