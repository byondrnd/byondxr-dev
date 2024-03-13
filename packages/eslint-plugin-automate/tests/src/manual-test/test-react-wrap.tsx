// @ts-nocheck

// import { dummy } from '../utils/utils'

// dummy()

// let memo = (p: any) => {}
// let useAutoHandler = (p: any) => {}
// let effectDep = (p: any) => {}

// const App = useAutoMemo((p: any) => {
// 	return null
// })

// type ComponentProps = { children: any; xxx: any }
// export const Component = (props: ComponentProps) => {
// 	const fff = useEffect(() => {
// 		console.log('dasdasdae')
// 	})
// 	const fff1 = useMemo(() => console.log('dasdasdae'))

// 	return null
// }

// export const Component1 = ({ xxx }: ComponentProps) => {
// 	return null
// }

// import { useMemo } from 'react'

import { memo } from '@monorepo/utils/frontend-utils/hooks'
import { useMemo, useEffect } from 'react'
// import { memo } from '@monorepo/utils/frontend-utils/hooks'

const first = () => {
	return [1, 2, 3, 4, 5] as const
}
export const Component1 = (props: { children: any }) => {
	console.log('')
	const fff1 = useMemo(() => {
		return { useFFF: { a: { b: 1 } } }
	}, [])
	const fff2 = fff1.useFFF()

	useEffect(() => {
		console.log('dasdasdae')
	}, [])

	return (
		<div data-component="Component1" {...{ a: 1 }}>
			<span></span>
		</div>
	)
}
export const Compones22sssnt2 = memo(() => {
	const pluginTypeSelector = 1
	const a = 1
	useRecoilMemoSelector(
		({ get }) => {
			let b = a
			const pluginType = pluginTypeSelector
			return get(getPluginListSelector({ pluginType }))
		},
		[a, pluginTypeSelector],
		'header:Header:-'
	)

	return (
		<mesh>
			<span></span>
		</mesh>
	)
})
Compones22sssnt2.displayName = 'Compones22sssnt2'
