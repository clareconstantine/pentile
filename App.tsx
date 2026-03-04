import { useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native'
import SetupScreen from './components/SetupScreen'
import GameScreen from './components/GameScreen'
import type { PlayerConfig } from './components/GameScreen'
import type { GameOptions } from './components/SetupScreen'
import { colors } from './constants/design'

type Screen = 'setup' | 'game'

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([])
  const [learningMode, setLearningMode] = useState(false)
  const [challengeMode, setChallengeMode] = useState(false)

  const handleStart = (configs: PlayerConfig[], options: GameOptions) => {
    setPlayerConfigs(configs)
    setLearningMode(options.learningMode)
    setScreen('game')
  }

  const handleReturnToMenu = () => {
    setScreen('setup')
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.root}>
        {screen === 'game' && playerConfigs.length > 0 ? (
          <GameScreen
            key={playerConfigs.map(p => p.name).join(',')}
            playerConfigs={playerConfigs}
            onReturnToMenu={handleReturnToMenu}
            learningMode={learningMode}
            challengeMode={challengeMode}
            onToggleChallengeMode={() => setChallengeMode(v => !v)}
          />
        ) : (
          <SetupScreen onStart={handleStart} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.navy,
  },
})
