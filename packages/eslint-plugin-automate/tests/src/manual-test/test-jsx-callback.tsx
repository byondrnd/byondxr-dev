// @ts-nocheck
// import { useMemo } from 'react'
// import { useInlineHandler } from '@monorepo/utils/frontend-utils/hooks'
//
// const useHandler = <T,>(a: T) => {
// 	return a
// }
//
// const a = () => {
// 	return []
// }
//
// export const Component2 = (props: { children: any }) => {
// 	const { r } = useInlineHandler()
//
// 	const b = a()
// 	let a = useMemo(() => {
// 		return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
// 	}, [])
//
// 	return (
// 		<div data-component='Component2'>
// 			{b.map((c, i) => {
// 				return (
// 					<div key={i * 7} data-ccc={r(() => {}, i * 7)}>
// 						{c}
// 					</div>
// 				)
// 			})}
// 		</div>
// 	)
// }
