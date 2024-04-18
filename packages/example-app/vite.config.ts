import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
	clearScreen: false,
	plugins: [
		react({
			babel: {
				plugins: [
					[
						'@byondxr/babel-plugin',
						{
							componentWrappers: {
								memo: { importName: 'memo', importSource: '@byondxr/react-utils' },
								observer: { importName: 'observer', importSource: '@legendapp/state/react' },
							},
							memoWithChildren: false,
							dataComponent: true,
							wrapObserverOnlyIfGet: false,
						},
					],
				],
			},
			include: [/.\/packages\/example-app\/src\/.+\.tsx?$/],
		}),
	],
})
