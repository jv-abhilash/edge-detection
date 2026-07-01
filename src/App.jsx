import { useState } from 'react'
import Home from './screens/Home.jsx'
import CameraView from './screens/CameraView.jsx'
import './App.css'

function App() {
  const [screen, setScreen] = useState('home')

  if (screen === 'edge') {
    return <CameraView onBack={() => setScreen('home')} />
  }

  return <Home onLaunchEdge={() => setScreen('edge')} />
}

export default App
