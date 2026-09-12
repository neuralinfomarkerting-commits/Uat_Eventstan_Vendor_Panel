"use client";

import toast from "react-hot-toast";

/**
 * Success toast — stays visible for 5 seconds.
 */
export function showSuccess(message: string) {
  toast.success(message, { duration: 5000 });
}

/**
 * Error toast — stays visible for 10 seconds.
 */
export function showError(message: string) {
  toast.error(message, { duration: 10000 });
}