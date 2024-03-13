/* eslint-disable @byondxr/automate/recoil-add-key */

import { act, renderHook, render } from '@testing-library/react'
import { useState, useEffect } from 'react'
import { atom, isRecoilValue, useSetRecoilState } from 'recoil'
import type { DependencyList } from 'react'
import type { RecoilValueReadOnly } from 'recoil'
import { useRecoilValue, useRecoilMemoSelector } from '../../../src'
import { Wrapper } from '../recoil-wrapper'

let _Wrapper = Wrapper<{ deps?: DependencyList }>

describe('recoil v2 useRecoilMemoSelector', () => {
	const testAtom = atom({
		key: 'testAtom',
		default: 1,
	})
	const selectorFn = vi.fn(({ get }) => {
		return get(testAtom) * 2
	})
	beforeEach(() => {
		selectorFn.mockClear()
	})
	vi.spyOn(console, 'warn')
	vi.mocked(console.warn).mockImplementation(() => {})

	/**
	 * useRecoilValue is a must in order to activate the selector
	 */

	it('should return the result of the selector function', () => {
		const { result } = renderHook(
			() => {
				let sel = useRecoilMemoSelector(selectorFn, [], 'use-recoil-memo-selector.spec::sel')
				return [sel, useRecoilValue(sel)]
			},
			{ wrapper: _Wrapper }
		)
		let [selector, selectorValue] = result.current
		expect(isRecoilValue(selector)).toBeTruthy()
		expect(selectorValue).toBe(2)
	})

	it('should call selector function if dependencies change', () => {
		const { rerender } = renderHook(
			({ deps }) => {
				return useRecoilValue(useRecoilMemoSelector(selectorFn, deps, 'use-recoil-memo-selector.spec::-'))
			},
			{
				initialProps: { deps: [1] },
				wrapper: _Wrapper,
			}
		)
		act(() => {
			rerender({ deps: [2] })
		})
		act(() => {
			rerender({ deps: [3] })
		})
		expect(selectorFn).toHaveBeenCalledTimes(3)
	})

	it('should call selector function if atom dep changes', async () => {
		const { result } = renderHook(
			({ deps }) => {
				let setAtom = useSetRecoilState(testAtom)
				useEffect(() => {
					setAtom(2)
				}, [])

				return useRecoilValue(useRecoilMemoSelector(selectorFn, deps, 'use-recoil-memo-selector.spec::-'))
			},
			{
				initialProps: { deps: [] },
				wrapper: _Wrapper,
			}
		)
		let selectorValue = result.current
		expect(selectorValue).toBe(4)
	})

	it('should not call selector function if dependencies are the same', () => {
		const { rerender } = renderHook(
			({ deps }) => {
				return useRecoilValue(useRecoilMemoSelector(selectorFn, deps, 'use-recoil-memo-selector.spec::-'))
			},
			{
				initialProps: { deps: [1] },
				wrapper: _Wrapper,
			}
		)
		act(() => {
			rerender({ deps: [1] })
		})
		expect(selectorFn).toHaveBeenCalledTimes(1)
	})

	it('upon selector deps change should not render the component with useRecoilMemoSelector if useRecoilValue not there, but in the child', () => {
		let nRenders = 0
		let Child = ({ sel }: { sel: RecoilValueReadOnly<number> }) => {
			useRecoilValue(sel)

			return null
		}
		let Component = () => {
			nRenders++
			let sel = useRecoilMemoSelector(selectorFn, [], 'use-recoil-memo-selector.test:Component:sel')
			let setAtom = useSetRecoilState(testAtom)
			useEffect(() => {
				setAtom(2)
			}, [])

			return <Child sel={sel} />
		}

		/**
		 * it will first update the atom while getter with the selector is mounted, then unmount that component and mount another , where the atom is updated again
		 */

		render(
			<_Wrapper deps={[]}>
				<Component />
			</_Wrapper>
		)
		expect(nRenders).toBe(1)
	})

	it('should not call selector function if atom dep changes after unmount', () => {
		let useGetterHook = () => {
			let setAtom = useSetRecoilState(testAtom)
			useEffect(() => {
				setAtom((a) => a + 2)
			}, [])

			return useRecoilValue(
				useRecoilMemoSelector(selectorFn, [], 'use-recoil-memo-selector.spec:useGetterHook:-')
			)
		}
		let useSetterHook = () => {
			let setAtom = useSetRecoilState(testAtom)
			useEffect(() => {
				setAtom((a) => a + 2)
			}, [])
		}
		let UseGetter = () => {
			useGetterHook()

			return null
		}
		let UseSetter = () => {
			useSetterHook()

			return null
		}
		let Component = () => {
			const [getterMounted, setGetterMounted] = useState(true)
			useEffect(() => {
				setGetterMounted(false)
			}, [])

			return <>{getterMounted ? <UseGetter /> : <UseSetter />}</>
		}

		/**
		 * it will first update the atom while getter with the selector is mounted, then unmount that component and mount another , where the atom is updated again
		 */

		render(
			<_Wrapper deps={[]}>
				<Component />
			</_Wrapper>
		)

		expect(selectorFn).toHaveBeenCalledTimes(2)
	})
})
