import { useRef, useState } from 'react'

export default function InfoTip({ text }) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef(null)

  function startLongPress() {
    timerRef.current = setTimeout(() => setOpen(true), 450)
  }
  function cancelLongPress() {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  return (
    <span
      className="info-tip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onTouchStart={startLongPress}
      onTouchEnd={() => {
        cancelLongPress()
        setTimeout(() => setOpen(false), 2500)
      }}
      onTouchMove={cancelLongPress}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="info-tip-badge">i</span>
      {open && <span className="info-tip-bubble">{text}</span>}
    </span>
  )
}
