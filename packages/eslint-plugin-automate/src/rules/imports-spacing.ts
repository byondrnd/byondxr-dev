import { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils'
import type { TSESTree } from '@typescript-eslint/utils'
import { getNLinesBetweenNodes } from '../utils/ast-utils'

const createESLintRule = ESLintUtils.RuleCreator(() => ``)
const RULE_NAME = 'imports-spacing'

type Options = []
type MessageIds = 'testMessage'

const rule = createESLintRule<Options, MessageIds>({
	name: RULE_NAME,
	meta: {
		type: 'problem',
		docs: {
			description: `codemode to replace svg with Icon`,
		},
		fixable: 'code',
		messages: {
			testMessage: `auto fix imports spacing`,
		},
		schema: [],
	},
	defaultOptions: [],
	create: (context) => {
		return {
			Program: (programNode: TSESTree.Program) => {
				let expressions = programNode.body
				let lastImportExpression: TSESTree.ImportDeclaration | TSESTree.TSImportEqualsDeclaration | undefined = undefined
				let index = -1
				for (let expression of expressions) {
					if (expression.type !== AST_NODE_TYPES.ImportDeclaration && expression.type !== AST_NODE_TYPES.TSImportEqualsDeclaration) {
						break
					}
					index++
					lastImportExpression = expression
				}
				let nextExpression = expressions[index + 1]

				if (lastImportExpression && nextExpression && getNLinesBetweenNodes(lastImportExpression, nextExpression) < 2) {
					let _lastImportExpression = lastImportExpression
					context.report({
						node: _lastImportExpression,
						messageId: 'testMessage',
						fix(fixer) {
							return fixer.insertTextAfter(_lastImportExpression, '\n')
						},
					})
				}

				let firstImport = programNode.body[0]

				if (firstImport?.type === AST_NODE_TYPES.ImportDeclaration || firstImport?.type === AST_NODE_TYPES.TSImportEqualsDeclaration) {
					let _firstImport = firstImport
					let text1 = context.getSourceCode().getText(firstImport, 2)
					let text2 = context.getSourceCode().getText(firstImport, 0)
					if (text1[0] !== text2[0] && text1[0] !== '\n') {
						context.report({
							node: _firstImport,
							messageId: 'testMessage',
							fix(fixer) {
								return fixer.insertTextBefore(_firstImport, '\n')
							},
						})
					}
				}
			},
		}
	},
})

export const importsSpacing = { rule, RULE_NAME }
