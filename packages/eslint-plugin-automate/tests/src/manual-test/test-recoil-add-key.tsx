// @ts-nocheck
import { useRecoilMemoSelector } from '@monorepo/utils/frontend-utils/recoil'

export const Component = memo(() => {
	const aaaSelector = useRecoilMemoSelector(
		({ get }) => {
			const { pluginType } = get(getPluginInstanceSelectorById({ byondId: selectedPluginId }))
			const collapseIn = pluginType.includes('space')
			return { collapseIn }
		},
		[],
		'test-recoil-add-key:Component:aaa'
	)
})
export const useHook = () => {
	const aaa = useRecoilValue(
		useRecoilMemoParamSelector(
			() =>
				({ get }) => {
					const { pluginType } = get(getPluginInstanceSelectorById({ byondId: selectedPluginId }))
					const collapseIn = pluginType.includes('space')
					return { collapseIn }
				},
			[],
			'test-recoil-add-key:useHook:aaa'
		)
	)
	useRecoilEffect(
		({ get }) => {
			const { pluginType } = get(getPluginInstanceSelectorById({ byondId: selectedPluginId }))
			const collapseIn = pluginType.includes('space')
			return { collapseIn }
		},
		[],
		'test-recoil-add-key:useHook:-'
	)
}

export const Component = memo(() => {
	const [aaaAtom] = useRecoilLocalAtom('aaa', 'test-recoil-add-key:Component:aaaAtom')
})
