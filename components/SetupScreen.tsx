import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
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

type PlayerType = 'human' | 'easy' | 'medium'

interface PlayerSlot {
  name: string
  type: PlayerType
  active: boolean
}

const DEFAULTS: PlayerSlot[] = [
  { name: 'Player 1', type: 'human',  active: true  },
  { name: 'CPU',      type: 'medium', active: true  },
  { name: 'Player 3', type: 'human',  active: false },
  { name: 'Player 4', type: 'human',  active: false },
]


export default function SetupScreen({ onStart }: SetupScreenProps) {
  const [slots, setSlots] = useState<PlayerSlot[]>(DEFAULTS)
  const [showDirections, setShowDirections] = useState(false)
  const [learningMode, setLearningMode] = useState(false)

  const activePlayers = slots.filter(s => s.active)

  const updateSlot = (index: number, update: Partial<PlayerSlot>) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, ...update } : s))
  }

  const handleTypeChange = (index: number, type: PlayerType) => {
    const slot = slots[index]
    const updates: Partial<PlayerSlot> = { type }
    if (type === 'human' && slot.type !== 'human' && slot.name === 'CPU') {
      updates.name = `Player ${index + 1}`
    }
    if (type !== 'human' && slot.type === 'human' && slot.name === `Player ${index + 1}`) {
      updates.name = 'CPU'
    }
    updateSlot(index, updates)
  }

  const toggleSlot = (index: number) => {
    const active = slots.filter(s => s.active)
    if (slots[index].active && active.length <= 2) return
    updateSlot(index, { active: !slots[index].active })
  }

  const handleStart = () => {
    const players: PlayerConfig[] = slots
      .filter(s => s.active)
      .map(s => ({
        name: s.name,
        isAI: s.type !== 'human',
        difficulty: s.type === 'human' ? undefined : s.type as AIDifficulty,
      }))
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

        <View style={styles.players}>
          {slots.map((slot, i) => (
            i >= 2 && !slot.active ? (
              <Pressable key={i} onPress={() => toggleSlot(i)} style={styles.addPlayerBtn}>
                <Text style={styles.addPlayerBtnText}>+ Add Player {i + 1}</Text>
              </Pressable>
            ) : (
              <View key={i} style={styles.slot}>
                <View style={styles.slotHeader}>
                  <Text style={styles.slotNumber}>P{i + 1}</Text>
                  {i >= 2 && (
                    <Pressable onPress={() => toggleSlot(i)} style={styles.slotToggle}>
                      <Text style={styles.slotToggleText}>−</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.slotBody}>
                  <TextInput
                    style={styles.nameInput}
                    value={slot.name}
                    onChangeText={text => updateSlot(i, { name: text })}
                    maxLength={16}
                    placeholderTextColor={colors.creamDark}
                  />
                  <View style={styles.typePicker}>
                    {(['human', 'easy', 'medium'] as PlayerType[]).map(type => (
                      <Pressable
                        key={type}
                        onPress={() => handleTypeChange(i, type)}
                        style={[styles.typeBtn, slot.type === type && styles.typeBtnSelected]}
                      >
                        <Text style={[styles.typeBtnText, slot.type === type && styles.typeBtnTextSelected]}>
                          {type === 'human' ? 'Human' : type === 'easy' ? 'CPU Easy' : 'CPU Med'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            )
          ))}
        </View>

        <Pressable
          onPress={handleStart}
          disabled={activePlayers.length < 1}
          style={({ pressed }) => [
            styles.startBtn,
            activePlayers.length < 1 && styles.startBtnDisabled,
            pressed && styles.startBtnPressed,
          ]}
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
  players: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  slot: {
    flex: 1,
    minWidth: 160,
    backgroundColor: colors.navyLight,
    borderRadius: 8,
    padding: 12,
  },
  addPlayerBtn: {
    borderWidth: 1,
    borderColor: colors.navyLight,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  addPlayerBtnText: {
    color: colors.creamDark,
    fontSize: 12,
    letterSpacing: 1,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotNumber: {
    color: colors.gold,
    fontWeight: 'bold',
    fontSize: 14,
  },
  slotToggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotToggleText: {
    color: colors.cream,
    fontSize: 16,
    lineHeight: 20,
  },
  slotBody: {
    gap: 8,
  },
  nameInput: {
    backgroundColor: colors.navyMid,
    color: colors.cream,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
  },
  typePicker: {
    flexDirection: 'row',
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.navyMid,
    alignItems: 'center',
  },
  typeBtnSelected: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  typeBtnText: {
    color: colors.creamDark,
    fontSize: 11,
  },
  typeBtnTextSelected: {
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
    borderColor: colors.navyLight,
  },
  learningToggleActive: {
    borderColor: colors.teal,
    backgroundColor: 'rgba(44,180,180,0.15)',
  },
  learningToggleText: {
    color: colors.creamDark,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  learningToggleTextActive: {
    color: colors.tealLight,
    fontWeight: '600',
  },
  howToPlayBtn: {
    marginTop: 8,
    padding: 4,
  },
  howToPlayText: {
    color: colors.creamDark,
    fontSize: 12,
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
