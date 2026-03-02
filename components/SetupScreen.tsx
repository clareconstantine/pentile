import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { PlayerConfig } from './GameScreen'
import type { AIDifficulty } from '@engine/ai'
import { colors } from '../constants/design'

interface SetupScreenProps {
  onStart: (players: PlayerConfig[]) => void
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

  const activePlayers = slots.filter(s => s.active)

  const updateSlot = (index: number, update: Partial<PlayerSlot>) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, ...update } : s))
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
    onStart(players)
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>PENTILE</Text>
        <Text style={styles.subtitle}>A game of fives</Text>

        <View style={styles.players}>
          {slots.map((slot, i) => (
            <View key={i} style={[styles.slot, !slot.active && styles.slotInactive]}>
              <View style={styles.slotHeader}>
                <Text style={styles.slotNumber}>P{i + 1}</Text>
                {i >= 2 && (
                  <Pressable onPress={() => toggleSlot(i)} style={styles.slotToggle}>
                    <Text style={styles.slotToggleText}>{slot.active ? '−' : '+'}</Text>
                  </Pressable>
                )}
              </View>

              {slot.active && (
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
                        onPress={() => updateSlot(i, { type })}
                        style={[styles.typeBtn, slot.type === type && styles.typeBtnSelected]}
                      >
                        <Text style={[styles.typeBtnText, slot.type === type && styles.typeBtnTextSelected]}>
                          {type === 'human' ? 'Human' : type === 'easy' ? 'CPU Easy' : 'CPU Med'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {!slot.active && (
                <Pressable onPress={() => toggleSlot(i)} style={styles.addPlayer}>
                  <Text style={styles.addPlayerText}>+ Add Player</Text>
                </Pressable>
              )}
            </View>
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
  slotInactive: {
    opacity: 0.5,
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
  addPlayer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  addPlayerText: {
    color: colors.teal,
    fontSize: 14,
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
})
