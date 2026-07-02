import { categories, tiers, processorsInTier } from '../processors/index.js'
import InfoTip from '../components/InfoTip.jsx'

export default function TierList({ categoryKey, onSelectTier, onBack }) {
  const category = categories.find((c) => c.key === categoryKey)

  return (
    <div className="home">
      <div className="home-glow" />

      <header className="home-header">
        <button className="modelist-back" onClick={onBack}>← Categories</button>
        <span className="home-eyebrow">{category?.desc}</span>
        <h1 className="home-title">{category?.label}</h1>
        <p className="home-sub">Pick a technique tier</p>
      </header>

      <div className="mode-grid">
        {tiers.map((t) => {
          const count = processorsInTier(categoryKey, t.key).length
          const hasModes = count > 0
          return (
            <button
              key={t.key}
              className={`mode-card ${hasModes ? 'mode-card--active' : 'mode-card--soon'}`}
              onClick={() => hasModes && onSelectTier(t.key)}
              disabled={!hasModes}
            >
              <InfoTip text={t.info} />
              <span className={`mode-ring ${hasModes ? '' : 'mode-ring--dim'}`}>
                <span className="mode-ring-inner" />
              </span>
              <span className="mode-label">{t.label}</span>
              <span className="mode-desc">{hasModes ? `${count} modes` : 'coming later'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
