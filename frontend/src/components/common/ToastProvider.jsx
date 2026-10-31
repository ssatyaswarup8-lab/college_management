import { createContext, useCallback, useContext, useMemo, useState } from 'react'
const ToastContext=createContext(null)
export function ToastProvider({children}){
 const [toasts,setToasts]=useState([])
 const dismiss=useCallback((id)=>setToasts((items)=>items.filter((item)=>item.id!==id)),[])
 const toast=useCallback((message,{type='info',duration=4500}={})=>{const id=globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`;setToasts((items)=>[...items,{id,message,type}]);if(duration>0)window.setTimeout(()=>dismiss(id),duration);return id},[dismiss])
 const value=useMemo(()=>({toast,dismiss}),[toast,dismiss])
 return <ToastContext.Provider value={value}>{children}<div aria-live="polite" className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,24rem)] flex-col gap-2">{toasts.map((item)=><div className={`flex items-start justify-between gap-3 rounded-xl border bg-white p-4 shadow-lg ${item.type==='error'?'border-rose-200':item.type==='success'?'border-emerald-200':'border-slate-200'}`} key={item.id} role={item.type==='error'?'alert':'status'}><p className="text-sm font-medium text-slate-800">{item.message}</p><button aria-label="Dismiss notification" className="text-slate-500 hover:text-slate-900" onClick={()=>dismiss(item.id)} type="button">×</button></div>)}</div></ToastContext.Provider>
}
export function useToast(){const context=useContext(ToastContext);if(!context)throw new Error('useToast must be used within ToastProvider');return context}
