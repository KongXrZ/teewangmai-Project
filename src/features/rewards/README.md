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

## Data layer (Ticket ลูก: Rewards balance and catalog data)

ฐาน Epic: `FE-008-rewards-achievements` @ `5281440` — ใช้ `RewardsPage`/`RewardsCatalog`/`RewardCard` เดิม ไม่สร้างซ้ำ

- `api/rewards-catalog-adapter.ts` — เรียก API และแปลง DTO → `RewardCardModel`/`RewardsCatalogState`
- `hooks/use-rewards-catalog.ts` — โหลด, retry, `refresh()` โดยคงหน้าจอเดิมไว้ระหว่าง refresh
- `components/rewards-catalog-container.tsx` — ต่อ hook เข้ากับ `RewardsPage` และเปิด flow แลก (FE-010)

### API contract ที่เสนอให้ BE-010 (ยังไม่ยืนยัน)

`GET /api/rewards` (session cookie)

```json
{
  "success": true,
  "data": {
    "points": 120,
    "rewards": [
      { "id": 1, "title": "…", "points_required": 50, "image_url": null, "availability": "redeemable" }
    ]
  }
}
```

| Response | UI state |
| :-- | :-- |
| 200 ตาม schema | `ready` (`rewards: []` = empty จริง) |
| 200 แต่ schema ไม่ตรง | `error` + retry |
| 401 | redirect `/login` |
| 404 / 501 / 503 | `unavailable` — API ยังไม่เปิด ไม่ถือเป็น empty |
| อื่นๆ / network error | `error` + retry (ใช้ `error` จาก body ถ้ามี) |

- `availability` ต้องคำนวณที่ server; ค่าที่ไม่รู้จักถูกแปลงเป็น `unavailable` และ browser ไม่คำนวณจาก stock/points เอง
- `points` คือ `users.points` ของผู้ใช้ปัจจุบัน

### Redemption callback (FE-010)

`RewardsCatalogContainer` รับ `renderRedemption({ rewardId, reward, onClose, onRedemptionConfirmed })`
- ถ้าไม่ส่ง prop นี้ ปุ่ม “แลก” ถูกปิดไว้
- FE-010 เรียก `onRedemptionConfirmed()` เฉพาะเมื่อ BE ยืนยันผลแลกแล้ว → container refresh คะแนน/catalog
