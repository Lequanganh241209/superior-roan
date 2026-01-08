"use client";

import { useEffect } from "react";

export function GlobalErrorSuppressor() {
  useEffect(() => {
    // 1. Chặn console.error thông thường
    const originalError = console.error;
    console.error = (...args) => {
      // Kiểm tra mọi tham số, nếu chứa "AbortError" thì chặn lại
      if (args.some(arg => 
        (arg instanceof Error && (arg.name === 'AbortError' || arg.message?.includes('AbortError'))) ||
        (typeof arg === 'string' && arg.includes('AbortError'))
      )) return;
      
      originalError.apply(console, args);
    };

    // 2. Chặn Unhandled Promise Rejections (Nguyên nhân chính gây báo đỏ trong log của bạn)
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.name === 'AbortError' || event.reason?.message?.includes('AbortError')) {
        event.preventDefault(); // Ngăn trình duyệt báo lỗi
      }
    };
    
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      // Cleanup (không bắt buộc vì component này sống suốt đời app)
      console.error = originalError;
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null; // Component này không render gì cả
}
