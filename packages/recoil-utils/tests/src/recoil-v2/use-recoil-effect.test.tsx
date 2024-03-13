import { act, renderHook } from '@testing-library/react'
import { useEffect } from 'react'
import { atom, useSetRecoilState } from 'recoil'
import { delay } from '@byondxr/utils'
import { useRecoilEffect } from '../../../src/recoil-v2'
import { Wrapper } from '../recoil-wrapper'

/**
 * test setting atom from effect
 */

describe('recoil v2 use-recoil-effect', () => {
	const testAtom1 = atom({
		key: 'testAtom1',
		default: 1,
	})
	const testAtom2 = atom({
		key: 'testAtom2',
		default: 10,
	})
	const effectFn = vi.fn((n: number) => {})
	const cleanFn = vi.fn((n1: number, n2: number) => {})
	beforeEach(() => {
		effectFn.mockClear()
		cleanFn.mockClear()
	})

	it('should be no extra renders because of effect atom dep change, but the effect should run', async () => {
		let nRenders = 0
		let selectorExecutions = 0

		/**
		 * it will first update the atom while getter with the selector is mounted, then unmount that component and mount another , where the atom is updated again
		 */

		let { unmount } = renderHook(
			() => {
				nRenders++

				useRecoilEffect(
					async ({ getAsync, getPrevAsync }) => {
						selectorExecutions++
						let v1c = await getAsync(testAtom1)
						let v2c = await getAsync(testAtom2)
						let v1 = await getPrevAsync(testAtom1)
						let v2 = await getPrevAsync(testAtom2)
						// console.log({ v1: v1, v2 }, { v1c: v1c, v2c })
						return () => {
							cleanFn(v1, v2)
						}
					},
					[],
					({ get }) => {
						let v1c = get(testAtom1)
						let v2c = get(testAtom2)
						let v1 = get(testAtom1)
						let v2 = get(testAtom2)
					},
					'use-recoil-effect.test::-'
				)

				let setAtom1 = useSetRecoilState(testAtom1)
				let setAtom2 = useSetRecoilState(testAtom2)
				useEffect(() => {
					setTimeout(() => {
						setAtom1(2)
						setAtom2(20)
						setTimeout(() => {
							// setAtom1(3)
							// setAtom2(30)
						}, 20)
					}, 20)
				}, [])
			},
			{ wrapper: Wrapper }
		)
		await act(async () => {
			await delay(100)
			unmount()
		})

		expect(nRenders).toBe(1)
		expect(selectorExecutions).toBe(3)
		expect(cleanFn).toHaveBeenLastCalledWith(2, 20)
	})
})
