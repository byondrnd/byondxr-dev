import { areDepsEqual } from '../../../src'

describe('recoil v2 areDepsEqual', () => {
	vi.spyOn(console, 'warn')
	vi.mocked(console.warn).mockImplementation(() => {})

	it('should return true for equal arrays', () => {
		const a = [1, 2, 3]
		const b = [1, 2, 3]
		expect(areDepsEqual(a, b)).toBe(true)
	})

	it('should return false for arrays with different lengths', () => {
		const a = [1, 2, 3]
		const b = [1, 2]
		expect(areDepsEqual(a, b)).toBe(false)
		expect(vi.mocked(console.warn).mock.calls).toHaveLength(1)
	})

	it('should return false for arrays with the same length but different values', () => {
		const a = [1, 2, 3]
		const b = [1, 2, 4]
		expect(areDepsEqual(a, b)).toBe(false)
	})

	it('should return true for arrays with the same object references', () => {
		const obj = { a: 1 }
		const a = [obj, obj]
		const b = [obj, obj]
		expect(areDepsEqual(a, b)).toBe(true)
	})

	it('should return false for arrays with different object references', () => {
		const a = [{ a: 1 }, { a: 2 }]
		const b = [{ a: 1 }, { a: 2 }]
		expect(areDepsEqual(a, b)).toBe(false)
	})
})
