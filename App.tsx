import { useState, useMemo } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StyleSheet, useColorScheme } from 'react-native'
import SetupScreen from './components/SetupScreen'
import GameScreen from './components/GameScreen'
import type { PlayerConfig } from './components/GameScreen'
import type { GameOptions } from './components/SetupScreen'
import { darkColors, lightColors } from './constants/design'
import { ThemeContext } from './constants/ThemeContext'

export type Theme = 'dark' | 'light' | 'auto'

type Screen = 'setup' | 'game'

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([])
  const [learningMode, setLearningMode] = useState(false)
  const [challengeMode, setChallengeMode] = useState(false)
  const [theme, setTheme] = useState<Theme>('auto')

  const osColorScheme = useColorScheme()

  const colors = useMemo(() => {
    const resolved = theme === 'auto' ? (osColorScheme ?? 'dark') : theme
    return resolved === 'light' ? lightColors : darkColors
  }, [theme, osColorScheme])

  const handleStart = (configs: PlayerConfig[], options: GameOptions) => {
    setPlayerConfigs(configs)
    setLearningMode(options.learningMode)
    setScreen('game')
  }

  const handleReturnToMenu = () => {
    setScreen('setup')
  }

  return (
    <ThemeContext.Provider value={colors}>
      <SafeAreaProvider>
        <StatusBar style={colors === lightColors ? 'dark' : 'light'} />
        <SafeAreaView style={[styles.root, { backgroundColor: colors.navy }]}>
          {screen === 'game' && playerConfigs.length > 0 ? (
            <GameScreen
              key={playerConfigs.map(p => p.name).join(',')}
              playerConfigs={playerConfigs}
              onReturnToMenu={handleReturnToMenu}
              learningMode={learningMode}
              challengeMode={challengeMode}
              onToggleChallengeMode={() => setChallengeMode(v => !v)}
              theme={theme}
              onSetTheme={setTheme}
            />
          ) : (
            <SetupScreen onStart={handleStart} />
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </ThemeContext.Provider>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
