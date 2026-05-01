'use client' // <--- This is the magic word that fixes the build error

import { Toaster, resolveValue, toast } from 'react-hot-toast'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

export default function ToastProvider() {
  return (
    <Toaster position="top-right">
      {(t) => {
        let accentColor = 'bg-blue-500'
        let iconColor = 'text-blue-500'
        let title = 'Info'
        let Icon = Info

        if (t.type === 'success') {
          accentColor = 'bg-green-500' 
          iconColor = 'text-green-500'
          title = 'Success'
          Icon = CheckCircle2
        } else if (t.type === 'error') {
          accentColor = 'bg-red-500'   
          iconColor = 'text-red-500'
          title = 'Error'
          Icon = XCircle
        }

        return (
          <div
            className={`${
              t.visible ? 'animate-in slide-in-from-top-2 fade-in duration-300' : 'animate-out fade-out slide-out-to-top-2 duration-200'
            } max-w-[350px] w-full bg-white shadow-xl shadow-gray-200/50 rounded-xl pointer-events-auto flex overflow-hidden border border-gray-100`}
          >
            <div className={`w-2 shrink-0 ${accentColor}`}></div>
            <div className="flex-1 p-4 flex items-start gap-3">
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
                <p className="text-xs font-medium text-gray-500 mt-0.5 leading-relaxed">
                  {resolveValue(t.message, t)}
                </p>
              </div>
              <button 
                onClick={() => toast.dismiss(t.id)}
                className="text-gray-400 hover:text-gray-900 transition-colors shrink-0 p-1 rounded-md hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      }}
    </Toaster>
  )
}