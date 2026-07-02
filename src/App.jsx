import { useState } from 'react'
import Home from './screens/Home.jsx'
import CameraView from './screens/CameraView.jsx'
import './App.css'

function App() {
  const [mode, setMode] = useState(null)

  if (mode) {
    return <CameraView mode={mode} onBack={() => setMode(null)} />
  }

  return <Home onLaunchMode={(key) => setMode(key)} />
}

export default App
