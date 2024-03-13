import { ESLintUtils } from '@typescript-eslint/utils'
import type { Context } from '../utils/ast-utils'
import type { TSESTree } from '@typescript-eslint/utils'
import { ImportUtils } from '../utils/import-utils'

const createESLintRule = ESLintUtils.RuleCreator(() => ``)
const RULE_NAME = 'replace-identifier'

type Options = [
	{
		identifiers?: {
			replaceWith: string
			importSource: string
			replaces: string
		}[]
	},
]
type MessageIds = 'testMessage' | 'addImport'

const rule = createESLintRule<Options, MessageIds>({
	name: RULE_NAME,
	meta: {
		type: 'problem',
		docs: {
			description: `Wrap all functions inside a functional React component with useHandler`,
		},
		fixable: 'code',
		messages: {
			addImport: `import replace identifier`,
			testMessage: `auto fix`,
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					identifiers: {
						type: 'array',
						items: {
							type: 'object',
							additionalProperties: false,
							properties: {
								replaceWith: {
									type: 'string',
								},
								importSource: {
									type: 'string',
								},
								replaces: {
									type: 'string',
								},
							},
							required: ['replaceWith', 'importSource', 'replaces'],
						},
					},
				},
			},
		],
	},
	defaultOptions: [{}],
	create: (context) => {
		const { identifiers } = context.options[0]

		const importUtils = new ImportUtils(context)

		return {
			...importUtils.updateImports('addImport'),
			Identifier: (node) => {
				if (node.parent?.type === 'ImportSpecifier') {
					return
				}
				let foundIdentifier = identifiers?.find((identifier) => {
					return new RegExp(identifier.replaces).test(node.name)
				})
				if (foundIdentifier) {
					replaceIDentifier(context, node, foundIdentifier.replaceWith)
					importUtils.addImports(foundIdentifier.importSource, [foundIdentifier.replaceWith])
				}
			},
		}
	},
})

export const replaceIdentifier = { rule, RULE_NAME }

let replaceIDentifier = (context: Context, identifier: TSESTree.Identifier, replaceWith: string) => {
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
