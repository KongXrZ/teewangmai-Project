import type { CheckInGateway } from "./types";

const notReadyMessage = "ระบบเช็คอินยังไม่พร้อมใช้งาน โปรดลองใหม่ภายหลัง";

export const unavailableCheckInGateway: CheckInGateway = {
  resolveQr: async () => ({
    kind: "rejected",
    reason: "network",
    message: notReadyMessage,
  }),
  submitCheckIn: async () => ({
    kind: "rejected",
    reason: "network",
    message: notReadyMessage,
  }),
};
