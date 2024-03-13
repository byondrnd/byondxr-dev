import { ESLintUtils } from '@typescript-eslint/utils'

const createESLintRule = ESLintUtils.RuleCreator(() => ``)
const RULE_NAME = 'no-imports'

type Options = [
	{
		paths: {
			source: string
			specifiers: string
			message: string
		}[]
	},
]
type MessageIds = 'customMessage'

const rule = createESLintRule<Options, MessageIds>({
	name: RULE_NAME,
	meta: {
		type: 'problem',
		docs: {
			description: `no imports`,
		},
		fixable: 'code',
		messages: {
			customMessage: `{{customMessage}}`,
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					paths: {
						type: 'array',
						items: {
							type: 'object',
							additionalProperties: false,
							properties: {
								source: {
									type: 'string',
								},
								specifiers: {
									type: 'string',
								},
								message: {
									type: 'string',
								},
							},
							required: ['source', 'specifiers', 'message'],
						},
					},
				},
			},
		],
	},
	defaultOptions: [{ paths: [] }],
	create: (context) => {
		const { paths } = context.options[0]

		return {
			ImportDeclaration: (importNode) => {
				for (let path of paths) {
					if (importNode.source.value === path.source) {
						for (let specifier of importNode.specifiers) {
							if (specifier.type === 'ImportSpecifier') {
								if (RegExp(path.specifiers).test(specifier.imported.name)) {
									context.report({
										node: importNode,
										messageId: 'customMessage',
										data: {
											customMessage: path.message,
										},
									})
								}
							}
						}
					}
				}
			},
		}
	},
})

export const noImports = { rule, RULE_NAME }
