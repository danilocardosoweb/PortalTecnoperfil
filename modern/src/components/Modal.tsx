import React, { PropsWithChildren, useEffect } from 'react'

type ModalProps = {
  open: boolean
  title: string
  onClose: ()=>void
  size?: 'default' | 'large' | 'fullscreen'
}

export function Modal({open, title, onClose, size = 'default', children}: PropsWithChildren<ModalProps>){
  useEffect(()=>{
    function onKey(e: KeyboardEvent){ if(e.key==='Escape' && open) onClose() }
    document.addEventListener('keydown', onKey)
    return ()=> document.removeEventListener('keydown', onKey)
  },[open, onClose])

  if(!open) return null
  
  const sizeClasses = {
    default: 'w-[min(760px,96vw)] max-h-[90vh]',
    large: 'w-[min(1200px,96vw)] max-h-[92vh]',
    fullscreen: 'w-[98vw] h-[96vh]'
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border ${sizeClasses[size]} grid`} style={{gridTemplateRows:'auto 1fr auto'}}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button className="px-2 py-1 rounded border" onClick={onClose} aria-label="Fechar"><i className="fa-solid fa-xmark"/></button>
        </div>
        <div className="p-4 overflow-auto">
          {children}
        </div>
        <div className="px-4 py-3 border-t text-sm text-gray-500">
          Pressione ESC para fechar
        </div>
      </div>
    </div>
  )
}
