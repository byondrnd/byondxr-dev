// @ts-nocheck
import { memo } from '@monorepo/utils/frontend-utils/hooks'
import { useRecoilValue } from '@monorepo/utils/frontend-utils/recoil'

export const useA = () => {
	// let a = 1
	const currentSpace: any = useRecoilValue(currentSpaceSelector)
	// useDDDD(currentSpace)

	// const { byondId } = useRecoilValue(useRecoilSelector(loadedSingleAtom, (s) => s))
	// const { emit } = eventManager.useEmitEvent<NavigationMapEventKeys>(byondId)
	const { emit } = eventManager.useEmitEvent<NavigationMapEventKeys>({
		id: byondId,
		entity: pluginName,
		entityName: currentSpace.name ?? '',
	})
	return <Box data-component="A">test</Box>
}

export const A = memo(() => {
	// let a = 1
	const currentSpace: any = useRecoilValue(currentSpaceSelector)

	let a = currentSpace

	return (
		<Box data-component="A" data-aaa={currentSpace}>
			test
		</Box>
	)
})

export const useInitScene = () => {
	const initialScene = useRecoilValue(useRecoilValue(sceneSelector)({ sceneId }))

	return { currentScene: initialScene }
}
