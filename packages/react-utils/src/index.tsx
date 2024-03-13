import { useCallback, memo as reactMemo, useRef } from 'react'
import type { Dict, EmptyDict } from '@byondxr/utils'
import type { DependencyList, FunctionComponent, Key, NamedExoticComponent, ReactNode } from 'react'

export type WithChildren<T = Dict<unknown>> = T & { children?: ReactNode }
export type WithRequiredChildren<T = EmptyDict> = T extends EmptyDict
	? { children: ReactNode }
	: T & { children: ReactNode }
export type WithClass<T = Dict<unknown>> = T & { className?: string }

type UseHandler = <T extends Function>(callback: T) => T
const _useCallback = useCallback
export const useHandler: UseHandler = <T extends Function>(callback: T): T => {
	const callbackRef = useRef(callback)
	callbackRef.current = callback
	// useUnmount(() => {
	// 	// making sure that whoever used that function will not keep it in scope in order to clean memory (for recoil selector)
	// 	callbackRef.current = (() => {}) as any
	// })

	return _useCallback((...args: any[]) => callbackRef.current(...args), []) as unknown as T
}

type UseInlineHandler = () => {
	r: <Args extends any[], R>(fn: (...args: Args) => R, paramKey?: any) => (...args: Args) => R
}
export const useInlineHandler: UseInlineHandler = () => {
	const ref = useRef<Dict<{ currentFn: Function; callFn: Function }>>({})
	return {
		r: useHandler(<Args extends any[], R>(fn: (...args: Args) => R, paramKey?: any): ((...args: Args) => R) => {
			const key = fn.toString() + (JSON.stringify(paramKey) ?? '')

			let recalled = ref.current[key]

			if (!recalled) {
				recalled = ref.current[key] = {
					currentFn: fn,
					callFn: (...args: any[]) => recalled?.currentFn(...(args as Args)),
				}
			} else {
				recalled.currentFn = fn
			}

			return recalled.callFn as (...args: Args) => R
		}),
	}
}

type Memo = <P extends object>(
	Component: FunctionComponent<P>,
	propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
) => NamedExoticComponent<P>
export const memo: Memo = <P extends object>(
	Component: FunctionComponent<P>,
	propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
) => {
	return reactMemo(Component, (prevProps, nextProps) => {
		const _prevProps = Object.fromEntries(
			Object.entries(prevProps as Record<string, any>).filter(([__k, v]) => typeof v !== 'function')
		)
		const _nextProps = Object.fromEntries(Object.entries(nextProps).filter(([__k, v]) => typeof v !== 'function'))
		let ret: boolean
		if (propsAreEqual) {
			ret = propsAreEqual(_prevProps as Readonly<P>, _nextProps as Readonly<P>)
		} else {
			ret = Object.entries(_prevProps).every(([k, v]) => Object.is(v, _nextProps[k]))
		}
		if (!ret) {
			;(window as any).countRenders = 1 + ((window as any).countRenders ?? 0)
		}
		return ret
	})
}

export const effectDep = <T,>(fn: T) => fn

export type HandlerParams = Key | { key: Key }

interface StoredCallbackData {
	function: () => any
	params: HandlerParams
}

export const useParamsHandler = <P extends HandlerParams, T extends unknown[] = [], R = any>(
	callback: (params: P, ...args: T) => R,
	deps?: DependencyList
): ((params: P) => (...args: T) => R) => {
	const depsRef = useRef<DependencyList | undefined>(deps)
	const depsChanged =
		!depsRef.current !== !deps ||
		(deps &&
			depsRef.current &&
			deps.length === depsRef.current.length &&
			depsRef.current.find((dep, index) => deps[index] !== dep))
	depsRef.current = deps
	const newCallbackDataMap = new Map<Key, StoredCallbackData>()
	const storedCallbackDataMap = useRef(newCallbackDataMap)
	if (depsChanged) {
		storedCallbackDataMap.current = newCallbackDataMap
	}
	const callbackRef = useRef(callback)
	callbackRef.current = callback
	return (params: HandlerParams) => {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const key: Key = typeof params === 'object' ? params.key : params
		let callbackData = storedCallbackDataMap.current.get(key)
		if (callbackData) {
			callbackData.params = params
		} else {
			const newFunction = (...args: T) => {
				const retrievedParams = storedCallbackDataMap?.current?.get(key)?.params as P
				callbackRef.current(retrievedParams, ...args)
			}
			callbackData = { function: newFunction, params }
			storedCallbackDataMap.current.set(key, callbackData)
		}
		return callbackData.function
	}
}
