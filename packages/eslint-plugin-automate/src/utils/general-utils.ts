export const checkTsxFileExtension = (filename: string) => {
	return RegExp(/(?<!.spec)\.tsx$/).test(filename)
}

export const extractFilename = (fullFilename: string) => {
	return RegExp(/.*[/\\](.+?).tsx/).exec(fullFilename)?.[1] ?? ''
}

export function listToEnum<T extends readonly string[]>(list: T) {
	return list.reduce((acc, v) => Object.assign(acc, { [v]: v }), {}) as { [K in T[number]]: K }
}

export const pascalCase = (str: string, delimiter = '') => {
	if (!str) {
		return undefined
	}
	return str
		.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
		?.map((x) => {
			return x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()
		})
		.join(delimiter)
}

export const camelCase = (str: string) => {
	if (!str) {
		return undefined
	}
	const s = str
		.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
		?.map((x) => {
			return x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase()
		})
		.join('')

	if (!s) {
		return undefined
	}
	return s.slice(0, 1).toLowerCase() + s.slice(1)
}
