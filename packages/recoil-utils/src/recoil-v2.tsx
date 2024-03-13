/* eslint-disable prefer-arrow-functions/prefer-arrow-functions */
import { useState, useRef, useMemo, useEffect } from 'react'
import { useLatest } from 'react-use'
import { selectorFamily, useSetRecoilState, selector, useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil'
import { useHandler } from '@byondxr/react-utils'
import { assertIsDefined } from '@byondxr/utils'
import type { FnReturn } from './recoil'
import type { DependencyList, MutableRefObject } from 'react'
import type {
	GetRecoilValue,
	RecoilValueReadOnly,
	RecoilValue,
	Loadable,
	WrappedValue,
	RecoilState,
	SetterOrUpdater,
} from 'recoil'
import { useRecoilAsyncGet, useRecoilAtom } from './recoil'

const keysMap = new Map<string, number>()
const getNextKey = (key: string) => {
	let current = keysMap.get(key) ?? 0
	keysMap.set(key, current + 1)
	return `${current} ${key}`
}
;(window as any).keysMap = keysMap

/**
 * similar to the useRecoilAtom but the key is auto generated on each mount
 * @param _default
 * @param _effects
 * @returns atom
 */
export const useRecoilLocalAtom__ = <T,>(
	_default: RecoilValue<T> | Promise<T> | Loadable<T> | WrappedValue<T> | T,
	key: string
) => {
	return useRecoilAtom(useState(() => getNextKey(`${key} (localAtom)`))[0], _default)
}

/**
 * internal - comparison same as react useMemo
 */
export const areDepsEqual = (a: DependencyList, b: DependencyList) => {
	if (a.length !== b.length) {
		console.warn('useRecoilMemoSelector deps length changed between renders')
		return false
	}
	for (let i = 0; i < a.length; i++) {
		if (!Object.is(a[i], b[i])) {
			return false
		}
	}
	return true
}

const useRefreshAtom = (key: string, isLocal = true) => {
	const _key = `${key} (refresh atom)`
	const refreshAtom = useRecoilAtom(useState(() => (isLocal ? getNextKey(_key) : _key))[0], 1, undefined, true)
	return { refreshAtom }
}

const selectorDepsCacheMap = new Map<string, DependencyList[]>()
const selectorSelectorsCacheMap = new Map<string, RecoilValueReadOnly<any>[]>()
const selectorParamSelectorsCacheMap = new Map<string, ((param: any) => RecoilValueReadOnly<any>)[]>()

const isSelectorKeyLocal = (key: string) => key.endsWith('(local)')
const cacheMapAccess = <T,>(key: string, cacheMap: Map<string, T[]>, cacheRef: MutableRefObject<T[]>) => {
	let theKeyUniqueDefined = /^.+:.+:[^-].*$/.test(key)
	if (
		!isSelectorKeyLocal(key) &&
		(theKeyUniqueDefined || (key.startsWith('atom:') && key.endsWith('(useRecoilSelector)')))
	) {
		return {
			get: () => cacheMap.get(key) ?? [],
			push: (v: T) => {
				let _a = cacheMap.get(key) ?? []
				_a.push(v)
				cacheMap.set(key, _a)
			},
		}
	} else {
		if (!isSelectorKeyLocal(key)) {
			console.error('file recoil-v2 - cacheMapAccess - should not get here!!', { key })
		}
		return {
			get: () => cacheRef.current,
			push: (v: T) => {
				cacheRef.current.push(v)
			},
		}
	}
}

type SelectorFn<U> = (opts: {
	get: <T>(recoilVal: RecoilValue<T>) => T
	getParam: <P, R>(s: RecoilValueReadOnly<(p: P) => RecoilValueReadOnly<R>>) => (p: P) => R
	prev: unknown | undefined
	debounce: () => boolean
	getAsync: <T>(recoilValue: RecoilValue<T>) => Promise<T>
	getParamAsync: <P, R>(s: RecoilValueReadOnly<(p: P) => RecoilValueReadOnly<R>>) => (p: P) => Promise<R>
}) => FnReturn<U>

/**
 * similar to useMemo but also reactive to atoms/selectors
 * @param fn use get to subscribe to atoms/selectors, if you don't want to subscribe - use value from useRecoilLatest
 * @param isEffect internal use only
 * @param isParamSelector internal use only
 * @returns selector
 */
export function useRecoilMemoSelector<U>(
	fn: SelectorFn<U>,
	deps: DependencyList,
	key: string,
	isParamSelector?: boolean
): RecoilValueReadOnly<U>
export function useRecoilMemoSelector(
	fn: any,
	deps: DependencyList,
	key: string,
	isParamSelector: boolean | undefined = false
) {
	let selectorCache = useRef<RecoilValueReadOnly<any>[]>([])
	let paramSelectorCache = useRef<((param: any) => RecoilValueReadOnly<any>)[]>([])

	const cachedDeps = useRef<DependencyList[]>([])

	let depsCache = useMemo(() => {
		return cacheMapAccess(key, selectorDepsCacheMap, cachedDeps)
	}, [key])
	let selectorsCache = useMemo(() => {
		return cacheMapAccess(key, selectorSelectorsCacheMap, selectorCache)
	}, [key])
	let paramSelectorsCache = useMemo(() => {
		return cacheMapAccess(key, selectorParamSelectorsCacheMap, paramSelectorCache)
	}, [key])

	let cachedDepsLastIndex = depsCache.get().findIndex((cdeps) => areDepsEqual(cdeps, deps))

	const { refreshAtom } = useRefreshAtom(
		`${key} (${isParamSelector ? 'recoilMemoParamSelector' : 'recoilMemoSelector'})`,
		isSelectorKeyLocal(key)
	)
	const { asyncGet, asyncParamGet } = useRecoilAsyncGet()

	const refresh = useSetRecoilState(refreshAtom)

	const latestCachedDepsIndex = useRef(-1)

	/**
	 * reason for not using ONE selector by wraping fn with useHandler - useHandler is in ref - it is local to component and we want global cache
	 * reason for not wrapping global selector with a local one is that this local selector will get into deps and global cache will not happen
	 */

	/* istanbul ignore else */
	if (cachedDepsLastIndex === -1) {
		depsCache.push(deps)
		cachedDepsLastIndex = depsCache.get().length - 1

		// let returnObject = undefined
		// let shallowObjectEqual = (newValue: object | any[]) => {
		// 	for (let key of newValue) {
		// 		if (!Object.is(a[key], b[key])) {
		// 			return false
		// 		}
		// 	}
		// 	return true
		// }
		if (isParamSelector) {
			let retMap = new Map<string, any>()
			let debounceMap = new Map<string, boolean>()
			paramSelectorsCache.push(
				selectorFamily({
					key: getNextKey(`${key} (recoilMemoParamSelector)`),
					get:
						(p: any) =>
						({ get }) => {
							get(refreshAtom)
							const stringifiedP = JSON.stringify(p)
							let ret = fn(p)({
								get,
								getParam: <P, R>(s: RecoilValueReadOnly<(p: P) => RecoilValueReadOnly<R>>) => {
									return (p: P): R => get(get(s)(p))
								},
								prev: retMap.get(stringifiedP),
								debounce: () => {
									if (!debounceMap.get(stringifiedP)) {
										debounceMap.set(stringifiedP, true)
										setTimeout(
											() => {
												debounceMap.set(stringifiedP, false)
											},
											Math.round(1500 + Math.random() * 1000)
										)
										return false
									}
									return true
								},
								getAsync: asyncGet,
								getParamAsync: asyncParamGet,
							})
							retMap.set(stringifiedP, ret)
							return ret
						},
				})
			)
		}

		let newCachedSelector = selector({
			key: isParamSelector
				? getNextKey(`${key} (recoilMemoParamSelector item)`)
				: getNextKey(`${key} (recoilMemoSelector)`),
			get: ({ get }) => {
				if (isParamSelector) {
					return paramSelectorsCache.get()[cachedDepsLastIndex]
				} else {
					get(refreshAtom)
					return fn({
						get,
						getAsync: asyncGet,
						getParamAsync: asyncParamGet,
						getParam: <P, R>(s: RecoilValueReadOnly<(p: P) => RecoilValueReadOnly<R>>) => {
							return (p: P): R => get(get(s)(p))
						},
					})
				}
			},
		})
		selectorsCache.push(newCachedSelector)
	} else {
		if (cachedDepsLastIndex !== latestCachedDepsIndex.current) {
			if (latestCachedDepsIndex.current !== -1) {
				setTimeout(() => {
					refresh((v) => v + 1)
				}, 5)
			}
		}
	}
	latestCachedDepsIndex.current = cachedDepsLastIndex

	return selectorsCache.get()[cachedDepsLastIndex]
}

export function useRecoilMemoValue<U>(fn: SelectorFn<U>, deps: DependencyList, key: string): U
export function useRecoilMemoValue(fn: any, deps: DependencyList, key: string) {
	return useRecoilValue(useRecoilMemoSelector(fn, deps, key, false))
}

/**
 * returns a paramSelector wrapped in selector while using deps like useRecoilMemoSelector
 * @param fn wrap with fn with parameter and use get to subscribe to atoms/selectors, if you don't want to subscribe - use value from useRecoilLatest
 * @param deps same as react deps - reruns selector if deps changed, if you want not to react to var - wrap it with useLatest
 */
// @ts-ignore
export function useRecoilMemoParamSelector<P, U>(
	fn: (p: P) => SelectorFn<U>,
	deps: DependencyList,
	key: string
): RecoilValueReadOnly<(p: P) => RecoilValueReadOnly<U>>
export function useRecoilMemoParamSelector(fn: any, deps: DependencyList, key: string) {
	return useRecoilMemoSelector(fn, deps, key, true)
}

type EffectReturn = void | (() => Promise<void>) | (() => void)
type GetAsync = <T>(recoilValue: RecoilValue<T>) => Promise<T>
type GetOpts = {
	getAsync: GetAsync
	getCurrentAsync: GetAsync
	getPrevAsync: GetAsync
	getParamAsync: <P, R>(s: RecoilValueReadOnly<(p: P) => RecoilValueReadOnly<R>>) => (p: P) => Promise<R>
	set: <T>(recoilVal: RecoilState<T>, valOrUpdater: T | ((currVal: T) => T)) => void
}

const useRefreshMultipleAtom = (key: string) => {
	const _key = `${key} (refresh atom)`
	const refreshAtom = useRecoilAtom(useState(() => getNextKey(_key))[0], new Map<number, number>(), undefined, true)
	return { refreshAtom }
}

/**
 * similar to useEffect but also reactive to atoms/selectors
 * NOTICE!!! - async is only for async state access and such, not in order to perform long operations
 * @param fn use get to subscribe to atoms/selectors, if you don't not to subscribe - use value from useRecoilLatest
 * @param deps same as react deps - reruns selector if deps changed, if you want not to react to var - wrap it with useLatest
 * @param gettersFn
 * @param key
 */
export function useRecoilEffect(
	fn: (opts: GetOpts) => Promise<EffectReturn>,
	deps: DependencyList,
	gettersFn: (opts: { get: GetRecoilValue }) => void,
	key: string
): void {
	let selectorCache = useRef<RecoilValueReadOnly<any>[]>([])

	/**
	 * - selector is used to trigger a function, but the value it returs is fixed so that it will not trigger re-render
	 * - the reason for async - we want the effect to be able to set recoil atoms, that can be done only detached from the render
	 *   on the other hand want to access state, recoils gives an async get.
	 * - the reason for a separate gettersFn - on mount we cannot run the fn straight but have to wait for the mount
	 *   but the getter must run sync in order to register
	 *
	 */

	const cachedDeps = useRef<DependencyList[]>([])
	const isMounted = useRef(false)
	let cleanFn = useRef<Promise<EffectReturn>>(Promise.resolve(void 0))

	const { refreshAtom } = useRefreshMultipleAtom(`${key} (recoilEffect)`)
	const refreshRefreshAtom = useSetRecoilState(refreshAtom)
	const refresh = useHandler((i: number) => {
		refreshRefreshAtom((m) => {
			m.set(i, (m.get(i) ?? 0) + 1)
			return new Map(m)
		})
	})

	const { asyncGet, asyncParamGet, set } = useRecoilAsyncGet()

	let cachedDepsIndex = -1
	cachedDepsIndex = cachedDeps.current.findIndex((cdeps) => areDepsEqual(cdeps, deps))
	const latestCachedDepsIndex = useRef(-1)

	if (cachedDepsIndex === -1) {
		/* istanbul ignore else */
		cachedDeps.current.push(deps)

		let prevValue = new Map<string, any>()
		let getPrevAsync: GetAsync = async (recoilValue) => {
			let val = await asyncGet(recoilValue)
			let _prevValue = prevValue.get(recoilValue.key)
			prevValue.set(recoilValue.key, val)
			return _prevValue
		}
		let nextKey = getNextKey(`${key} (recoilEffect)`)

		cachedDepsIndex = cachedDeps.current.length - 1

		let refreshSelector = selector({
			cachePolicy_UNSTABLE: {
				eviction: 'most-recent',
			},
			key: `${nextKey} (refreshSelector) cachedDepsIndex:${cachedDepsIndex}`,
			get: ({ get }) => {
				let m = get(refreshAtom)
				return m.get(cachedDepsIndex)
			},
		})
		let newCachedSelector = selector({
			cachePolicy_UNSTABLE: {
				eviction: 'most-recent',
			},
			key: nextKey,
			get: ({ get }) => {
				/**
				 * - refresh is used to trigger when switching to selector from cache, because recoil will not call selector get
				 *   also it is used to trigger on mount
				 */
				get(refreshSelector)
				if (isMounted.current) {
					gettersFn({ get })
					cleanFn.current.then(async (f) => {
						if (typeof f === 'function') {
							f()
						}
					})
					/**
					 * getCurrentAsync: it gets to be current just because lint does not create getters for it as oppose to getAsync
					 */

					cleanFn.current = fn({
						getAsync: asyncGet,
						getCurrentAsync: asyncGet,
						getPrevAsync: getPrevAsync,
						getParamAsync: asyncParamGet,
						set,
					})
				}
				return undefined
			},
		})
		selectorCache.current.push(newCachedSelector)
	}

	if (cachedDepsIndex !== latestCachedDepsIndex.current) {
		if (latestCachedDepsIndex.current !== -1) {
			/**
			 * in order the refresh to run after useRecoilValue and to detach set from the render
			 */
			let _index = latestCachedDepsIndex.current
			let dep = deps[0]
			setTimeout(() => {
				refresh(_index)
			}, 5)
		}
	}

	latestCachedDepsIndex.current = cachedDepsIndex

	let currentSelector = selectorCache.current[cachedDepsIndex]
	assertIsDefined(currentSelector)
	useRecoilValue(currentSelector)

	/**
	 * most of the problem solved is for react strict mode which causes remount probably sync mount after unmount after first mount.
	 * waitForClean put in ref in order to persist between mounts.
	 * if the
	 */
	const waitForClean = useRef(Promise.resolve())

	useEffect(() => {
		isMounted.current = true

		let stopInitializingWeAreUnmountingAlready = false
		let selectorInitialized = false
		waitForClean.current.then(() => {
			if (!stopInitializingWeAreUnmountingAlready) {
				selectorInitialized = true
				// refresh will cause selector to run sync
				refresh(0)
			}
		})
		return () => {
			// remount will not reset ref
			isMounted.current = false

			if (!selectorInitialized) {
				stopInitializingWeAreUnmountingAlready = true
			} else {
				let resolve: () => void
				waitForClean.current = new Promise((_resolve) => {
					resolve = _resolve
				})
				cleanFn.current.then((f) => {
					let result = typeof f === 'function' ? f() : void 0
					if (result instanceof Promise) {
						result.then(resolve)
					} else {
						resolve()
					}
				})
			}

			// remount will not reset ref
			cleanFn.current = Promise.resolve(void 0)
		}
	}, [])

	return void 0
}

/**
 * works dynamically , meaning - change it's parameter between undefined or atom/selector => it will return selector(inputSelector) or selector(undefined)
 * @param atomOrSelectorOrUndefined atom or selector or undefined
 * @returns selector
 */
export function useMaybeAtom<T>(
	atomOrSelectorOrUndefined: RecoilValue<T> | undefined,
	key: string
): RecoilValueReadOnly<T | undefined> {
	let latestAtom = useLatest(atomOrSelectorOrUndefined)

	let workSelector = useRef(
		useMemo(() => {
			return selector({
				key: getNextKey(`${key} param-atom:(${latestAtom.current?.key ?? ''}) (useMaybeAtom)`),
				get: ({ get }) => {
					if (latestAtom.current) {
						return get(latestAtom.current)
					}
					return undefined
				},
			})
		}, [key])
	)

	let refresh = useRecoilRefresher_UNSTABLE(workSelector.current)

	useEffect(() => {
		refresh()
		let __dep__ = atomOrSelectorOrUndefined
	}, [atomOrSelectorOrUndefined])

	return workSelector.current
}

/**
 * similar to the useRecoilAtom but the key is auto generated on each mount
 * @param _default
 * @returns [atom, setAtom]
 */
export const useRecoilLocalAtom = <T,>(
	_default: RecoilValue<T> | Promise<T> | Loadable<T> | WrappedValue<T> | T,
	key: string
): readonly [RecoilState<T>, SetterOrUpdater<T>] => {
	let _atom = useRecoilLocalAtom__(_default, key)
	let _setAtom = useSetRecoilState(_atom)
	return [_atom, _setAtom] as const
}
