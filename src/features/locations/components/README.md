# Locations (FE-003)

UI ฐานของ Epic FE-003 สำหรับหน้า `/locations` Ticket ลูก (FE-004, FE-005) ให้ต่อยอดจากสัญญาด้านล่าง ไม่สร้างหน้า/การ์ด/ช่องค้นหา/ตัวกรองซ้ำ

## View model (`location-view-models.ts`)

- `LocationListState` — สถานะทั้งรายการ ส่งเข้ามาจากภายนอกเสมอ
  - `loading` — กำลังโหลด ไม่แสดงจำนวนผลลัพธ์
  - `unavailable` — ระบบรายการสถานที่ยังไม่พร้อม (ค่าที่ `/locations` ใช้จนกว่า BE-005/BE-006 พร้อม)
  - `error` — โหลดไม่สำเร็จ
  - `ready` — `buildings` จาก server ถ้าเป็น `[]` ขณะมีคำค้นหรือตัวกรอง จะแสดง "ไม่พบสถานที่ที่ค้นหา" ถ้าไม่มีจะแสดงว่ายังไม่มีสถานที่
- `BuildingCardModel` — `{ id, code, name, imageUrl, crowdLevel, updatedAt }`
  - `id` เป็น stable building ID ที่ชั้นเชื่อมข้อมูลส่งให้ (string)
  - `crowdLevel` เป็น `"low" | "medium" | "high"` หรือ `null` เมื่อยังไม่มีรายงาน (แสดง "ยังไม่มีข้อมูล" ไม่แสดงเป็นคนน้อย)
  - `updatedAt` เป็น ISO timestamp หรือ `null` แสดงเป็นเวลาไทย "อัปเดตล่าสุด HH:mm น."
  - ไม่มีรูปหรือโหลดรูปไม่สำเร็จจะใช้ไอคอน fallback

UI ไม่รับ Supabase row โดยตรง การแปลงค่าเฉลี่ย 1–5 เป็น `crowdLevel` เป็นงานของชั้นเชื่อมข้อมูล

## Callback ของ `LocationListPage`

- `onSearchChange(query)` — ทุกครั้งที่พิมพ์หรือล้างช่องค้นหา
- `onCrowdFilterChange(value)` — เมื่อเลือกตัวกรอง `all | low | medium | high`
- `onSelectBuilding(id)` — เมื่อกดการ์ดอาคาร

Component ไม่กรองหรือค้นหาเอง ผู้เรียกเป็นผู้ส่ง `buildings` ที่กรองแล้วกลับเข้ามา
