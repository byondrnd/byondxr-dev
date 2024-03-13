// @ts-nocheck
//comp

import { memo, useHandler } from '@monorepo/utils/frontend-utils/hooks'
import { useEffect, useMemo, useRef } from 'react'
import { useLatest } from 'react-use'
import { ppp } from './deps-data'

export const A = memo(() => {
	console.log('....')

	return undefined
})
A.displayName = 'A'

export const effectDep = <T,>(fn: T) => fn

export const B = memo((props: { fnUndefined: null | undefined | (() => void) }) => {
	const xxx = ppp.fn
	const yyy = useMemo(() => {
		return ppp.aaa
	}, [])
	const zzz = useLatest(() => ({}))
	const vvv = useRef(() => ({}))

	const fff = useHandler(async () => {})
	const fff1 = useHandler(() => {})

	useEffect(() => {
		console.log(xxx, yyy, zzz, fff, fff1)
	}, [yyy])

	const preLoadHandler = useHandler(() => {})
	let fnUndefined = props.fnUndefined
	let objectFn = useMemo(() => {
		return {
			fn: () => {},
		}
	}, [])
	useEffect(() => {
		console.log('', objectFn.fn)
	}, [objectFn.fn])

	return undefined
})
B.displayName = 'B'
