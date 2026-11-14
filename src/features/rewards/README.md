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

## Redemption dialog (FE-010)

ฐาน Epic: `FE-008-rewards-achievements` @ `5281440` — ช่วงที่ 1 (UI) ยังไม่เชื่อม API และยังไม่ต่อเข้า `/rewards`

- `components/redemption-dialog.tsx` — `RedemptionDialog` (presentational)
  - `open`, `reward: RewardCardModel | null`, `points: number | null` (แต้มจาก server; `null` = ไม่แสดงแถวแต้ม)
  - `result: RedemptionResult` — ผู้เรียกส่งเข้ามาเสมอ dialog ไม่เปลี่ยนเป็นสำเร็จเอง
  - `onConfirm(reward)` — เรียกครั้งเดียวต่อการกด; ระหว่าง `pending` หรือก่อนผู้เรียกตอบกลับจะไม่เรียกซ้ำ
  - `onClose(reason)` — `"cancel"` ปิดก่อนมีผลยืนยัน · `"done"` ปิดหลัง `success`; ระหว่าง `pending` ปิดไม่ได้ (Escape/backdrop/ปุ่มถูกล็อก)
  - `qr?: ReactNode` — แสดงใน `RedemptionQrArea` เฉพาะ state `success` และต้องมาจาก BE ที่ยืนยันแล้ว
- `components/redemption-qr-area.tsx` — กรอบ QR ตาม design เท่านั้น ไม่สร้าง token/QR
- `redemption.ts` — `RedemptionResult` และ `getRedemptionView()` (pure view model)

| `result.status`                       | แสดง                                                                                |
| :------------------------------------ | :---------------------------------------------------------------------------------- |
| `idle`                                | ยืนยันการแลก: รางวัล, แต้มที่ใช้, แต้มปัจจุบัน, ยืนยัน/ยกเลิก                       |
| `pending`                             | ปุ่มยืนยันแสดง “กำลังแลก…” และล็อกทุกปุ่ม                                           |
| `insufficient_points` / `unavailable` | ข้อความจาก server (`message?`) หรือข้อความ default + ปิดหน้าต่าง                    |
| `failure`                             | ข้อความ + “ลองใหม่” (ถ้า `retryable !== false`)                                     |
| `success`                             | แลกสำเร็จ + QR (ถ้าส่ง `qr`) — ไม่แสดงแต้มคงเหลือที่คำนวณเอง ให้ refresh จาก server |

Focus: MUI Dialog trap focus; เปิดแล้วจำปุ่มที่กด และคืน focus ให้ปุ่มนั้นหลังปิด; เมื่อเปลี่ยนเป็น result จะย้าย focus ไปหัวข้อ dialog

### การต่อกับ FE-009 (ช่วงที่ 2)

`RewardsCatalogContainer.renderRedemption({ rewardId, reward, onClose, onRedemptionConfirmed })` → component ของ FE-010 ที่ถือ `RedemptionResult` จาก redemption adapter:

- `onConfirm` → `POST` redemption ของ BE-010 ด้วย `rewardId` + idempotency key (ไม่ส่งราคา/แต้มจาก client)
- `onClose("cancel")` → `onClose()` · `onClose("done")` → `onRedemptionConfirmed()` เพื่อ refresh แต้ม/catalog
