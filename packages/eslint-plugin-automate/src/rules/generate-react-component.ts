import { ESLintUtils } from '@typescript-eslint/utils'
import { extractFilename, pascalCase, camelCase } from '../utils/general-utils'

const createESLintRule = ESLintUtils.RuleCreator(() => ``)

const RULE_NAME = 'generate-react-component'

type Options = []

type MessageIds = 'testMessage'

let rule = createESLintRule<Options, MessageIds>({
	name: RULE_NAME,
	meta: {
		type: 'problem',
		docs: {
			description: ``,
		},
		fixable: 'code',
		messages: {
			testMessage: `auto create react component or hook`,
		},
		schema: [],
	},
	defaultOptions: [],
	create: (context) => {
		return {
			Program(programNode) {
				const fullFilename = context.getFilename()
				const filename = extractFilename(fullFilename)

				const ComponentName = pascalCase(filename)
				const Props = `${ComponentName}Props`

				const comments = context.getSourceCode().getAllComments()
				const foundComments = comments.filter((c) => RegExp(/^\/\s*comp/).test(c.value))
				let comment = foundComments[0]

				let isReqChildImported = false
				let isChildImported = false

				let _ComponentName = ComponentName
				let _Props = Props

				let getComponentText = (isChild = false, isReqChild = false) => `


export type ${_Props} = ${'{}'} & BoxProps
export const ${_ComponentName} = ( ${isReqChild || isChild ? '{ children, ...props }' : 'props'}:  ${
					isReqChild ? `WithRequiredChildren<${_Props}>` : isChild ? `WithChildren<${_Props}>` : _Props
				}) => {
    return <Box {...props}>${isReqChild || isChild ? '{children}' : ''}</Box>
}
                        `
				let getIconText = () => `

import { Icon } from '@chakra-ui/react'
import type { IconProps } from '@monorepo/utils/frontend-utils/theme'

export const ${_ComponentName} = ({ ...props }: IconProps) => {
	return (
		<Icon
			width='32px'
			height='32px'
			viewBox='0 0 32 32'
			fill='none'
			{...props}
		>
			<path />
		</Icon>
	)
}
                        `

				if (comment) {
					let isReqChild = false
					let isChild = false

					const { value } = comment
					if (value.includes(' req')) {
						isReqChild = true
						isReqChildImported = true
					} else if (value.includes(' child')) {
						isChild = true
						isChildImported = true
					}

					let _comment = comment
					context.report({
						loc: comment.loc,
						messageId: 'testMessage',
						fix(fixer) {
							return fixer.replaceTextRange(_comment.range, getComponentText(isChild, isReqChild))
						},
					})
				}

				if (context.getSourceCode().getText().length <= 3) {
					if (filename.startsWith('use-')) {
						context.report({
							node: programNode,
							messageId: 'testMessage',
							fix(fixer) {
								return fixer.insertTextAfter(
									programNode,
									`export const ${camelCase(filename)} = () => {}`
								)
							},
						})
					} else if (filename.endsWith('-icon')) {
						context.report({
							node: programNode,
							messageId: 'testMessage',
							fix(fixer) {
								return fixer.insertTextAfter(programNode, getIconText())
							},
						})
					} else {
						context.report({
							node: programNode,
							messageId: 'testMessage',
							fix(fixer) {
								return fixer.insertTextAfter(programNode, getComponentText())
							},
						})
					}
				}

				return {}
			},
		}
	},
})

export const generateReactComponent = { rule, RULE_NAME }
