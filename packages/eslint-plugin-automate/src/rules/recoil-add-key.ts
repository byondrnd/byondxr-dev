import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils'
import type { Context } from '../utils/ast-utils'
import type { TSESTree } from '@typescript-eslint/utils'
import { getHostFunctionScopeName, LINT_COMMENT_PREFIX, SELECTOR_LOCAL_FUNCTION_DEPENDECY_COMMENT, SELECTOR_LOCAL_REF_DEPENDECY_COMMENT } from '../utils/ast-utils'
import { extractFilename } from '../utils/general-utils'

const createESLintRule = ESLintUtils.RuleCreator(() => ``)
const RULE_NAME = 'recoil-add-key'
type Options = []
type MessageIds = 'add-key' | 'update-key' | 'wrong-key' | 'remove lint comment'

/**
 * TODO
 * try selector like [expression.object.name]
 * tests
 */

const checkInDeclarator = (context: Context, declaratorNode: TSESTree.VariableDeclarator) => {
	let varName = ''
	if (declaratorNode.id?.type === AST_NODE_TYPES.Identifier) {
		varName = declaratorNode.id.name
	} else if (declaratorNode.id?.type === AST_NODE_TYPES.ArrayPattern) {
		if (declaratorNode.id.elements[0]?.type === AST_NODE_TYPES.Identifier) {
			if (declaratorNode.id.elements[0].name.endsWith('Atom') || declaratorNode.id.elements[0].name.endsWith('Selector')) {
				varName = declaratorNode.id.elements[0].name
			}
		}
	} else if (declaratorNode.id?.type === AST_NODE_TYPES.ObjectPattern) {
		varName = `${context.getSourceCode().getText(declaratorNode.id)}`
	}
	return varName
}
const callingMember = (memberNode: TSESTree.MemberExpression) => {
	let varName = ''
	if (memberNode.property.type === AST_NODE_TYPES.Identifier) {
		varName = memberNode.property.name
	}
	return varName
}
const callingProperty = (memberNode: TSESTree.Property) => {
	let varName = ''
	let propertyKey = ''
	let objectKey = ''
	if (memberNode.parent?.type === AST_NODE_TYPES.ObjectExpression) {
		if (memberNode.parent.parent?.type === AST_NODE_TYPES.ReturnStatement) {
			objectKey = 'return_object'
		} else if (memberNode.parent.parent?.type === AST_NODE_TYPES.VariableDeclarator) {
			if (memberNode.parent.parent.id.type === AST_NODE_TYPES.Identifier) {
				objectKey = memberNode.parent.parent.id.name
			}
		}
		if (memberNode.key.type === AST_NODE_TYPES.Identifier) {
			propertyKey = memberNode.key.name
		}
		if (objectKey && propertyKey) {
			varName = `${objectKey}.${propertyKey}`
		}
	}
	return varName
}

