import { categories, tiers, processorsInTier, processorsInCategory } from '../processors/index.js'
import InfoTip from '../components/InfoTip.jsx'

export default function ModeList({ categoryKey, tierKey, onLaunchMode, onBack }) {
  const tier = tierKey ? tiers.find((t) => t.key === tierKey) : null
  const category = categories.find((c) => c.key === categoryKey)
  const modes = tierKey
    ? processorsInTier(categoryKey, tierKey)
    : processorsInCategory(categoryKey)

  const heading = tier ? tier.label : category?.label
  const desc = tier ? tier.desc : category?.desc
  const backLabel = tierKey ? '← Tiers' : '← Categories'

  return (
    <div className="home">
      <div className="home-glow" />

      <header className="home-header">
        <button className="modelist-back" onClick={onBack}>{backLabel}</button>
        <span className="home-eyebrow">{desc}</span>
        <h1 className="home-title">{heading}</h1>
        <p className="home-sub">Pick a lens mode to launch</p>
      </header>

      <div className="mode-grid">
        {modes.map((p) => (
          <button
            key={p.key}
            className="mode-card mode-card--active"
            onClick={() => onLaunchMode(p.key)}
          >
            <InfoTip text={p.info} />
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
