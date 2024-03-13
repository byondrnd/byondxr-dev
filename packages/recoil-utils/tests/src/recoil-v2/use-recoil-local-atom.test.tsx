import { renderHook } from '@testing-library/react'
import { useEffect } from 'react'
import { isRecoilValue } from 'recoil'
import { useRecoilLocalAtom, useRecoilLocalAtom__, useRecoilValue } from '../../../src'
import { Wrapper } from '../recoil-wrapper'

describe('recoil v2 useRecoilLocalAtom', () => {
	it('core', () => {
		const defaultValue = 42

		const { result } = renderHook(
			() => {
				return [
					useRecoilLocalAtom__(defaultValue, 'use-recoil-local-atom.test::-:14'),
					useRecoilLocalAtom__(defaultValue, 'use-recoil-local-atom.test::-:15'),
				]
			},
			{
				wrapper: Wrapper,
			}
		)

		expect(isRecoilValue(result.current[0])).toBeTruthy()
		expect(result.current[0]?.key).not.toEqual(result.current[1]?.key)
	})

	it('the actual exported util - more utils in one', () => {
		const defaultValue = 1

		const { result } = renderHook(
			() => {
				let [_atom, _setAtom] = useRecoilLocalAtom(defaultValue, 'use-recoil-local-atom.test::-')
				useEffect(() => {
					_setAtom(2)
				}, [])
				return [useRecoilValue(_atom)] as const
			},
			{
				wrapper: Wrapper,
			}
		)
		let [atomValue] = result.current

		expect(atomValue).toBe(2)
	})
})
