"use client"

import { useState, useEffect, useCallback } from "react"

type ToastProps = {
  title: string
  description: string
  variant?: "default" | "destructive"
  duration?: number
}

type ToastState = ToastProps & {
  id: string
  visible: boolean
}

export function toast(props: ToastProps) {
  const event = new CustomEvent("toast", { detail: props })
  window.dispatchEvent(event)
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const addToast = useCallback((props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...props, id, visible: true }])

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)))

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 300) // Animation duration
    }, props.duration || 3000)
  }, [])

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastProps>
      addToast(customEvent.detail)
    }

    window.addEventListener("toast", handleToast)
    return () => window.removeEventListener("toast", handleToast)
  }, [addToast])

  return { toasts }
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col items-end gap-2 p-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`transform rounded-lg shadow-lg transition-all duration-300 ${
            toast.visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
          } ${
            toast.variant === "destructive"
              ? "border border-red-600 bg-gray-900 text-white"
              : "border border-gray-700 bg-gray-900 text-white"
          }`}
        >
          <div className="flex w-full max-w-md items-center gap-3 p-4">
            <div className="flex-1">
              <h3 className={`font-medium ${toast.variant === "destructive" ? "text-red-500" : "text-amber-400"}`}>
                {toast.title}
              </h3>
              <p className="text-sm text-gray-300">{toast.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
