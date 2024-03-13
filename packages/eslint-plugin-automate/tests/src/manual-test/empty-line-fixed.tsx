// @ts-nocheck
/* eslint-disable prefer-arrow-functions/prefer-arrow-functions */
import { memo } from '@monorepo/utils/frontend-utils/hooks'

let useHandler = (p: any) => {}

let noinit
let memo = (p: any) => {}

let VariableDeclarator = memo(() => {
	const fff = useHandler(() => {})

	return undefined
})
VariableDeclarator.displayName = 'VariableDeclarator'
function Function() {
	const fff = useHandler(() => {})

	return undefined
}

export const ExportedVariableDeclarator = memo(() => {
	const fff = useHandler(() => {})

	return undefined
})
ExportedVariableDeclarator.displayName = 'ExportedVariableDeclarator'
export const ExportedFunction = memo(() => {
	const fff = useHandler(() => {})

	return undefined
})
ExportedFunction.displayName = 'ExportedFunction'

let MemoizedArrowFunction = memo(() => {
	const fff = useHandler(() => {})

	return undefined
})
let MemoizedFunction = memo(function () {
	const fff = useHandler(() => {})

	return undefined
})

export const ExportedMemoizedArrowFunction = memo(() => {
	const fff = useHandler(() => {})

	return undefined
})
export const ExportedMemoizedFunction = memo(function () {
	const fff = useHandler(() => {})

	return undefined
})
