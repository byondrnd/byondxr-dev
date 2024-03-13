/**
 *
 * @desc will show if u turn on window.ByondXR.debug = true
 */
export const debugConsoleLog = (...args: any[]): void => {
	if ((window as any).ByondXR?.debug) {
		const css = 'background-color: orange'
		console.log('%c[DEBUG]', css, ...args)
	}
}
