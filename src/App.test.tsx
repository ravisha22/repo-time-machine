// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(
      path.resolve(process.cwd(), 'public', 'data', name),
      'utf8',
    ),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Repo Time Machine application', () => {
  it('loads a real public dataset and navigates the analysis surfaces', async () => {
    const index = fixture('index.json')
    const react = fixture('react.json')
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        const payload = url.endsWith('/data/index.json') ? index : react
        return {
          ok: true,
          status: 200,
          json: async () => payload,
        } as Response
      })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    // Diagnostic assertion keeps loading failures readable in CI.
    expect(document.querySelector('.fatal-error')?.textContent ?? '').toBe('')
    await waitFor(() =>
      expect(document.querySelector('.evolution-hero')?.textContent).toContain(
        'Watch',
      ),
    )
    await waitFor(() =>
      expect(
        screen.getByRole('heading', {
          name: /Watch.*React.*become itself/i,
        }),
      ).toBeTruthy(),
    )

    const navigation = within(
      screen.getByRole('navigation', { name: /Primary navigation/i }),
    )
    fireEvent.click(
      navigation.getByRole('button', { name: /^Attention map/i }),
    )
    expect(
      screen.getByRole('heading', { name: /Where change keeps returning/i }),
    ).toBeTruthy()

    fireEvent.click(
      navigation.getByRole('button', { name: /^Temporal coupling/i }),
    )
    expect(
      screen.getByRole('heading', { name: /Files that travel together/i }),
    ).toBeTruthy()

    fireEvent.click(
      navigation.getByRole('button', { name: /^Repository lab/i }),
    )
    expect(
      screen.getByRole('heading', {
        name: /Choose a product or open local history/i,
      }),
    ).toBeTruthy()
  })
})
