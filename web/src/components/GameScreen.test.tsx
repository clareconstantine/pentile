import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import GameScreen from './GameScreen'

// 90 tiles total, 5 drawn per player hand × 2 players
const INITIAL_BAG_SIZE = 80

const solo = [{ name: 'Alice', isAI: false }]
const twoHumans = [
  { name: 'Alice', isAI: false },
  { name: 'Bob', isAI: false },
]

describe('GameScreen', () => {
  describe('initial render', () => {
    it('shows all player names', () => {
      render(<GameScreen playerConfigs={twoHumans} onReturnToMenu={vi.fn()} />)
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })

    it('shows tiles remaining in bag', () => {
      render(<GameScreen playerConfigs={twoHumans} onReturnToMenu={vi.fn()} />)
      expect(screen.getByText(`${INITIAL_BAG_SIZE} tiles in bag`)).toBeInTheDocument()
    })

    it('shows whose turn it is', () => {
      render(<GameScreen playerConfigs={twoHumans} onReturnToMenu={vi.fn()} />)
      expect(screen.getByText("Alice's turn")).toBeInTheDocument()
    })
  })

  describe('quit confirmation', () => {
    it('shows confirm UI when Quit is clicked in menu', async () => {
      const user = userEvent.setup()
      render(<GameScreen playerConfigs={solo} onReturnToMenu={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: 'Menu' }))
      await user.click(screen.getByRole('button', { name: 'Quit' }))

      expect(screen.getByText('Quit game?')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Quit' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('dismisses confirm UI on Cancel', async () => {
      const user = userEvent.setup()
      render(<GameScreen playerConfigs={solo} onReturnToMenu={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: 'Menu' }))
      await user.click(screen.getByRole('button', { name: 'Quit' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByText('Quit game?')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
    })

    it('calls onReturnToMenu when Quit is confirmed', async () => {
      const user = userEvent.setup()
      const onReturnToMenu = vi.fn()
      render(<GameScreen playerConfigs={solo} onReturnToMenu={onReturnToMenu} />)

      await user.click(screen.getByRole('button', { name: 'Menu' }))
      await user.click(screen.getByRole('button', { name: 'Quit' }))
      await user.click(screen.getByRole('button', { name: 'Quit' }))

      expect(onReturnToMenu).toHaveBeenCalledOnce()
    })
  })

  describe('action buttons', () => {
    it('Confirm is disabled when no tiles are staged', () => {
      render(<GameScreen playerConfigs={solo} onReturnToMenu={vi.fn()} />)
      expect(screen.getByRole('button', { name: /Confirm/ })).toBeDisabled()
    })

    it('Skip Turn is enabled when no tiles are staged', () => {
      render(<GameScreen playerConfigs={solo} onReturnToMenu={vi.fn()} />)
      expect(screen.getByRole('button', { name: 'Skip Turn' })).toBeEnabled()
    })

    it('Skip Turn advances to the next player', async () => {
      const user = userEvent.setup()
      render(<GameScreen playerConfigs={twoHumans} onReturnToMenu={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: 'Skip Turn' }))

      expect(screen.getByText("Bob's turn")).toBeInTheDocument()
    })
  })
})
