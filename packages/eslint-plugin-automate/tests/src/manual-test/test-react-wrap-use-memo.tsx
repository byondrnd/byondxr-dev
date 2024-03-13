// @ts-nocheck
import { useMemo } from 'react'

let a = () => ({
	b: {
		useC: () => ({
			d: 1,
		}),
		c: () => ({
			d: 1,
		}),
	},
})
export const Compones22sssnt2 = memo(() => {
	let e1 = useMemo(() => {
		return a().b.c()
	}, [])
	let e2 = a().b.useC()

	return (
		<mesh>
			<span></span>
		</mesh>
	)
})
Compones22sssnt2.displayName = 'Compones22sssnt2'
