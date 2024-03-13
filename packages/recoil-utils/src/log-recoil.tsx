import { useRef } from 'react'
import { useInterval } from 'react-use'
import { useRecoilTransactionObserver_UNSTABLE } from 'recoil'
import { uniqBy } from 'remeda'
import { useHandler } from '@byondxr/react-utils'
import { debugConsoleLog } from '@byondxr/utils'
import type { Snapshot } from 'recoil'

export const useLogRecoil = (): void => {
	const countedRef = useRef({ atoms: 0, selectors: 0 })
	const collectedSelectorKeysRef = useRef<string[]>([])
	const collectedAtomKeysRef = useRef<string[]>([])

	const count = useHandler((snapshot: Snapshot) => {
		if ((window as any).ByondXR?.debug) {
			const items = Array.from(snapshot.getNodes_UNSTABLE()).map((e) => ({
				key: e.key,
				type: snapshot.getInfo_UNSTABLE(e).type,
			}))
			const selectors = items.filter((s) => s.type === 'selector')
			const selectorLength = selectors.length
			const atoms = items.filter((s) => s.type === 'atom')
			const atomsCount = atoms.length

			collectedSelectorKeysRef.current = selectors.map((o) => o.key)
			collectedAtomKeysRef.current = atoms.map((o) => o.key)

			if (countedRef.current.atoms !== atomsCount || countedRef.current.selectors !== selectorLength) {
				countedRef.current.atoms = atomsCount
				countedRef.current.selectors = selectorLength
				debugConsoleLog('recoil nodes count: ', {
					atoms: atomsCount,
					selectors: selectorLength,
				})
			}
		}
	})

	const collectedModifiedRef = useRef<any[]>([])
	const collectModified = useHandler((snapshot: Snapshot) => {
		if ((window as any).ByondXR?.debug) {
			const items = Array.from(snapshot.getNodes_UNSTABLE({ isModified: true })).map((e) => ({
				key: e.key,
				// type: snapshot.getInfo_UNSTABLE(e).type,
				contents: snapshot.getLoadable(e).contents,
			}))
			collectedModifiedRef.current = [...collectedModifiedRef.current, ...items]
		}
	})

	useInterval(() => {
		if ((window as any).ByondXR?.debug) {
			let selectorFamilyCountMap = new Map<string, number>()
			let formatKeys = (keys: string[]) => {
				return uniqBy(
					keys
						.map((k) => {
							let [_, count, text] = /^(\d+\s)?(.*?)(\/?\d*)$/.exec(k) ?? []
							let selectorFamilyCount = 0
							if (text?.includes('__selectorFamily')) {
								let count = selectorFamilyCountMap.get(text) ?? 0
								selectorFamilyCountMap.set(text, count + 1)
								selectorFamilyCount = count + 1
							}

							return {
								text,
								count: Number(count ?? -Infinity),
								selectorFamilyCount,
							}
						})
						.filter((o) => o.text)
						.sort((a, b) => {
							let ca = a.count
							let cb = b.count
							if (ca < cb) {
								return 1
							}
							if (ca > cb) {
								return -1
							}
							return 0
						}),
					(o) => o.text
				).map(
					(o) =>
						`${o.count === -Infinity ? '' : `${o.count} `}${o.text}${
							o.selectorFamilyCount ? ` ${o.selectorFamilyCount}` : ''
						}`
				)
			}
			{
				if (collectedModifiedRef.current.length > 0) {
					let keys = collectedModifiedRef.current.map((o) => o.key)
					let sortedKeys = formatKeys(keys)
					debugConsoleLog('modified state', {
						sortedKeys,
						contents: collectedModifiedRef.current,
					})
				}
				collectedModifiedRef.current = []
			}
			{
				let sortedKeys = formatKeys(collectedSelectorKeysRef.current)
				debugConsoleLog('selectors', { sortedKeys })
			}
			{
				let sortedKeys = formatKeys(collectedAtomKeysRef.current)
				debugConsoleLog('atoms', { sortedKeys })
			}
		}
	}, 15000)

	useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
		count(snapshot)
		collectModified(snapshot)
	})
}
