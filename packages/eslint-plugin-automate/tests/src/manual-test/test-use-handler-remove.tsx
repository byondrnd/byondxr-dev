// @ts-nocheck
import { memo, useHandler, useInlineHandler } from '@monorepo/utils/frontend-utils/hooks'

type TestUseHandlerRemoveProps = {} & BoxProps
export const TestUseHandlerRemove = memo(({ p, videoAttributes }: TestUseHandlerRemoveProps) => {
	const { r } = useInlineHandler()

	let a = 1
	const b = useHandler(() => {
		console.log(a)
	})
	const c = useHandler(() => {
		console.log(p)
	})
	const c2 = () => {
		b()
	}
	const c1 = useHandler(() => {
		let { autoplay, ...rest } = videoAttributes ?? {}
	})
	const d = () => {
		console.log('')
	}
	useEffect(() => {
		return () => {}
	}, [])

	return (
		<Box
			data-component="TestUseHandlerRemove"
			onXXX={r(() => {
				console.log(a)
			})}
			{...props}
		></Box>
	)
})
TestUseHandlerRemove.displayName = 'TestUseHandlerRemove'