const rule = createESLintRule<Options, MessageIds>({
	name: RULE_NAME,
	meta: {
		fixable: 'code',
		type: 'problem',
		docs: {
			description: 'bun stuff in hooks',

			requiresTypeChecking: true,
		},
		hasSuggestions: true,
		messages: {
			'add-key': 'auto add key',
			'update-key': 'auto update-key',
			'wrong-key': 'wrong key - probably missing the variable name, change to useRecoilMemoValue if cascading, otherwise report to lint maintainer',
			'remove lint comment': 'remove lint comment',
		},
		schema: [],
	},
	defaultOptions: [],
	create: (context) => {
		const getNewKey = (callNode: TSESTree.CallExpression) => {
			let filename = extractFilename(context.getFilename())
			let { _name: functionHostName, arrowFnNode } = getHostFunctionScopeName(context, callNode)
			let varName = ''
			let flaky = false
			if (callNode.parent?.type === AST_NODE_TYPES.VariableDeclarator) {
				varName = checkInDeclarator(context, callNode.parent)
			} else if (callNode.parent?.type === AST_NODE_TYPES.CallExpression) {
				if (callNode.parent.callee.type === AST_NODE_TYPES.Identifier) {
					if (callNode.parent.callee.name === 'useRecoilValue') {
						let maybeDeclaratorNode = callNode.parent.parent
						if (maybeDeclaratorNode?.type === AST_NODE_TYPES.VariableDeclarator) {
							varName = checkInDeclarator(context, maybeDeclaratorNode)
						} else if (maybeDeclaratorNode?.type === AST_NODE_TYPES.CallExpression) {
							if (maybeDeclaratorNode.callee.type === AST_NODE_TYPES.Identifier) {
								flaky = true
								varName = maybeDeclaratorNode.callee.name
							} else if (maybeDeclaratorNode.callee.type === AST_NODE_TYPES.MemberExpression) {
								flaky = true
								varName = callingMember(maybeDeclaratorNode.callee)
							}
						}
					} else {
						flaky = true
						varName = callNode.parent.callee.name
					}
				} else if (callNode.parent.callee.type === AST_NODE_TYPES.MemberExpression) {
					flaky = true
					varName = callingMember(callNode.parent.callee)
				}
			} else if (callNode.parent?.type === AST_NODE_TYPES.Property) {
				varName = callingProperty(callNode.parent)
			} else if (callNode.parent?.type === AST_NODE_TYPES.ReturnStatement) {
				varName = 'return_statement'
			}
			varName = varName.replace(/(.*)Selector/, '$1') // replace last occurence

			let lineNumber = ''
			if (!varName || flaky) {
				if (callNode.callee.type === AST_NODE_TYPES.Identifier) {
					const hostFnText = arrowFnNode ? context.getSourceCode().getText(arrowFnNode) : ''
					if (hostFnText.split(`${callNode.callee.name}(`).length - 1 > 1) {
						lineNumber = `:${callNode.loc.start.line}`
					}
				}
			}
			let out = `${filename}:${functionHostName}:${varName || '-'}${lineNumber}`

			const checkLocalDependencies = () => {
				let callText = context.getSourceCode().getText(callNode)
				let phrases = [SELECTOR_LOCAL_FUNCTION_DEPENDECY_COMMENT, SELECTOR_LOCAL_REF_DEPENDECY_COMMENT]
				let isLocalResult = false
				let allResultReg = RegExp(`(?<comment>// ${LINT_COMMENT_PREFIX}.*)\n(?<code>.*\n)`, 'dg')
				type Vars0 = {
					groups:
						| {
								comment: string | undefined
								code: string | undefined
						  }
						| undefined
					indices:
						| {
								0: [number, number] | undefined
								groups:
									| {
											comment: [number, number] | undefined
											code: [number, number] | undefined
									  }
									| undefined
						  }
						| undefined
				} | null

				let vars0: Vars0

				while ((vars0 = allResultReg.exec(callText) as Vars0) !== null) {
					const { comment, code } = vars0?.groups || {}
					const { comment: commentIndex, code: codeIndex } = vars0?.indices?.groups || {}

					if (comment && code && commentIndex && codeIndex) {
						let result = RegExp(`(?<variable>[\\w.]*)\\s-\\s((${phrases.join(')|(')}))`, 'dg')

						type Vars = {
							groups:
								| {
										variable: string | undefined
								  }
								| undefined
							indices:
								| {
										0: [number, number] | undefined
										groups:
											| {
													variable: [number, number] | undefined
											  }
											| undefined
								  }
								| undefined
						} | null
						let vars: Vars

						let removeLintComment = false
						while ((vars = result.exec(comment) as Vars) !== null) {
							let variable = vars?.groups?.variable
							let variableIndex = vars?.indices?.groups?.variable
							if (variable && variableIndex) {
								if (RegExp(`\\W${variable}\\W`).test(code)) {
									isLocalResult = true
								} else {
									removeLintComment = true
								}
							}
						}
						const commentLoc = context.getSourceCode().getLocFromIndex(callNode.range[0] + commentIndex[0])
						if (removeLintComment) {
							context.report({
								loc: commentLoc,
								messageId: 'remove lint comment',
								fix: (fixer) => {
									return fixer.replaceTextRange([callNode.range[0] + commentIndex[0], callNode.range[0] + commentIndex[1]], '')
								},
							})
						}
					}
				}

				return isLocalResult
			}

			if (checkLocalDependencies()) {
				out += ' (local)'
			}
			return out
		}

		return {
			'CallExpression[callee.name=/useRecoilMemoSelector|useRecoilMemoParamSelector|useRecoilEffect|useRecoilLocalAtom|useMaybeAtom|useRecoilMemoValue/]': (
				callNode: TSESTree.CallExpression
			) => {
				let lastArgument = callNode.arguments[callNode.arguments.length - 1]
				let nArguments = callNode.arguments.length
				if (lastArgument) {
					let _lastArgument = lastArgument

					if (nArguments >= 2 && lastArgument.type === AST_NODE_TYPES.Literal) {
						let newKey = getNewKey(callNode)
						let wrongKey = false
						let theKeyUniqueDefined = /^.+:.+:[^-].*$/.test(newKey)
						if (!theKeyUniqueDefined) {
							if (callNode.callee.type === AST_NODE_TYPES.Identifier) {
								if (['useRecoilMemoSelector', 'useRecoilMemoParamSelector', 'useMaybeAtom', 'useRecoilMemoValue'].includes(callNode.callee.name)) {
									wrongKey = true
									context.report({
										node: _lastArgument,
										messageId: 'wrong-key',
									})
								}
							}
						}

						if (!wrongKey && lastArgument.value !== newKey) {
							context.report({
								node: callNode,
								messageId: 'update-key',
								fix: (fixer) => {
									return fixer.replaceText(_lastArgument, `'${newKey}'`)
								},
							})
						}
					} else {
						let newKey = getNewKey(callNode)
						context.report({
							node: callNode,
							messageId: 'add-key',
							fix: (fixer) => {
								return fixer.insertTextAfter(_lastArgument, `,'${newKey}'`)
							},
						})
					}
				}
			},
		}
	},
})

export const recoilAddKey = { rule, RULE_NAME }
