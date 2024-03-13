import { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils'
import type { Context } from '../utils/ast-utils'
import type { TSESTree } from '@typescript-eslint/utils'

const createESLintRule = ESLintUtils.RuleCreator(() => ``)
const RULE_NAME = 'replace-svg'

type Options = []
type MessageIds = 'testMessage' | 'addImport'

const rule = createESLintRule<Options, MessageIds>({
	name: RULE_NAME,
	meta: {
		type: 'problem',
		docs: {
			description: `codemode to replace svg with Icon`,
		},
		fixable: 'code',
		messages: {
			addImport: `import replce svg`,
			testMessage: `auto fix`,
		},
		schema: [],
	},
	defaultOptions: [],
	create: (context) => {
		return {
			JSXOpeningElement: (openingElement) => {
				let { name: identifier } = openingElement
				if (identifier?.type === AST_NODE_TYPES.JSXIdentifier) {
					if (identifier.name === 'svg') {
						replaceIDentifier(context, identifier, 'Icon')
					}
				}
			},
			JSXClosingElement: (closingElement) => {
				let { name: identifier } = closingElement
				if (identifier?.type === AST_NODE_TYPES.JSXIdentifier) {
					if (identifier.name === 'svg') {
						replaceIDentifier(context, identifier, 'Icon')
						addImports(context)
						replaceProps(context)
					}
				}
			},
		}
	},
})

export const replaceSvg = { rule, RULE_NAME }

let replaceIDentifier = (context: Context, identifier: TSESTree.JSXIdentifier, replaceWith: string) => {
	let workNode = identifier

	const replacementCode = replaceWith
	const start = workNode.range[0]
	const end = workNode.range[1]

	context.report({
		node: workNode,
		messageId: 'testMessage',
		fix(fixer) {
			return fixer.replaceTextRange([start, end], replacementCode)
		},
	})
}

let replaceProps = (context: Context) => {
	const replacementCode = 'props: IconProps'

	let prog = context.getSourceCode().ast as any
	let workNode = prog?.body?.[0]?.declaration?.declarations?.[0]?.init?.params?.[0]
	if (workNode) {
		context.report({
			node: workNode,
			messageId: 'testMessage',
			fix(fixer) {
				return fixer.replaceText(workNode, replacementCode)
			},
		})
	} else {
		let workNode = prog?.body?.[0]?.declaration?.declarations?.[0]?.init?.body

		if (workNode) {
			const start = workNode.range[0]

			context.report({
				node: workNode,
				messageId: 'testMessage',
				fix(fixer) {
					return fixer.replaceTextRange([start - 6, start - 4], `(${replacementCode})`)
				},
			})
		}
	}
}

let addImports = (context: Context) => {
	let workNode = context.getSourceCode().ast

	context.report({
		node: workNode,
		messageId: 'testMessage',
		fix(fixer) {
			return fixer.insertTextBefore(workNode, `import type { IconProps } from '@monorepo/utils/frontend-utils/theme'\nimport { Icon } from '@chakra-ui/react'\n\n`)
		},
	})
}
