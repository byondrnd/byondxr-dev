/* eslint-disable prefer-arrow-functions/prefer-arrow-functions */

import { useRecoilValue as useRecoilValue_Recoil } from 'recoil'
import type { RecoilValueReadOnly, RecoilValue } from 'recoil'
import { useRecoilSelector } from './recoil'
import { useRecoilMemoParamSelector, useRecoilMemoSelector } from './recoil-v2'

type UseRecoilMap = <
	T extends {
		[index: string]: any
	},
>(
	itemsSelector: RecoilValueReadOnly<T[]>,
	idKey?: keyof T
) => {
	itemsMapSelector: RecoilValueReadOnly<
		{
			itemSelector: RecoilValueReadOnly<T | undefined>
			itemId: T[keyof T]
		}[]
	>
	itemsLengthSelector: RecoilValueReadOnly<any>
}
export const useRecoilMap: UseRecoilMap = <T extends { [index: string]: any }>(
	itemsSelector: RecoilValueReadOnly<T[]>,
	idKey: keyof T = 'byondId'
) => {
	let itemsParamSelector = useRecoilMemoParamSelector(
		(n: number) =>
			({ get }) => {
				const items = get(itemsSelector)
				return items[n]
			},
		[itemsSelector],
		'recoil-v3:useRecoilMap:itemsParam'
	)

	const itemsLengthSelector = useRecoilSelector(itemsSelector, (s) => s.length)

	const itemsMapSelector = useRecoilMemoSelector(
		({ get }) => {
			const getSpaceSelector = get(itemsParamSelector)
			const spaces = get(itemsSelector)
			return spaces.map((space, index) => {
				return {
					itemSelector: getSpaceSelector(index),
					itemId: space[idKey],
				}
			})
		},
		[idKey, itemsParamSelector, itemsSelector],
		'recoil-v3:useRecoilMap:itemsMap'
	)

	return { itemsMapSelector, itemsLengthSelector }
}

export function useRecoilValue<T>(atom: RecoilValue<T>): T
export function useRecoilValue<T, R>(atom: RecoilValue<T>, fn: (p: T) => R): R
export function useRecoilValue<T, R>(atom: RecoilValue<T>, fn?: (p: T) => R) {
	return fn
		? // eslint-disable-next-line react-hooks/rules-of-hooks
		  useRecoilValue_Recoil(useRecoilSelector(atom, fn))
		: // eslint-disable-next-line react-hooks/rules-of-hooks
		  useRecoilValue_Recoil(atom)
}
