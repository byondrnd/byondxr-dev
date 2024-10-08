import React from 'react'
import ReactDOM from 'react-dom/client'
import { RecoilRoot } from 'recoil'
import App from './app'
import './index.css'

// type HtmlProps = any
// export const HtmlComponent = (
// 	{ children, style, className, renderFirst, ...props }: HtmlProps,
// 	ref: Ref<HTMLDivElement>
// ) => {
// 	let b: any = {}
// 	let a = b.get()
// 	return (
// 		<div ref={ref} {...props} style={style} className={className} data-component="HtmlComponent">
// 			{renderFirst && children}
// 		</div>
// 	)
// }

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<RecoilRoot>
			<App />
		</RecoilRoot>
	</React.StrictMode>
)
