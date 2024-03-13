export type Dict<T = any> = Record<string, T>

export function assertIsDefined<T>(val: T): asserts val is NonNullable<T> {
	if (val === undefined || val === null) {
		throw new Error(`Expected 'val' to be defined, but received ${val}`)
	}
}

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type Overwrite<T1, T2> = {
	[P in Exclude<keyof T1, keyof T2>]: T1[P]
} & T2

export type HasToBeTyped = any
export type HasToBeTypedResolverArgs = {
	args: {
		filter: any
		endpoint: string
		appKey: string
		_id: string
		records: Record<string, any>[]
	}
	context: Record<string, any>
}

export function isNotNull<T>(arg: T): arg is Exclude<T, null> {
	return arg !== null
}

export function listToEnum<T extends readonly string[]>(list: T) {
	return list.reduce((acc, v) => Object.assign(acc, { [v]: v }), {}) as { [K in T[number]]: K }
}

export function isDefined<T>(arg: T): arg is Exclude<T, undefined> {
	return arg !== undefined
}
export function isDefinedNotNull<T>(arg: T): arg is Exclude<Exclude<T, undefined>, null> {
	return arg !== undefined && arg !== null
}

export type EmptyDict = Dict<never>

export type PickKey<U extends string, T extends U> = keyof Pick<Record<U, any>, T>
export type ExtractExact<T, U extends T> = T extends U ? T : never

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
	return value !== null && value !== undefined
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop() {}
// eslint-disable-next-line @typescript-eslint/no-empty-function
export async function noopAsync() {}
