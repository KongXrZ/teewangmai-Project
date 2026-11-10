export const AUTH_UNAVAILABLE = "ไม่สามารถติดต่อระบบได้ กรุณาลองใหม่อีกครั้ง";

export function getAuthErrorCode(error: { code?: string }) {
  switch (error.code) {
    case "invalid_credentials":
    case "email_not_confirmed":
      return "unauthorized" as const;
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rate_limited" as const;
    case "user_already_exists":
    case "email_exists":
    case "weak_password":
    case "signup_disabled":
      return "rejected" as const;
    default:
      return "unavailable" as const;
  }
}

// Only known public error codes become UI messages. Never render provider messages.
export function getAuthErrorMessage(error: { code?: string }): string {
  switch (error.code) {
    case "invalid_credentials":
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    case "email_not_confirmed":
      return "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ";
    case "user_already_exists":
    case "email_exists":
      return "ไม่สามารถสมัครด้วยอีเมลนี้ได้ กรุณาเข้าสู่ระบบหรือใช้ช่องทางกู้รหัสผ่าน";
    case "weak_password":
      return "รหัสผ่านไม่ผ่านข้อกำหนด กรุณาเปลี่ยนรหัสผ่านแล้วลองอีกครั้ง";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
    case "signup_disabled":
      return "ระบบยังไม่เปิดรับสมัครสมาชิกในขณะนี้";
    default:
      return AUTH_UNAVAILABLE;
  }
}
