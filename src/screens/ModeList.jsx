import { categories, processorsInCategory } from '../processors/index.js'

export default function ModeList({ categoryKey, onLaunchMode, onBack }) {
  const category = categories.find((c) => c.key === categoryKey)
  const modes = processorsInCategory(categoryKey)

  return (
    <div className="home">
      <div className="home-glow" />

      <header className="home-header">
        <button className="modelist-back" onClick={onBack}>← Categories</button>
        <span className="home-eyebrow">{category?.desc}</span>
        <h1 className="home-title">{category?.label}</h1>
        <p className="home-sub">Pick a lens mode to launch</p>
      </header>

      <div className="mode-grid">
        {modes.map((p) => (
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
      </div>
    </div>
  )
}
