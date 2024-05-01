import type { Ref } from 'react'
import { useState, forwardRef } from 'react'
import { useRecoilLocalAtom } from '@byondxr/recoil-utils'
import { observable } from '@legendapp/state'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './app.css'

const o$ = observable({ a: 1 })
setInterval(() => {
	o$.set({ a: o$.get().a + 1 })
}, 1000)
type Props = { children: string }
export const A = forwardRef(({ children }: Props, ref: Ref<HTMLDivElement>) => {
	console.log(o$.get())
	return null
})

A.displayName = 'A'

const App = () => {
	const [count, setCount] = useState(0)

	const [vAtom, setVAtom] = useRecoilLocalAtom('', 'app:App:vAtom')

	// useEffect(() => {
	// 	console.log('useEffect')
	// 	let tm = setTimeout(() => {
	// 		console.log('setVAtom(v + 1)')
	// 		setVAtom((v) => v + 2)
	// 		setTimeout(() => {
	// 			console.log('setVAtom(v + 2)')
	// 			setVAtom((v) => v + 2)
	// 		}, 5000)
	// 	}, 5000)
	// 	return () => {
	// 		clearTimeout(tm)
	// 	}
	// }, [])

	// useRecoilEffect(
	// 	async ({ getAsync }) => {
	// 		const v = await getAsync(vAtom)
	// 		console.log('v', v)
	// 	},
	// 	[vAtom],
	// 	({ get }) => {
	// 		const v = get(vAtom)
	// 	},
	// 	'app:App:-'
	// )

	return (
		<>
			<div data-component="aaaaaa">
				<A>a</A>
				<a href="https://vitejs.dev" target="_blank" rel="noreferrer">
					<img src={viteLogo} className="logo" alt="Vite logo" />
				</a>
				<a href="https://react.dev" target="_blank" rel="noreferrer">
					<img src={reactLogo} className="logo react" alt="React logo" />
				</a>
			</div>
			<h1>Vite + React</h1>
			<div className="card">
				<button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
				<p>
					Eeeeeeexxxeeeedit <code>src/App.tsx</code> and save to test HMR
				</p>
			</div>
			<p className="read-the-docs">Click on the Vite and React logos to learn more</p>
		</>
	)
}

export default App

const _BBB = () => {
	const A = () => {
		return <div></div>
	}
	return <A />
}

// export const CCC = memo(() => {
// 	return <Canvas>aaa</Canvas>
// })
// CCC.displayName = 'BBB'

// export const DDD = memo(() => {
// 	// @ts-ignore
// 	return <_Canvas>aaa</_Canvas>
// })
// DDD.displayName = 'BBB'
