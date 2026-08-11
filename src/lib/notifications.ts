// ============================================================
// Thông báo kết quả qua Zalo OA (Official Account)
//
// TRẠNG THÁI: chưa triển khai thật — file này là "điểm cắm" (hook)
// chuẩn bị sẵn để sau này scale lớn chỉ việc bổ sung implementation
// mà không phải đụng vào các file gọi.
//
// Tài liệu tham khảo khi triển khai:
//   - Zalo OA API: https://developers.zalo.me/docs/api/open-api
//   - Gửi tin nhắn text:
//       POST https://openapi.zalo.me/v3.0/message/officialaccount
//       headers: access_token (và refresh qua app_secret khi hết hạn)
//       body: {
//         recipient: { user_id: "<zalo_user_id>" },
//         message: { text: "<nội dung>" },
//       }
//   - Cần cấu hình: OA ID, access_token, refresh_token, app_secret
//     (lấy từ developer.zalo.me). Khuyến nghị lưu ở server-side
//     hoặc Supabase Edge Function — KHÔNG nhúng secret vào frontend.
//   - Cần ánh xạ số điện thoại → zalo user_id: hiện tại guest chưa
//     link Zalo; tương lai có thể dùng QR Zalo / Zalo Mini App để
//     lấy user_id khi khách đăng ký.
// ============================================================

export interface ResultNotificationPayload {
  fullName?: string;
  phone: string;
  passcode?: string;
  examTitle?: string;
  scoreVstep?: number | null;
  createdAt?: string;
}

/**
 * Gửi kết quả thi thử (writing/speaking sau khi GV chấm, hoặc
 * reading/listening sau khi nộp bài) cho khách qua Zalo OA.
 *
 * Hiện là no-op an toàn — mọi nơi gọi đều không đổi hành vi.
 * TODO: implement khi có Zalo OA credentials (xem header file).
 */
export async function sendResultNotification(_payload: ResultNotificationPayload): Promise<void> {
  // TODO(zalo-oa): gọi Zalo OA API để gửi kết quả + link tra cứu
  // (https://openapi.zalo.me/v3.0/message/officialaccount)
  return;
}
