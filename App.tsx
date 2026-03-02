import { useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import SetupScreen from './components/SetupScreen'
import GameScreen from './components/GameScreen'
import type { PlayerConfig } from './components/GameScreen'

type Screen = 'setup' | 'game'

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([])

  const handleStart = (configs: PlayerConfig[]) => {
    setPlayerConfigs(configs)
    setScreen('game')
  }

  const handleReturnToMenu = () => {
    setScreen('setup')
  }

  if (screen === 'game' && playerConfigs.length > 0) {
    return (
      <>
        <StatusBar style="light" />
        <GameScreen
          key={playerConfigs.map(p => p.name).join(',')}
          playerConfigs={playerConfigs}
          onReturnToMenu={handleReturnToMenu}
        />
      </>
    )
  }

  return (
    <>
      <StatusBar style="light" />
      <SetupScreen onStart={handleStart} />
    </>
  )
}
