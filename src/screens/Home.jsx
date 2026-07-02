import { categories, processorsInCategory } from '../processors/index.js'
import InfoTip from '../components/InfoTip.jsx'

const categoryInfo = {
  nonml: 'Classical, hand-designed algorithms — Canny, bilateral filters, contours. No training, no model files, deterministic every time.',
  ml: 'A trained neural network runs inference on-device via OpenCV\u2019s DNN module (WASM) — genuinely learned parameters, not hand-written rules.',
  heavy: 'Face recognition specifically \u2014 your phone streams frames to a Python/FastAPI backend on your Legion T5 for GPU-accelerated processing.',
}

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
              <InfoTip text={categoryInfo[cat.key]} />
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
