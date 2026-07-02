import { useState } from 'react'
import Home from './screens/Home.jsx'
import TierList from './screens/TierList.jsx'
import ModeList from './screens/ModeList.jsx'
import CameraView from './screens/CameraView.jsx'
import './App.css'

function App() {
  const [category, setCategory] = useState(null)
  const [tier, setTier] = useState(null)
  const [mode, setMode] = useState(null)

  if (category && tier && mode) {
    return <CameraView mode={mode} onBack={() => setMode(null)} />
  }

  if (category && tier) {
    return (
      <ModeList
        categoryKey={category}
        tierKey={tier}
        onLaunchMode={(key) => setMode(key)}
        onBack={() => setTier(null)}
      />
    )
  }

  if (category) {
    return (
      <TierList
        categoryKey={category}
        onSelectTier={(key) => setTier(key)}
        onBack={() => setCategory(null)}
      />
    )
  }

  return <Home onSelectCategory={(key) => setCategory(key)} />
}

export default App
