import { forwardRef, useEffect, useState } from 'react'
import { useRecoilLocalAtom, useRecoilEffect } from '@byondxr/recoil-utils'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './app.css'

const App = () => {
	const [count, setCount] = useState(0)

	const [vAtom, setVAtom] = useRecoilLocalAtom('', 'app:App:vAtom')

	useEffect(() => {
		console.log('useEffect')
		let tm = setTimeout(() => {
			console.log('setVAtom(v + 1)')
			setVAtom((v) => v + 2)
			setTimeout(() => {
				console.log('setVAtom(v + 2)')
				setVAtom((v) => v + 2)
			}, 5000)
		}, 5000)
		return () => {
			clearTimeout(tm)
		}
	}, [])

	useRecoilEffect(
		async ({ getAsync }) => {
			const v = await getAsync(vAtom)
			console.log('v', v)
		},
		[vAtom],
		({ get }) => {
			const v = get(vAtom)
		},
		'app:App:-'
	)

	return (
		<>
			<div data-component="aaaaaa">
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

export const BBB = forwardRef(() => {
	return null
})
BBB.displayName = 'BBB'
