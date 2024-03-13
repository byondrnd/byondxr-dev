import { useEffect, useRef } from 'react'
import { useSetRecoilState } from 'recoil'
import { useRecoilAtom } from '@byondxr/recoil-utils'

/**
 * @description This hook is used to ensure that only one instance of a hook is used at a time.
 */
export const singleton = <F extends (...args: any) => any>(__hook: F) => {
	// @ts-ignore
	const useSingleton: F = (...args) => {
		const hook = useRef(__hook)

		const isCalledAtom = useRecoilAtom('useSinglton', new Map<string, number>())
		const setCalled = useSetRecoilState(isCalledAtom)

		useEffect(() => {
			const hookKey = hook.current.toString()
			setCalled((current) => {
				if ((current.get(hookKey) ?? 0) > 0) {
					console.warn(`${hookKey} can be used only once`)
				} else {
					current.set(hookKey, 1)
				}
				return new Map<string, number>(current)
			})
			return () => {
				setCalled((current) => {
					let count = current.get(hookKey) ?? 0
					if (count > 0) {
						current.set(hookKey, count - 1)
					} else {
						console.warn(`${hookKey} trying to unmount singleton hook that was not mounted`)
					}
					return new Map<string, number>(current)
				})
			}
		}, [])

		return hook.current(...args)
	}

	return useSingleton
}
