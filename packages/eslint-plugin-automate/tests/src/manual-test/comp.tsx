import { observable } from '@legendapp/state'
import { observer, useObservable } from '@legendapp/state/react'
import { useEffect } from 'react'

const $oo = observable({})

export type CompProps = {}
export const Comp = observer((props: CompProps) => {
	const internalObserver$ = useObservable(0)
	useEffect(() => {
		console.log('~', $oo.get(), internalObserver$.get())
	}, [internalObserver$])

	return <div data-component="Comp" {...props}></div>
})
Comp.displayName = 'Comp'
