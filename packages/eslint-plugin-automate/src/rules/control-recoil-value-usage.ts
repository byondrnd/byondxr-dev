import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils'
import type { TSESTree } from '@typescript-eslint/utils'
import { isHookIdentifier, targetReactComponent, walkUpIsInJsx } from '../utils/ast-utils'

const createESLintRule = ESLintUtils.RuleCreator(() => ``)
const RULE_NAME = 'control-recoil-value-usage'
type Options = []
type MessageIds = 'not-legit-use' | 'raise-error' | 'select-more' | 'add-get-block'

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
			description: 'bun stuff in hooks',

			requiresTypeChecking: true,
		},
		hasSuggestions: true,
		messages: {
			'not-legit-use': 'useRecoilValue should not be used in hooks or components (only as a direct parameter to hook or in JSX), instead create a selector',
			'select-more': 'use selector to extract this property',
			'raise-error': 'contact lint rule creator',
			'add-get-block': 'auto add get block',
		},
		schema: [],
	},
	defaultOptions: [],
	create: (context) => {
		return {
			'[callee.name="useRecoilEffect"]': (node: TSESTree.CallExpression) => {
				let mainFunc: TSESTree.ArrowFunctionExpression | undefined
				let checkExpressions: TSESTree.Statement[] = []
				if (node.arguments[0]?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
					mainFunc = node.arguments[0]
					if (mainFunc.body?.type === AST_NODE_TYPES.BlockStatement) {
						let expressions = mainFunc.body.body
						for (let expression of expressions) {
							if (expression.type === AST_NODE_TYPES.ReturnStatement) {
								break
							}
							checkExpressions.push(expression)
						}
					}
				}

				let depsArgument: TSESTree.ArrayExpression | undefined
				if (node.arguments[1]?.type === AST_NODE_TYPES.ArrayExpression) {
					depsArgument = node.arguments[1]
				}

				let existingExpressions: TSESTree.Statement[] = []

				let getttersFunc: TSESTree.ArrowFunctionExpression | undefined

				if (node.arguments[2]?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
					getttersFunc = node.arguments[2]
					if (getttersFunc.body?.type === AST_NODE_TYPES.BlockStatement) {
						let expressions = getttersFunc.body.body
						for (let expression of expressions) {
							if (expression.type === AST_NODE_TYPES.ReturnStatement) {
								break
							}
							existingExpressions.push(expression)
						}
					}
				}

				let outputExpressionsStr = checkExpressions
					.map((e) => context.getSourceCode().getText(e))
					.filter((e) => e.includes('await getAsync') || e.includes('await getParamAsync') || e.includes('await getPrevAsync'))
					.join('\n')
				if (getttersFunc && mainFunc && outputExpressionsStr) {
					outputExpressionsStr = outputExpressionsStr
						.replace(new RegExp('await getAsync', 'g'), 'get')
						.replace(new RegExp('await getPrevAsync', 'g'), 'get')
						.replace(new RegExp('await getParamAsync(.*)(.*)', 'g'), 'get(get$1$2)')
						.trim()

					let existingExpressionsStr = existingExpressions
						.map((e) => context.getSourceCode().getText(e))
						.join('\n')
						.trim()
					const clean = (str: string) => {
						//remove brackets, remove spaces, remove new lines
						return str.replace(new RegExp(/[()\n\s\t]/, 'g'), '')
					}

					if (clean(outputExpressionsStr) !== clean(existingExpressionsStr)) {
						const replaceText = `({get})=>{\n${outputExpressionsStr}}`
						let _getttersFunc = getttersFunc
						context.report({
							node: node,
							messageId: 'add-get-block',
							fix(fixer) {
								return fixer.replaceText(_getttersFunc, replaceText)
							},
						})
					}
				}
			},
			...targetReactComponent((baseBlockNode, componentName) => {
				const isComponent = !!componentName?.componentName
				let expressions = baseBlockNode.body

				for (let expression of expressions) {
					if (expression.type === AST_NODE_TYPES.VariableDeclaration) {
						let variableDeclarator = expression.declarations[0]
						if (variableDeclarator?.type === AST_NODE_TYPES.VariableDeclarator) {
							let init = variableDeclarator.init
							if (init?.type === AST_NODE_TYPES.CallExpression) {
								if (init.callee.type === AST_NODE_TYPES.Identifier) {
									if (init.callee.name === 'useRecoilValue' || init.callee.name === 'useRecoilMemoValue') {
										let scopeManager = context.getSourceCode().scopeManager
										if (scopeManager) {
											let variables = scopeManager.getDeclaredVariables(expression)
											for (let variable of variables) {
												if (variable.scope?.type !== 'function') {
													continue
												}
												let lazyPropertyReports = new Map<TSESTree.Identifier, () => void>()
												let lazyReports = new Map<TSESTree.Identifier, () => void>()
												let varUsedInJSX = false
												let varUsedInHook = false
												for (let reference of variable.references.slice(1)) {
													let varUseId = reference.identifier
													if (varUseId.type !== AST_NODE_TYPES.Identifier) {
														continue
													}
													let inJSX = false
													let inJSXAttribute = false
													let inJSXAttributeFunction = false
													if (isComponent) {
														;({ inJSXAttribute, inJSX, inJSXAttributeFunction } = walkUpIsInJsx(varUseId, baseBlockNode))
													}
													let varUseIdMemberExpression = varUseId.parent
													if (varUseIdMemberExpression?.type === AST_NODE_TYPES.MemberExpression) {
														if (
															!(
																(inJSX &&
																	varUseIdMemberExpression.property.type === AST_NODE_TYPES.Identifier &&
																	['map', 'length'].includes(varUseIdMemberExpression.property.name)) ||
																(inJSXAttribute && !inJSXAttributeFunction)
															)
														) {
															let _varUseIdMemberExpression = varUseIdMemberExpression
															lazyPropertyReports.set(varUseId, () => {
																context.report({
																	node: _varUseIdMemberExpression.property,
																	messageId: 'select-more',
																})
															})
														}
													}
													if (inJSX) {
														if (inJSXAttributeFunction) {
															lazyPropertyReports.set(varUseId, () => {
																context.report({
																	node: varUseId,
																	messageId: 'not-legit-use',
																})
															})
														} else {
															varUsedInJSX = true
														}
														continue
													}
													let fnName = ''
													let callExpressionNode: TSESTree.CallExpression | undefined

													if (varUseId.parent?.type === AST_NODE_TYPES.BinaryExpression) {
														let upOne = varUseId.parent
														if (upOne.parent?.type === AST_NODE_TYPES.IfStatement) {
															let upTwo = upOne.parent
															if (upTwo.consequent.type === AST_NODE_TYPES.BlockStatement) {
																if (upTwo.consequent.body[0]?.type === AST_NODE_TYPES.ReturnStatement) {
																	let argument = upTwo.consequent.body[0].argument
																	if (argument?.type === AST_NODE_TYPES.Literal) {
																		if (argument.value === null) {
																			continue
																		}
																	}
																}
															}
														}
													} else if (varUseId.parent?.type === AST_NODE_TYPES.IfStatement) {
														let upOne = varUseId.parent
														if (upOne.consequent.type === AST_NODE_TYPES.BlockStatement) {
															if (upOne.consequent.body[0]?.type === AST_NODE_TYPES.ReturnStatement) {
																let argument = upOne.consequent.body[0].argument
																if (argument?.type === AST_NODE_TYPES.Literal) {
																	if (argument.value === null) {
																		continue
																	}
																}
															}
														}
													} else if (varUseId.parent?.type === AST_NODE_TYPES.ConditionalExpression) {
														if (varUseId.parent.parent?.type === AST_NODE_TYPES.Property) {
															if (varUseId.parent.parent.parent?.type === AST_NODE_TYPES.ObjectExpression) {
																let _callExpressionNode = varUseId.parent.parent.parent.parent
																if (_callExpressionNode?.type === AST_NODE_TYPES.CallExpression) {
																	callExpressionNode = _callExpressionNode
																}
															}
														}
													} else if (varUseId.parent?.type === AST_NODE_TYPES.UnaryExpression) {
														if (varUseId.parent.parent?.type === AST_NODE_TYPES.CallExpression) {
															callExpressionNode = varUseId.parent.parent
														} else if (varUseId.parent.parent?.type === AST_NODE_TYPES.UnaryExpression) {
															let _callExpressionNode = varUseId.parent.parent.parent
															if (_callExpressionNode?.type === AST_NODE_TYPES.CallExpression) {
																callExpressionNode = _callExpressionNode
															}
														}
													} else if (varUseId.parent?.type === AST_NODE_TYPES.Property) {
														if (varUseId.parent.parent?.type === AST_NODE_TYPES.ObjectExpression) {
															let _callExpressionNode = varUseId.parent.parent.parent
															if (_callExpressionNode?.type === AST_NODE_TYPES.CallExpression) {
																callExpressionNode = _callExpressionNode
															}
														}
													}
													// case: useHook(getSomeValue())
													else if (varUseId.parent?.type === AST_NODE_TYPES.CallExpression && varUseId.parent.callee === varUseId) {
														let _callExpressionNode = varUseId.parent.parent
														if (_callExpressionNode?.type === AST_NODE_TYPES.CallExpression) {
															callExpressionNode = _callExpressionNode
														}
													} else if (varUseId.parent?.type === AST_NODE_TYPES.CallExpression) {
														callExpressionNode = varUseId.parent
													}
													if (callExpressionNode) {
														if (callExpressionNode.callee.type === AST_NODE_TYPES.Identifier) {
															fnName = callExpressionNode.callee.name
														}
														if (callExpressionNode.callee.type === AST_NODE_TYPES.MemberExpression) {
															if (callExpressionNode.callee.property.type === AST_NODE_TYPES.Identifier) {
																fnName = callExpressionNode.callee.property.name
															}
														}
													}

													if (fnName) {
														// if (isHookIdentifier(fnName) || fnName === 'get') {
														if (isHookIdentifier(fnName)) {
															varUsedInHook = true
															continue
														}
													}
													lazyReports.set(varUseId, () => {
														context.report({
															node: varUseId,
															messageId: 'not-legit-use',
														})
													})
												}
												if (!varUsedInJSX && !varUsedInHook) {
													for (let [node, lazyReport] of lazyReports) {
														lazyReport()
													}
													for (let [node, lazyPropertyReport] of lazyPropertyReports) {
														lazyPropertyReport()
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}),
		}
	},
})

export const controlRecoilValueUsage = { rule, RULE_NAME }
