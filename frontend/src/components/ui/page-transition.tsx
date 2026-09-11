import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

export function PageTransition({ children, transitionKey }: { children: ReactNode; transitionKey: string }) {
  const reduceMotion = useReducedMotion()
  const hidden = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }
  const visible = reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        initial={hidden}
        animate={visible}
        exit={hidden}
        transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
