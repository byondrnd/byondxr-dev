import { RecoilRoot } from 'recoil'
import type { WithChildren } from '@byondxr/react-utils'

export const Wrapper = <T,>({ children }: WithChildren<T>) => {
	return <RecoilRoot data-component="Wrapper">{children}</RecoilRoot>
}
