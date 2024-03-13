export const delay = (time: number) => {
	if (Number.isInteger(time)) {
		return new Promise((res) => {
			return setTimeout(res, time)
		})
	} else {
		return undefined
	}
}
