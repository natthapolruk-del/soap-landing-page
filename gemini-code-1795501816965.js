const SCRIPT_URL = "YOUR_GOOGLE_SCRIPT_WEB_APP_URL";

// คำนวณราคารวมหน้า Landing Page
function calculateTotal() {
  const q1 = parseInt(document.getElementById("sku1")?.value || 0);
  const q2 = parseInt(document.getElementById("sku2")?.value || 0);
  const total = (q1 * 120) + (q2 * 150);
  if (document.getElementById("totalPrice")) {
    document.getElementById("totalPrice").innerText = total;
  }
  return total;
}

// ส่งออเดอร์ไปยัง Google Sheets
const orderForm = document.getElementById("orderForm");
if (orderForm) {
  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const sku1 = parseInt(document.getElementById("sku1").value || 0);
    const sku2 = parseInt(document.getElementById("sku2").value || 0);
    
    if (sku1 + sku2 <= 0) {
      alert("กรุณาเลือกสินค้าอย่างน้อย 1 ก้อน");
      return;
    }

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.innerText = "กำลังบันทึกคำสั่งซื้อ...";

    const payload = {
      name: document.getElementById("custName").value,
      phone: document.getElementById("custPhone").value,
      address: document.getElementById("custAddress").value,
      sku1: sku1,
      sku2: sku2,
      total: calculateTotal()
    };

    try {
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      alert(`สั่งซื้อสำเร็จ! รหัสคำสั่งซื้อของคุณคือ: ${result.orderId}`);
      orderForm.reset();
      calculateTotal();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่");
    } finally {
      btn.disabled = false;
      btn.innerText = "ยืนยันการสั่งซื้อ";
    }
  });
}

// ดึงข้อมูลมาแสดงหน้าหยิบสินค้า (Admin)
async function loadOrders() {
  const container = document.getElementById("orderList");
  if (!container) return;
  container.innerHTML = "<p>กำลังโหลดข้อมูล...</p>";

  try {
    const res = await fetch(SCRIPT_URL);
    const orders = await res.json();
    
    if (orders.length === 0) {
      container.innerHTML = "<p>ยังไม่มีรายการสั่งซื้อ</p>";
      return;
    }

    container.innerHTML = orders.reverse().map(ord => `
      <div class="order-card ${ord.Status === 'จัดส่งแล้ว' ? 'done' : ''}">
        <div class="order-top">
          <strong>รหัส: ${ord.OrderID}</strong> | <span>${ord.Timestamp}</span>
          <span class="badge">${ord.Status}</span>
        </div>
        <div class="pick-list">
          <h4>📋 รายการหยิบสินค้า (Pick List):</h4>
          <ul>
            ${ord.SKU1_Qty > 0 ? `<li><input type="checkbox"> <b>SKU-01 สบู่น้ำผึ้งขมิ้นชัน:</b> ${ord.SKU1_Qty} ก้อน</li>` : ''}
            ${ord.SKU2_Qty > 0 ? `<li><input type="checkbox"> <b>SKU-02 สบู่ชาเขียวอโลเวร่า:</b> ${ord.SKU2_Qty} ก้อน</li>` : ''}
          </ul>
          <p><b>ยอดชำระ:</b> ${ord.TotalPrice} บาท</p>
        </div>
        <div class="customer-info">
          <p><b>ผู้รับ:</b> ${ord.CustomerName} (${ord.Phone})</p>
          <p><b>ที่อยู่:</b> ${ord.Address}</p>
        </div>
        <div class="actions">
          <button onclick='printShippingLabel(${JSON.stringify(ord)})' class="btn-print">🖨️ พิมพ์ใบจ่าหน้าพัสดุ</button>
          ${ord.Status !== 'จัดส่งแล้ว' ? `<button onclick="markAsPacked('${ord.OrderID}')" class="btn-pack">✅ ยืนยันแพ็คเสร็จสิ้น</button>` : ''}
        </div>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = "<p>โหลดข้อมูลไม่สำเร็จ ตรวจสอบ URL ของ Apps Script</p>";
  }
}

// สั่งพิมพ์ใบจ่าหน้าพัสดุ
function printShippingLabel(ord) {
  const printArea = document.getElementById("printArea");
  printArea.innerHTML = `
    <div class="label-box">
      <div class="sender">
        <strong>ผู้ส่ง (SENDER):</strong><br>
        ร้าน PureAura Natural Soap<br>
        123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110<br>
        โทร: 089-999-9999
      </div>
      <hr>
      <div class="receiver">
        <strong>ผู้รับ (RECEIVER):</strong><br>
        <span class="rec-name">${ord.CustomerName}</span><br>
        โทร: ${ord.Phone}<br>
        ที่อยู่: ${ord.Address}
      </div>
      <hr>
      <div class="label-footer">
        <div>Order ID: <b>${ord.OrderID}</b></div>
        <div>รายการสินค้า: SKU-01 (${ord.SKU1_Qty}) | SKU-02 (${ord.SKU2_Qty})</div>
      </div>
    </div>
  `;
  window.print();
}

// อัปเดตสถานะใน Google Sheets
async function markAsPacked(orderId) {
  if (!confirm(`ยืนยันการแพ็คและจัดส่งออเดอร์ ${orderId} ?`)) return;
  await fetch(`${SCRIPT_URL}?action=updateStatus&orderId=${orderId}`);
  loadOrders();
}