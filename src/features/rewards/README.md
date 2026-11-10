# Rewards (FE-008)

UI ฐานของ Epic FE-008 สำหรับหน้า `/rewards` Ticket ลูกให้ต่อยอดจากสัญญาด้านล่าง ไม่สร้างหน้า/การ์ดซ้ำ

## View model (`types.ts`)

- `RewardsCatalogState` — สถานะทั้งหน้า ส่งเข้ามาจากภายนอกเสมอ
  - `loading` — แสดง skeleton ไม่แสดงแต้ม 0
  - `unavailable` — ระบบรางวัลยังไม่พร้อม (ค่าที่ `/rewards` ใช้จนกว่า BE-010 พร้อม)
  - `error` — มี `message?` และ `onRetry?`
  - `ready` — `points` และ `rewards` จาก server; `rewards: []` คือ empty state
- `RewardCardModel` — `{ id, title, pointsRequired, imageUrl, availability }`
  - `availability` มาจาก server: `redeemable` | `insufficient_points` | `out_of_stock` | `upcoming` | `unavailable`
  - `upcoming` แสดงในส่วน “เร็วๆ นี้” แบบล็อก ส่วนอื่นแสดงใน “รางวัลที่แลกได้ตอนนี้”
  - ไม่มีรูปหรือโหลดรูปไม่สำเร็จจะใช้ไอคอน fallback

UI ไม่รับ Supabase row โดยตรง ให้ชั้นเชื่อมข้อมูลแปลง `rewards` row เป็น `RewardCardModel`

## Callback

- `onSelectReward(reward: RewardCardModel)` เรียกเมื่อกด “แลก” บนรางวัล `redeemable` เท่านั้น
- `selectionDisabled` ปิดปุ่มแลกทั้งหมด เช่นระหว่างรอ transaction
- Callback นี้เป็นแค่การเลือก ไม่หักแต้ม/stock และไม่แสดงผลแลกสำเร็จ
  Dialog ยืนยัน/QR อยู่ใน Ticket ลูก และแสดง QR เมื่อ transaction สำเร็จจาก server เท่านั้น
