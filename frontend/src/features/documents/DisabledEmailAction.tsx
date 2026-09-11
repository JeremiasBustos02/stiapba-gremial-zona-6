import { Mail } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'

const title = 'Envío por correo temporalmente deshabilitado'
const description = 'Estamos terminando de configurar esta función para que los documentos puedan enviarse correctamente.'

export function DisabledEmailAction({ label = 'Enviar por mail', className = '', grouped = false }: { label?: string; className?: string; grouped?: boolean }) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const messageRef = useRef<HTMLDivElement>(null)
  const [messageVisible, setMessageVisible] = useState(false)
  const [messagePosition, setMessagePosition] = useState({ left: 0, top: 0 })
  const messageId = useId()

  const showMessage = () => setMessageVisible(true)
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      showMessage()
    }
  }

  useLayoutEffect(() => {
    if (!messageVisible || !triggerRef.current || !messageRef.current) return
    const updatePosition = () => {
      const trigger = triggerRef.current?.getBoundingClientRect()
      const message = messageRef.current?.getBoundingClientRect()
      if (!trigger || !message) return
      const top = trigger.top - message.height - 10 >= 8 ? trigger.top - message.height - 10 : trigger.bottom + 10
      const left = Math.min(Math.max(trigger.left + trigger.width / 2, message.width / 2 + 8), window.innerWidth - message.width / 2 - 8)
      setMessagePosition({ left, top })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [messageVisible])

  useEffect(() => {
    if (!messageVisible) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !messageRef.current?.contains(target)) setMessageVisible(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [messageVisible])

  return <div className={`relative ${className}`} onMouseEnter={showMessage} onMouseLeave={() => setMessageVisible(false)}>
    <Button ref={triggerRef} type="button" variant="outline" aria-disabled="true" aria-expanded={messageVisible} aria-describedby={messageVisible ? messageId : undefined}
      className={`w-full cursor-not-allowed opacity-60 transition-opacity hover:opacity-75 ${grouped ? 'border-0 rounded-none' : ''}`} onClick={(event) => { event.preventDefault(); showMessage() }} onFocus={showMessage} onKeyDown={handleKeyDown}>
      <Mail size={17} />{label}
    </Button>
    {messageVisible && createPortal(<div ref={messageRef} id={messageId} role="tooltip" className="fixed z-[60] w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left text-sm text-slate-700 shadow-lg" style={messagePosition}>
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-1 leading-relaxed">{description}</p>
    </div>, document.body)}
  </div>
}
