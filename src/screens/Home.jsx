import { processorList } from '../processors/index.js'

export default function Home({ onLaunchMode }) {
  return (
    <div className="home">
      <div className="home-glow" />

      <header className="home-header">
        <span className="home-eyebrow">on-device · offline</span>
        <h1 className="home-title">
          Funny <span>Camera</span>
        </h1>
        <p className="home-sub">Pick a lens mode to launch</p>
      </header>

      <div className="mode-grid">
        {processorList.map((p) => (
          <button
            key={p.key}
            className="mode-card mode-card--active"
            onClick={() => onLaunchMode(p.key)}
          >
            <span className="mode-ring">
              <span className="mode-ring-inner" />
            </span>
            <span className="mode-label">{p.label}</span>
            <span className="mode-desc">live</span>
          </button>
        ))}

        <div className="mode-card mode-card--soon">
          <span className="mode-ring mode-ring--dim">
            <span className="mode-ring-inner" />
          </span>
          <span className="mode-label">Face Detection</span>
          <span className="mode-desc">coming next</span>
        </div>
      </div>
    </div>
  )
}
