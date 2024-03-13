// @ts-nocheck
let testFn = (
	a: { x: string } | null | undefined,
	b: string[] | null | undefined,
	c: (() => void) | null | undefined
) => {
	let a1 = a?.x
	let b1 = b?.[0]
	let c1 = c?.()
}
