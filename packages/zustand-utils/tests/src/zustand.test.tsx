import { act, render, renderHook } from '@testing-library/react'
import { enableMapSet } from 'immer'
import { useEffect } from 'react'
import type { WithRequiredChildren } from '@byondxr/react-utils'
import { useZustandMountCounters, useZustandCreate } from '../../src/use-zustand-create'

const storeKey = 'test'

describe('zustand hook', () => {
	beforeEach(() => {
		enableMapSet()
	})
	const useTestStore = () => {
		return useZustandCreate<{ a: number; b: string }>('test', (set, get) => {
			return {
				a: 1,
				b: '2',
			}
		})
	}

	it('store is working', () => {
		const { rerender, result } = renderHook(() => {
			const useZStore = useTestStore()
			const a = useZStore((s) => s.a)

			return { a, useZStore }
		})
		expect(result.current.a).toBe(1)
		act(() => {
			result.current.useZStore.setState({ a: 2 })
		})
		expect(result.current.a).toBe(2)
	})
	it('counts', () => {
		let ACount = 0
		let ACountUnmount = 0
		let aValueAfterIncrement = 0
		let aValueAfterReset = 0
		const ComponentC = () => {
			const useZStore = useTestStore()

			useEffect(() => {
				useZStore.setState({ a: 2 })
				aValueAfterIncrement = useZStore.getState().a
				return () => {
					ACountUnmount = useZustandMountCounters.getState().storesMap.get(storeKey)?.count || 0
					aValueAfterReset = useZStore.getState().a
				}
			}, [])

			return null
		}
		const ComponentB = ({ children }: WithRequiredChildren) => {
			const useZStore = useTestStore()
			return <div>{children}</div>
		}
		const ComponentA = () => {
			const useZStore = useTestStore()

			useEffect(() => {
				ACount = useZustandMountCounters.getState().storesMap.get(storeKey)?.count || 0
			}, [])

			return (
				<ComponentB>
					<ComponentC />
				</ComponentB>
			)
		}

		let rendered: any
		act(() => {
			rendered = render(<ComponentA />)
		})
		act(() => {
			rendered.unmount()
		})
		expect(aValueAfterIncrement).toBe(2)
		expect(aValueAfterReset).toBe(1)
		expect(ACount).toBe(3)
		expect(ACountUnmount).toBe(0)
	})
})
