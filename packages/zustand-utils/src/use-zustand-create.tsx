import { current, produce } from 'immer'
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import type { UseBoundStore } from 'zustand'
import type { StateCreator, StoreApi } from 'zustand/vanilla'

///
export type ZustandStore<T> = UseBoundStore<StoreApi<T>>

export const useZustandMountCounters = create(() => {
	return { storesMap: new Map<string, { count: number; default: unknown; useStore: unknown }>() }
})
export const useZustandCreate = <T,>(key: string, initializer: StateCreator<T, [], []>) => {
	const useStore = useState(() => {
		const existingUseStore = useZustandMountCounters.getState().storesMap.get(key)?.useStore
		if (existingUseStore) {
			return existingUseStore as ZustandStore<T>
		} else {
			const useStore = create<T>((...params: Parameters<StateCreator<T, [], []>>) => {
				const _default = initializer(...params)
				useZustandMountCounters.setState((prev) => {
					return produce(prev, (draft) => {
						const { storesMap } = draft
						const meta = storesMap.get(key)
						if (meta) {
							meta.default = _default
							meta.count = 0
						} else {
							storesMap.set(key, { default: _default, count: 0, useStore: null })
						}
					})
				})
				return _default
			})
			useZustandMountCounters.setState((prev) => {
				return produce(prev, (draft) => {
					const { storesMap } = draft
					let meta = storesMap.get(key)
					if (meta) {
						meta.useStore = useStore
					}
				})
			})
			return useStore
		}
	})[0]

	useEffect(() => {
		useZustandMountCounters.setState((prev) => {
			return produce(prev, (draft) => {
				const { storesMap } = draft
				const meta = storesMap.get(key)
				if (meta) {
					meta.count++
				}
			})
		})

		return () => {
			useZustandMountCounters.setState((prev) => {
				const { storesMap } = prev
				const meta = storesMap.get(key)
				if (!meta) {
					console.warn('from some reason there is no store to reset in zustand util useMountCounters')
					return prev
				} else if (meta.count === 0) {
					console.warn('trying to decrease zustand store countes bellow 0')
					return prev
				} else {
					return produce(prev, (draft) => {
						const meta = draft.storesMap.get(key)
						if (meta) {
							const newCount = meta.count - 1
							meta.count = newCount
							if (newCount === 0) {
								;(meta.useStore as ZustandStore<T>).setState(current(meta.default) as T)
							}
						}
					})
				}
			})
		}
	}, [key])

	return useStore
}
