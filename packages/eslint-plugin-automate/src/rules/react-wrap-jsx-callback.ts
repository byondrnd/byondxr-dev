import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils'
import type { TSESTree } from '@typescript-eslint/utils'
import { walkUpTillKeyAttribute, walkUpTillReactComponentOrHook } from '../utils/ast-utils'
import { ImportUtils } from '../utils/import-utils'

const createESLintRule = ESLintUtils.RuleCreator(() => ``)
const RULE_NAME = 'react-wrap-jsx-callback'
type Options = [
	{
		wrap?: {
			wrapName: string
			importName: string
			importSource: string
		}
	},
]
type MessageIds = 'addImport' | 'getCallback' | 'addCallback' | 'updateKeyParam'

const rule = createESLintRule<Options, MessageIds>({
	name: RULE_NAME,
	meta: {
		type: 'problem',
		docs: {
			description: ``,
		},
		fixable: 'code',
		messages: {
			addImport: `import callback wrap util`,
			getCallback: `get callback wrapper`,
			addCallback: `jsx callback should be memoized with r - auto fixed`,
			updateKeyParam: 'update r key param - auto fixed',
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					wrap: {
						type: 'object',
						additionalProperties: false,
						properties: {
							wrapName: {
								type: 'string',
							},
							importName: {
								type: 'string',
							},
							importSource: {
								type: 'string',
							},
						},
						required: ['wrapName', 'importName', 'importSource'],
					},
				},
				required: ['wrap'],
			},
		],
	},
	defaultOptions: [{}],
	create: (context) => {
		const { wrap } = context.options[0]

		if (!wrap) {
			return {}
		}

		const { wrapName, importName, importSource } = wrap

		const importUtils = new ImportUtils(context)

		return {
			...importUtils.updateImports('addImport'),
			'ReturnStatement > JSXElement JSXAttribute > JSXExpressionContainer > ArrowFunctionExpression': (
				callbackNode: TSESTree.ArrowFunctionExpression
			) => {
				// if (!isDependent(context, callbackNode)) {
				// 	return
				// }
				let keyValue = walkUpTillKeyAttribute(context, callbackNode)
				context.report({
					node: callbackNode,
					messageId: 'addCallback',
					fix(fixer) {
						return fixer.replaceText(
							callbackNode,
							`${wrapName}(${context.getSourceCode().getText(callbackNode)}${
								keyValue ? `, ${keyValue}` : ''
							})`
						)
					},
				})

				const blockNode = walkUpTillReactComponentOrHook(callbackNode)
				if (!blockNode) {
					return
				}

				if (!context.getSourceCode().getText(blockNode).includes(importName)) {
					const workNode = blockNode.body[0]
					if (workNode) {
						context.report({
							node: workNode,
							messageId: 'getCallback',
							fix(fixer) {
								return fixer.insertTextBefore(
									workNode,
									`\n\tconst { ${wrapName} } = ${importName}()\n\n`
								)
							},
						})
					}
					importUtils.addImports(importSource, [importName])
				}
			},
			[`ReturnStatement > JSXElement JSXAttribute > JSXExpressionContainer > CallExpression > Identifier[name=${wrapName}]`]:
				(node: TSESTree.Identifier) => {
					// keep the key param up to date
					if (node.parent?.type === AST_NODE_TYPES.CallExpression) {
						if (node.parent?.type === AST_NODE_TYPES.CallExpression) {
							let keyParamNode = node.parent.arguments[1]
							if (keyParamNode) {
								const keyParamText = context.getSourceCode().getText(keyParamNode)
								let keyValue = walkUpTillKeyAttribute(context, node)
								let _keyParamNode = keyParamNode
								if (keyValue) {
									if (keyValue !== keyParamText) {
										let _keyValue = keyValue
										context.report({
											node: _keyParamNode,
											messageId: 'updateKeyParam',
											fix(fixer) {
												return fixer.replaceText(_keyParamNode, _keyValue)
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

export const reactWrapJSXCallback = { rule, RULE_NAME }
