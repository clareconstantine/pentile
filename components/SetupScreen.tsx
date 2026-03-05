import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { PlayerConfig } from './GameScreen'
import type { AIDifficulty } from '@engine/ai'
import { colors } from '../constants/design'
import { DIRECTIONS } from '@constants/directions'

export interface GameOptions {
  learningMode: boolean
}

interface SetupScreenProps {
  onStart: (players: PlayerConfig[], options: GameOptions) => void
}

const DIFFICULTIES: { value: AIDifficulty; label: string }[] = [
  { value: 'easy',   label: 'Chill'     },
  { value: 'medium', label: 'Challenge' },
  { value: 'hard',   label: 'Expert'    },
]

export default function SetupScreen({ onStart }: SetupScreenProps) {
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium')
  const [showDirections, setShowDirections] = useState(false)
  const [learningMode, setLearningMode] = useState(false)

  const handleStart = () => {
    const players: PlayerConfig[] = [
      { name: 'You', isAI: false },
      { name: 'CPU', isAI: true, difficulty },
    ]
    onStart(players, { learningMode })
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Modal visible={showDirections} transparent animationType="fade" onRequestClose={() => setShowDirections(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowDirections(false)}>
          <Pressable style={styles.directionsModal} onPress={() => {}}>
            <Pressable style={styles.closeBtn} onPress={() => setShowDirections(false)}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
            <Text style={styles.directionsTitle}>How to Play</Text>
            <ScrollView>
              {DIRECTIONS.map(({ heading, body }) => (
                <View key={heading} style={styles.directionsSection}>
                  <Text style={styles.directionsSectionHeading}>{heading}</Text>
                  <Text style={styles.directionsSectionBody}>{body}</Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <View style={styles.card}>
        <Text style={styles.title}>PENTILE</Text>
        <Text style={styles.subtitle}>A game of fives</Text>

        <View style={styles.form}>
          <Text style={styles.label}>CPU difficulty</Text>
          <View style={styles.difficultyPicker}>
            {DIFFICULTIES.map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => setDifficulty(value)}
                style={[styles.diffBtn, difficulty === value && styles.diffBtnSelected]}
              >
                <Text style={[styles.diffBtnText, difficulty === value && styles.diffBtnTextSelected]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleStart}
          style={({ pressed }) => [styles.startBtn, pressed && styles.startBtnPressed]}
        >
          <Text style={styles.startBtnText}>Start Game</Text>
        </Pressable>
        <Pressable
          onPress={() => setLearningMode(v => !v)}
          style={[styles.learningToggle, learningMode && styles.learningToggleActive]}
        >
          <Text style={[styles.learningToggleText, learningMode && styles.learningToggleTextActive]}>
            Learning mode
          </Text>
        </Pressable>
        <Pressable onPress={() => setShowDirections(true)} style={styles.howToPlayBtn}>
          <Text style={styles.howToPlayText}>How to play?</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.navyMid,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.gold,
    letterSpacing: 4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.creamDark,
    marginBottom: 24,
    letterSpacing: 1,
  },
  form: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    color: colors.creamDark,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  difficultyPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.navyLight,
    alignItems: 'center',
  },
  diffBtnSelected: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  diffBtnText: {
    color: colors.creamDark,
    fontSize: 13,
  },
  diffBtnTextSelected: {
    color: colors.cream,
    fontWeight: 'bold',
  },
  startBtn: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  startBtnDisabled: {
    opacity: 0.4,
  },
  startBtnPressed: {
    opacity: 0.8,
  },
  startBtnText: {
    color: colors.navy,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  learningToggle: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.teal,
  },
  learningToggleActive: {
    backgroundColor: 'rgba(44,180,180,0.15)',
  },
  learningToggleText: {
    color: colors.tealLight,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  learningToggleTextActive: {
    fontWeight: '600',
  },
  howToPlayBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.navyLight,
  },
  howToPlayText: {
    color: colors.creamDark,
    fontSize: 13,
    letterSpacing: 1,
  },
  // Directions modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13,27,42,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  directionsModal: {
    backgroundColor: colors.navyMid,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.navyLight,
    padding: 28,
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 14,
    padding: 6,
    zIndex: 1,
  },
  closeBtnText: {
    color: colors.creamDark,
    fontSize: 14,
  },
  directionsTitle: {
    color: colors.gold,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginBottom: 20,
  },
  directionsSection: {
    marginBottom: 18,
  },
  directionsSectionHeading: {
    color: colors.tealLight,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  directionsSectionBody: {
    color: colors.cream,
    fontSize: 14,
    lineHeight: 21,
  },
})
