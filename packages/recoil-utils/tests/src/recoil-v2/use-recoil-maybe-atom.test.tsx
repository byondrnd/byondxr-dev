import { act, renderHook } from '@testing-library/react'
import { useEffect } from 'react'
import { atom, useSetRecoilState } from 'recoil'
import type { RecoilState } from 'recoil'
import { useMaybeAtom, useRecoilValue } from '../../../src'
import { Wrapper } from '../recoil-wrapper'

let _Wrapper = Wrapper<{ _atom?: RecoilState<number> }>

describe('recoil v2 use-recoil-maybe-atom', () => {
	const testAtom = atom({
		key: 'testAtom',
		default: 1,
	})

	it('should return undefined and then the atom value and again undefined', () => {
		let { result, rerender } = renderHook(
			({ _atom }) => {
				let setAtom = useSetRecoilState(testAtom)
				useEffect(() => {
					setAtom(2)
				}, [])

				// eslint-disable-next-line @byondxr/automate/recoil-add-key
				const matom = useMaybeAtom(_atom, 'use-recoil-maybe-atom.spec::-')
				return useRecoilValue(matom)
			},
			{
				initialProps: { _atom: undefined as undefined | RecoilState<number> },
				wrapper: _Wrapper,
			}
		)

		expect(result.current).toBeUndefined()

		act(() => {
			rerender({ _atom: testAtom })
		})
		expect(result.current).toBe(2)

		act(() => {
			rerender({ _atom: undefined })
		})
		expect(result.current).toBeUndefined()
	})
})
