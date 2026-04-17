import React, { useEffect, useState, useCallback } from 'react';

export interface ToastState {
  id: number;
  message: string;
}

export function useToast(): {
  toast: ToastState | null;
  show: (message: string) => void;
} {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const h = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(h);
  }, [toast]);

  return { toast, show };
}

export function ToastView({ toast }: { toast: ToastState | null }): JSX.Element | null {
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-on-surface/90 px-4 py-2 text-sm font-medium text-white shadow-lg"
    >
      {toast.message}
    </div>
  );
}
