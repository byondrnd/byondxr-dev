// @ts-nocheck
import { useEffect, useRef } from 'react'
import { memo } from '@monorepo/utils/frontend-utils/hooks'
import { useRecoilMemoParamSelector } from '@monorepo/utils/frontend-utils/recoil'

let e = 1
export type TestDeps1Props = {} & BoxProps
export const TestDeps1 = memo((props: TestDeps1Props) => {
	let a = 1
	let b = useRef()
	let b1 = useRef()
	let f = () => {}
	let f1 = () => {}

	const aaa = useRecoilMemoParamSelector(
		() => {
			// __lint__ b.current - local selector ref dependency
			let w = b.current

			// __lint__ f1 - local selector function dependency
			console.log(f1)
		},
		[b.current],
		'test-deps1:TestDeps1:aaa (local)'
	)

	return <Box data-component="TestDeps1" {...props}></Box>
})
TestDeps1.displayName = 'TestDeps1'
