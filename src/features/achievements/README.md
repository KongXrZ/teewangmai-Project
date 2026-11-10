# Achievements (FE-011)

หน้า `/achievements` — คลังเหรียญความสำเร็จและรายละเอียด Badge
ฐาน Epic: `FE-008-rewards-achievements` @ `5281440` — reuse `MobileShell` / `BottomNavigation` เดิม ไม่สร้าง Home/nav ซ้ำ

## View model (`types.ts`, `view-model.ts`)

- `AchievementsState` — `loading` | `unavailable` | `error` (`message?`, `onRetry?`) | `ready` (`badges`)
  - `ready` + `badges: []` คือ empty จริงจาก server เท่านั้น
  - `unavailable` = API ยังไม่เปิด ไม่ถือเป็น empty
- `BadgeModel` — `{ id, name, description, iconUrl, requirement: { type, value, description }, earnedAt }`
  - ได้รับแล้ว ⇔ `earnedAt !== null` (ค่าจาก server) — client ไม่คำนวณหรือมอบ Badge
  - `requirement.type/value` เก็บไว้เฉย ๆ ไม่ถูกตีความเพื่อคำนวณ progress/streak/award
  - `requirement.description` ว่าง → แสดง “ยังไม่มีรายละเอียดเงื่อนไข”
  - วันที่ได้รับ/จำนวน “x จาก y” แสดงจาก input จริงเท่านั้น
- `getBadgeCollectionView(badges, filter)` — แบ่ง earned/locked ตามลำดับที่ server ส่ง

## Components

- `BadgeCollection` — presentational; รับ `state`, `filter`, `onFilterChange`, `onSelectBadge`
- `BadgeFilterTabs` — ทั้งหมด / ได้รับแล้ว / ยังไม่ได้รับ (`aria-pressed`)
- `BadgeItem`, `BadgeIcon` — earned/locked + icon fallback เมื่อไม่มีรูปหรือโหลดไม่สำเร็จ
- `BadgeDetailDialog` — เปิดเมื่อ `badge !== null`, ปิดด้วย X / “ปิดหน้าต่าง” / Esc / backdrop
- `AchievementsPage` — layout + nav; `AchievementsContainer` — ต่อ hook + UI state (filter, selection)

## Data layer

- `api/badges-adapter.ts` — เรียก API และแปลง DTO → `BadgeModel` / `AchievementsState`
- `hooks/use-achievements.ts` — load, retry, `refresh()` (คงหน้าจอเดิม) และ refresh เมื่อกลับมาที่แท็บ
- Detail ที่เปิดอยู่ resolve จากข้อมูลล่าสุด — refresh แล้วอัปเดตทันที, badge หายไป → ปิด dialog

### API contract ที่เสนอให้ BE-011 (ยังไม่ยืนยัน)

`GET /api/badges` (session cookie) — catalog + earned state ของผู้ใช้ปัจจุบัน

```json
{
  "success": true,
  "data": {
    "badges": [
      {
        "id": 1,
        "name": "นักสำรวจ",
        "description": "…",
        "icon_url": null,
        "requirement_type": "checkin_count",
        "requirement_value": 5,
        "requirement_text": "เช็กอิน 5 สถานที่",
        "is_active": true,
        "earned_at": "2026-11-01T03:15:00+00:00"
      }
    ]
  }
}
```

- `earned_at` มาจาก `user_badges.earned_at`; `null` = ยังไม่ได้รับ
- `requirement_text` ข้อความที่ server เตรียมไว้แสดง (nullable)
- Inactive (`is_active: false`) แสดงเฉพาะเมื่อผู้ใช้ได้รับแล้ว (server ควรกรอง; adapter กรองซ้ำ)

| Response                                         | UI state                                     |
| :----------------------------------------------- | :------------------------------------------- |
| 200 ตาม schema                                   | `ready` (`badges: []` = empty จริง)          |
| 200 แต่ schema ไม่ตรง / `earned_at` ไม่ใช่วันที่ | `error` + retry                              |
| 401                                              | redirect `/login`                            |
| 404 / 501 / 503                                  | `unavailable` — API ยังไม่เปิด               |
| อื่นๆ / network error                            | `error` + retry (ใช้ `error` จาก body ถ้ามี) |
