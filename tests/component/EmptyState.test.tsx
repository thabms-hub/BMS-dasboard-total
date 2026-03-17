import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from '@/components/dashboard/EmptyState'

describe('EmptyState', () => {
  it('MUST render title', () => {
    render(<EmptyState title="No data found" />)
    expect(screen.getByText('No data found')).toBeInTheDocument()
  })

  it('MUST render description when provided', () => {
    render(
      <EmptyState
        title="No data"
        description="Try expanding the date range."
      />
    )
    expect(screen.getByText('Try expanding the date range.')).toBeInTheDocument()
  })

  it('MUST NOT render description when not provided', () => {
    const { container } = render(<EmptyState title="No data" />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs.length).toBe(0)
  })

  it('MUST render action button when provided', () => {
    render(
      <EmptyState
        title="Error"
        action={<button>Retry</button>}
      />
    )
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('MUST render custom icon when provided', () => {
    render(
      <EmptyState
        title="Empty"
        icon={<span data-testid="custom-icon">icon</span>}
      />
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('MUST apply custom className', () => {
    const { container } = render(
      <EmptyState title="Test" className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
