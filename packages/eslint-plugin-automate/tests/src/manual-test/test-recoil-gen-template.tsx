// @ts-nocheck
import { memo, useHandler } from '@monorepo/utils/frontend-utils/hooks'
import { useRecoilValue } from '@monorepo/utils/frontend-utils/recoil'

export type TestRecoilGenTemplateProps = {} & BoxProps
export const TestRecoilGenTemplate = memo((props: TestRecoilGenTemplateProps) => {
	let { aaaSelector } = services

	const aaa = useRecoilValue(aaaSelector)

	let b = 1
	let aa = useHandler(() => {
		let a = b
		console.log({ a: a })
	})

	let { bbbSelector } = services

	const bbb = useRecoilValue(bbbSelector)

	const value = useRecoilValue(bbbSelector, (s) => s)

	const bbb = useRecoilValue(bbbSelector, (a) => a)

	return <Box data-component="TestRecoilGenTemplate" {...props}></Box>
})
TestRecoilGenTemplate.displayName = 'TestRecoilGenTemplate'
