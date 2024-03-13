/* eslint-disable prefer-arrow-functions/prefer-arrow-functions */

import { produce } from 'immer'
import { useEffect, useState } from 'react'
import { atom, useGetRecoilValueInfo_UNSTABLE, useRecoilCallback, useResetRecoilState, useSetRecoilState } from 'recoil'
import { v4 } from 'uuid'
import { create } from 'zustand'
import { useHandler } from '@byondxr/react-utils'
import type {
	AtomEffect,
	DefaultValue,
	Loadable,
	RecoilState,
	RecoilValue,
	RecoilValueReadOnly,
	WrappedValue,
} from 'recoil'
import { useRecoilMemoSelector } from './recoil-v2'

export const useRecoilNodes = () => {
	return {
		getRecoilNodes: useRecoilCallback(
			({ snapshot }) =>
				() => {
					return snapshot.getNodes_UNSTABLE()
				},
			[]
		),
	}
}

export type State = Record<string | number | symbol, unknown> | undefined
export type StateSelector<T, U> = (state: T) => U

export type ObservableData<T> = {
	newValue: T
	oldValue: T | DefaultValue
	isReset: boolean
}

const dummyResetAtom = atom({
	key: `${v4()}`,
	default: {},
})
const useMountCounters = create<{ [key: string]: number }>((set, get) => {
	return {}
})

export const useRecoilAtom = <T,>(
	key: string,
	_default: RecoilValue<T> | Promise<T> | Loadable<T> | WrappedValue<T> | T,
	_effects?: [(p: ObservableData<T>) => void],
	noReset = false
): RecoilState<T> => {
	let { getRecoilNodes } = useRecoilNodes()

	const _atom = useState(() => {
		const existingAtom = Array.from(getRecoilNodes()).find((n) => n.key === key) as unknown as
			| RecoilState<T>
			| undefined

		if (existingAtom) {
			return existingAtom
		} else {
			const effects = [
				(({ onSet }) => {
					onSet((newValue, oldValue, isReset) => {
						_effects?.forEach((_effect) => {
							_effect({ newValue, oldValue, isReset })
						})
					})
				}) as AtomEffect<T>,
			]

			return atom<T>({
				key,
				default: _default,
				effects,
			})
		}
	})[0]

	// *******  count usage of atom and reset it, when count reaches 0, upon all of it's components unmount

	const getRecoilValueInfo = useGetRecoilValueInfo_UNSTABLE()
	const needReset = !noReset && typeof _atom === 'object' && getRecoilValueInfo(_atom as any).type === 'atom'
	const resetAtom = useResetRecoilState((needReset ? _atom : dummyResetAtom) as any)

	useEffect(() => {
		if (needReset) {
			useMountCounters.setState((s) => {
				return { ...s, [key]: (s[key] ?? 0) + 1 }
			})

			return () => {
				useMountCounters.setState((s) => {
					const count = s[key]
					if (!count) {
						console.warn('trying to decrease atoms counter bellow 0')
						return s
					} else {
						const newCount = count - 1
						if (newCount === 0) {
							/**
							 * timeout is in order to put execute reset after all the unmounts and so all selectors unsubscribed and so useRecoilEffect won't be extra executed as well
							 * eventually using sraight atom becasue of this
							 */
							// setTimeout(() => {
							resetAtom()
							// }, 5)
						}
						return { ...s, [key]: newCount }
					}
				})
			}
		}
		return undefined
	}, [key, needReset])

	return _atom
}

export const useRecoilCustomSelector = <A,>(key: string, fn: (key: string) => A): A => {
	let { getRecoilNodes } = useRecoilNodes()

	return useState(() => {
		return (Array.from(getRecoilNodes()).find((n) => n.key === key) as unknown as A | undefined) ?? fn(key)
	})[0]
}

export type FnReturn<U> = Promise<U> | RecoilValue<U> | Loadable<U> | WrappedValue<U> | U
export const useRecoilSelector = <T, U>(
	_atom: RecoilValue<T>,
	fn: (state: T) => FnReturn<U>
): RecoilValueReadOnly<U> => {
	return useRecoilMemoSelector(
		({ get }) => fn(get(_atom)),
		[_atom],
		`atom:${_atom.key} ${fn.toString()} (useRecoilSelector)`
	)
}

export type RecoilImmerSetParam<T> = T | ((s: T) => void)

type UseSetImmerRecoilState = <T>(atom: RecoilState<T>) => (fn: RecoilImmerSetParam<T>) => void
export const useSetImmerRecoilState: UseSetImmerRecoilState = <T,>(atom: RecoilState<T>) => {
	const setAtom = useSetRecoilState(atom)
	return (fn: RecoilImmerSetParam<T>) => {
		setAtom(
			typeof fn !== 'function'
				? fn
				: (state) => {
						return produce(state, fn as (s: T) => void)
				  }
		)
	}
}

type UseRecoilAsyncGet = () => {
	asyncGet: <T>(recoilValue: RecoilValue<T>) => Promise<T>
	asyncParamGet: <P, R>(s: RecoilValueReadOnly<(p: P) => RecoilValueReadOnly<R>>) => (p: P) => Promise<R>
}
export const useRecoilAsyncGet = () => {
	const asyncGet = useRecoilCallback(({ snapshot }) => snapshot.getPromise, [])
	const set = useRecoilCallback(({ set }) => set, [])
	const asyncParamGet = useHandler(<P, R>(s: RecoilValueReadOnly<(p: P) => RecoilValueReadOnly<R>>) => {
		return async (p: P): Promise<R> => {
			const getter = await asyncGet(s)
			return asyncGet(getter(p))
		}
	})
	return { asyncGet, asyncParamGet, set }
}

export function useRecoilAsyncCallback<Args extends ReadonlyArray<unknown>, Ret>(
	fn: (p1: {
		asyncGet: <T>(recoilValue: RecoilValue<T>) => Promise<T>
		asyncParamGet: <P, R>(s: RecoilValueReadOnly<(p: P) => RecoilValueReadOnly<R>>) => (p: P) => Promise<R>
		set: <T>(recoilVal: RecoilState<T>, valOrUpdater: T | ((currVal: T) => T)) => void
	}) => (...args: Args) => Ret
): (...args: Args) => Ret
export function useRecoilAsyncCallback(fn: any) {
	const { asyncGet, asyncParamGet, set } = useRecoilAsyncGet()

	return useHandler((...p: any[]) => {
		return fn({ asyncGet, asyncParamGet, set })(...p)
	})
}
