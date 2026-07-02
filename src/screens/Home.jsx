import { categories, processorsInCategory } from '../processors/index.js'

export default function Home({ onSelectCategory }) {
  return (
    <div className="home">
      <div className="home-glow" />

      <header className="home-header">
        <span className="home-eyebrow">on-device · offline</span>
        <h1 className="home-title">
          Funny <span>Camera</span>
        </h1>
        <p className="home-sub">Pick a category</p>
      </header>

      <div className="mode-grid">
        {categories.map((cat) => {
          const count = processorsInCategory(cat.key).length
          const hasModes = count > 0
          return (
            <button
              key={cat.key}
              className={`mode-card ${hasModes ? 'mode-card--active' : 'mode-card--soon'}`}
              onClick={() => hasModes && onSelectCategory(cat.key)}
              disabled={!hasModes}
            >
              <span className={`mode-ring ${hasModes ? '' : 'mode-ring--dim'}`}>
                <span className="mode-ring-inner" />
              </span>
              <span className="mode-label">{cat.label}</span>
              <span className="mode-desc">{hasModes ? `${count} modes` : 'coming next'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
