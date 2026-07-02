import { useState } from 'react'
import Home from './screens/Home.jsx'
import ModeList from './screens/ModeList.jsx'
import CameraView from './screens/CameraView.jsx'
import './App.css'

function App() {
  const [category, setCategory] = useState(null)
  const [mode, setMode] = useState(null)

  if (category && mode) {
    return <CameraView mode={mode} onBack={() => setMode(null)} />
  }

  if (category) {
    return (
      <ModeList
        categoryKey={category}
        onLaunchMode={(key) => setMode(key)}
        onBack={() => setCategory(null)}
      />
    )
  }

  return <Home onSelectCategory={(key) => setCategory(key)} />
}

export default App
