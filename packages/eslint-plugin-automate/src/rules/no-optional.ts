import { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils'
import type { Context } from '../utils/ast-utils'
import type { TSESTree, TSESLint } from '@typescript-eslint/utils'
import { isNodeTypeIncludesNullOrUndefined } from '../utils/ast-utils'

const createESLintRule = ESLintUtils.RuleCreator(() => ``)
const RULE_NAME = 'no-optional'
type Options = [
	{
		autofix?: boolean
		excludeComputedBefore?: boolean
	},
]
type MessageIds = 'message'

/**
 * TODO
 * try selector like [expression.object.name]
 * tests
 */

const rule = createESLintRule<Options, MessageIds>({
	name: RULE_NAME,
	meta: {
		fixable: 'code',
		type: 'problem',
		docs: {
			description: 'Disallow optional chaining if the variable type does not include undefined',

			requiresTypeChecking: true,
		},
		hasSuggestions: true,
		messages: {
			message: 'Optional chaining should only be used if the variable type includes undefined or null',
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					autofix: {
						type: 'boolean',
					},
					excludeComputedBefore: {
						type: 'boolean',
					},
				},
			},
		],
	},
	defaultOptions: [{}],
	create: (context) => {
		const { autofix = false, excludeComputedBefore = true } = context.options[0]

		return {
			'ChainExpression :expression[optional=true]': (node: TSESTree.Node) => {
				if (node.type === AST_NODE_TYPES.MemberExpression) {
					if (node.computed) {
						fixNode(context, node.object, 'computed', autofix)
					} else {
						if (excludeComputedBefore) {
							if (node.object.type === AST_NODE_TYPES.MemberExpression && node.object.computed) {
								return
							}
						}
						fixNode(context, node.object, 'member', autofix)
					}
				} else if (node.type === AST_NODE_TYPES.CallExpression) {
					fixNode(context, node.callee, 'call', autofix)
				}
			},
		}
	},
})

export const noOptional = { rule, RULE_NAME }

let fixNode = (context: Context, node: TSESTree.Node, expressionType: 'member' | 'call' | 'computed', autofix: boolean) => {
	if (!isNodeTypeIncludesNullOrUndefined(context, node)) {
		let fix: TSESLint.ReportFixFunction = (fixer) => {
			const rangeStart = node.range[1]
			const rangeEnd = expressionType === 'call' || expressionType === 'computed' ? rangeStart + 2 : rangeStart + 1

			return fixer.removeRange([rangeStart, rangeEnd])
		}

		context.report({
			node,
			messageId: 'message',
			...(autofix
				? { fix }
				: {
						suggest: [
							{
								messageId: 'message',
								fix,
							},
						],
				  }),
		})
	}
}
