import { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils'
import type { Context } from '../utils/ast-utils'
import type { TSESTree } from '@typescript-eslint/utils'
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema'
import { dataComponentExcludes, dataComponentImportSourceExcludesRegex } from '../data/data-component-excludes'
import {
	getNextProgramExpression,
	isSimpleSVGComponent,
	targetReactComponent,
	isNodeTypeIncludesObjectOrArray,
	isChildrenInProps,
	getNLinesBetweenNodes,
	checkHookCall,
	isDependent,
	isUsed,
} from '../utils/ast-utils'
import { ImportUtils, getImportSource } from '../utils/import-utils'

const createESLintRule = ESLintUtils.RuleCreator(() => ``)
const RULE_NAME = 'react-wrap'

type WrapObject = {
	wrapName: string
	importSource?: string
	replaces?: string
}
type Options = [
	{
		emptyLineBeforeReturn?: boolean
		addDataComponent?: boolean
		banDisableDepsEslint?: string

		wrapHandler?: WrapObject
		wrapMemo?: WrapObject
		wrapUseMemo?: WrapObject
	},
]
type MessageIds =
	| 'testMessage'
	| 'banDisableDepsEslint'
	| 'addImport'
	| 'wrapWithMemo'
	| 'removeWrapWithMemo'
	| 'updateWrapWithMemo'
	| 'remove-use-handler'
	| 'remove-r'
	| 'remove-useInlineHandler'
	| 'must-be-pure'

let wrapSchema: JSONSchema4 = {
	type: 'object',
	additionalProperties: false,
	properties: {
		wrapName: {
			type: 'string',
		},
		importSource: {
			type: 'string',
		},
		replaces: {
			type: 'string',
		},
	},
	required: ['wrapName'],
}
const rule = createESLintRule<Options, MessageIds>({
	name: RULE_NAME,
	meta: {
		type: 'problem',
		docs: {
			description: `Wrap all functions inside a functional React component with useHandler`,
		},
		fixable: 'code',
		messages: {
			addImport: `import react wrap`,
			'must-be-pure': `must be pure`,
			testMessage: `auto fixed`,
			wrapWithMemo: `wrap with memo`,
			removeWrapWithMemo: `remove wrap with memo`,
			updateWrapWithMemo: `update update with memo`,
			banDisableDepsEslint: `banDisableDepsEslint`,
			'remove-use-handler': 'auto remove use-handler - it is no dependent on scope vars',
			'remove-r': 'auto remove r - it is no dependent on scope vars',
			'remove-useInlineHandler': 'auto remove useInlineHandler - it is not used',
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					emptyLineBeforeReturn: {
						type: 'boolean',
					},
					banDisableDepsEslint: {
						type: 'string',
					},
					addDataComponent: {
						type: 'boolean',
					},
					wrapHandler: wrapSchema,
					wrapMemo: wrapSchema,
					wrapUseMemo: wrapSchema,
				},
			},
		],
	},
	defaultOptions: [{}],
	create: (context) => {
		const { wrapHandler, wrapMemo, wrapUseMemo, emptyLineBeforeReturn, addDataComponent, banDisableDepsEslint } =
			context.options[0]

		const importUtils = new ImportUtils(context)

		return {
			...importUtils.updateImports('addImport'),
			'CallExpression[callee.name=/useRecoilValue|useRecoilSelector/] > ArrowFunctionExpression'(
				node: TSESTree.ArrowFunctionExpression
			) {
				if (isDependent(context, node)) {
					if (node.parent) {
						let nodeParent = node.parent
						context.report({
							node: nodeParent,
							messageId: 'must-be-pure',
						})
					}
				}
			},
			// temporal remove key
			// 'CallExpression[callee.name=/useRecoilSelector/] > Literal'(node: TSESTree.Literal) {
			// 	context.report({
			// 		node: node,
			// 		messageId: 'remove-use-handler',
			// 		fix(fixer) {
			// 			return fixer.replaceTextRange([node.range[0] - 1, node.range[1]], '')
			// 		},
			// 	})
			// },
			// 'CallExpression[callee.name="useHandler"] > ArrowFunctionExpression'(node: TSESTree.ArrowFunctionExpression) {
			// 	if (!isDependent(context, node)) {
			// 		if (node.parent) {
			// 			let nodeParent = node.parent
			// 			context.report({
			// 				node: nodeParent,
			// 				messageId: 'remove-use-handler',
			// 				fix(fixer) {
			// 					return fixer.replaceText(nodeParent, context.getSourceCode().getText(node))
			// 				},
			// 			})
			// 		}
			// 	}
			// },
			// 'JSXExpressionContainer > CallExpression[callee.name="r"] > ArrowFunctionExpression'(node: TSESTree.ArrowFunctionExpression) {
			// 	if (!isDependent(context, node)) {
			// 		if (node.parent) {
			// 			let nodeParent = node.parent
			// 			context.report({
			// 				node: nodeParent,
			// 				messageId: 'remove-r',
			// 				fix(fixer) {
			// 					return fixer.replaceText(nodeParent, context.getSourceCode().getText(node))
			// 				},
			// 			})
			// 		}
			// 	}
			// },
			// 'JSXElement > JSXExpressionContainer > CallExpression[callee.name="r"] > ArrowFunctionExpression'(node: TSESTree.ArrowFunctionExpression) {
			// 	if (node.parent) {
			// 		let nodeParent = node.parent
			// 		context.report({
			// 			node: nodeParent,
			// 			messageId: 'remove-r',
			// 			fix(fixer) {
			// 				return fixer.replaceText(nodeParent, context.getSourceCode().getText(node))
			// 			},
			// 		})
			// 	}
			// },
			'CallExpression[callee.name="useInlineHandler"]'(node: TSESTree.CallExpression) {
				if (node.parent?.type === AST_NODE_TYPES.VariableDeclarator) {
					let varDeclaration = node.parent.parent
					if (varDeclaration?.type === AST_NODE_TYPES.VariableDeclaration) {
						let _varDeclaration = varDeclaration
						if (!isUsed(context, _varDeclaration)) {
							context.report({
								node: _varDeclaration,
								messageId: 'remove-r',
								fix(fixer) {
									return fixer.remove(_varDeclaration)
								},
							})
						}
					}
				}
			},
			...targetReactComponent((node, componentName) => {
				if (wrapHandler) {
					let isAdded = wrapWithHandler(context, node, wrapHandler)
					if (isAdded && wrapHandler.importSource) {
						importUtils.addImports(wrapHandler.importSource, [wrapHandler.wrapName])
					}
				}

				if (componentName?.componentName && wrapMemo) {
					let isAdded = wrapWithMemo(context, node, componentName.componentName, wrapMemo)
					if (isAdded && wrapMemo.importSource) {
						importUtils.addImports(wrapMemo.importSource, [wrapMemo.wrapName])
					}
				}

				if (wrapUseMemo) {
					let isAdded = wrapWithUseMemo(context, node, wrapUseMemo)
					if (isAdded && wrapUseMemo.importSource) {
						importUtils.addImports(wrapUseMemo.importSource, [wrapUseMemo.wrapName])
					}
				}

				if (componentName?.componentName && emptyLineBeforeReturn) {
					addEmptyLineBeforeReturn(context, node)
				}

				if (componentName?.componentName && addDataComponent) {
					addAttribute(
						context,
						'data-component',
						componentName.componentName,
						node,
						dataComponentExcludes,
						dataComponentImportSourceExcludesRegex
					)
				}
				if (banDisableDepsEslint) {
					applyBanDisableDepsEslint(context, node, banDisableDepsEslint)
				}
			}),
		}
	},
})

const applyBanDisableDepsEslint = (context: Context, node: TSESTree.BlockStatement, hooks: string) => {
	let expressions = node.body

	for (let expression of expressions) {
		if (expression.type === AST_NODE_TYPES.VariableDeclaration) {
			let variableDeclarator = expression.declarations[0]
			if (variableDeclarator?.type === AST_NODE_TYPES.VariableDeclarator) {
				let id = variableDeclarator.id
				if (id?.type === AST_NODE_TYPES.Identifier) {
					perExpressionApplyBanDisableDepsEslint(context, variableDeclarator.init, hooks)
				}
			}
		}
		if (expression.type === AST_NODE_TYPES.ExpressionStatement) {
			perExpressionApplyBanDisableDepsEslint(context, expression.expression, hooks)
		}
	}
}

const perExpressionApplyBanDisableDepsEslint = (
	context: Context,
	callExpression: TSESTree.Expression | null,
	hooks: string
) => {
	if (
		callExpression?.type === AST_NODE_TYPES.CallExpression &&
		callExpression.callee.type === AST_NODE_TYPES.Identifier &&
		RegExp(hooks).test(callExpression.callee.name)
	) {
		let comments = context.getSourceCode().getCommentsInside(callExpression)
		let isDisabled = comments.some((comment) => {
			return RegExp(/eslint-disable.*?exhaustive-deps/).test(comment.value)
		})
		if (isDisabled) {
			context.report({
				node: callExpression,
				messageId: 'banDisableDepsEslint',
			})
		}
	}
}

const addEmptyLineBeforeReturn = (context: Context, node: TSESTree.BlockStatement) => {
	let expressions = node.body
	const returnNode = expressions[expressions.length - 1]
	const beforeReturnNode = expressions[expressions.length - 2]
	if (beforeReturnNode && returnNode?.type === AST_NODE_TYPES.ReturnStatement) {
		let nLinesBetween = getNLinesBetweenNodes(beforeReturnNode, returnNode)

		if (nLinesBetween < 2) {
			context.report({
				node,
				messageId: 'testMessage',
				fix(fixer) {
					return fixer.insertTextBefore(returnNode, '\n\t')
				},
			})
		}
	}
}

const addAttribute = (
	context: Context,
	attrName: string,
	attrValue: string,
	node: TSESTree.BlockStatement,
	jsxExcludes: string[],
	importSourceExcludesRegex: string
) => {
	let expressions = node.body
	const returnNode = expressions[expressions.length - 1]
	if (returnNode?.type === AST_NODE_TYPES.ReturnStatement) {
		const returnArgument = returnNode.argument
		if (returnArgument?.type === AST_NODE_TYPES.JSXElement) {
			const firstJsxElement = returnArgument
			const firstOpeningElement = returnArgument.openingElement
			const firstClosingElement = returnArgument.closingElement
			const firstElementChildren = returnArgument.children
			if (firstOpeningElement?.type === AST_NODE_TYPES.JSXOpeningElement) {
				let removeIfAttributeExistsAndExit = false
				if (firstOpeningElement.name.type === AST_NODE_TYPES.JSXIdentifier) {
					if (
						jsxExcludes.includes(firstOpeningElement.name.name) ||
						RegExp(importSourceExcludesRegex).test(
							getImportSource(context, firstOpeningElement.name.name) ?? ''
						)
					) {
						removeIfAttributeExistsAndExit = true
					}
				}
				const attribute = firstOpeningElement.attributes.find((attr) => {
					if (attr.type === AST_NODE_TYPES.JSXAttribute) {
						return attr.name.name === attrName
					}
					return false
				})

				if (removeIfAttributeExistsAndExit) {
					if (attribute) {
						context.report({
							node: firstOpeningElement,
							messageId: 'testMessage',
							fix(fixer) {
								return fixer.remove(attribute)
							},
						})
					}
					return
				}

				let attributeValueNode =
					(attribute?.type === AST_NODE_TYPES.JSXAttribute &&
						attribute.value?.type === AST_NODE_TYPES.Literal &&
						attribute.value) ||
					undefined
				if (attributeValueNode?.value === attrValue) {
					return
				}

				let firstOpeningElementName = context.getSourceCode().getText(firstOpeningElement.name)

				context.report({
					node: firstOpeningElement,
					messageId: 'testMessage',
					fix(fixer) {
						let source = context.getSourceCode().getText(firstJsxElement)
						let replacedAll = source.replace(RegExp(`${attrName}=["'].*?["']`, 'g'), '')
						let added = replacedAll.replace(
							RegExp(`${firstOpeningElementName}`),
							`${firstOpeningElementName} ${attrName}='${attrValue}'`
						)
						return fixer.replaceText(firstJsxElement, added)
					},
				})
			}
		}
	}
}

const wrapWithUseMemo = (context: Context, node: TSESTree.BlockStatement, { wrapName }: WrapObject) => {
	let expressions = node.body
	let isAdded = false

	for (let expression of expressions) {
		if (expression.type === AST_NODE_TYPES.VariableDeclaration) {
			let variableDeclarator = expression.declarations[0]
			if (variableDeclarator?.type === AST_NODE_TYPES.VariableDeclarator) {
				let id = variableDeclarator.id
				let init = variableDeclarator.init
				if (init) {
					if (
						(id?.type === AST_NODE_TYPES.Identifier && isNodeTypeIncludesObjectOrArray(context, id)) ||
						// case of destructuring
						id?.type === AST_NODE_TYPES.ObjectPattern
					) {
						let { hasHookCall, hasCall } = checkHookCall(init)
						// do not wrap hook calls nor simple assignments
						if (!hasHookCall && hasCall) {
							wrapWith(
								context,
								init,
								(nodeText) => `${wrapName}(() => {\n\t\treturn ${nodeText}\n\t}, [])`
							)
							isAdded = true
						}
					}
				}
			}
		}
	}

	return isAdded
}

// !RegExp(/\buse\w+?(?:<.+?>)?\(/).test(
// context.getSourceCode().getText(init)

/**
 * not wrap components declared using FunctionExpression
 * unwrap component with children props
 * unwrap svg components
 * add displayName to component
 */
const wrapWithMemo = (
	context: Context,
	node: TSESTree.BlockStatement,
	componentName: string,
	{ wrapName }: WrapObject
) => {
	let isAdded = false
	let isSvg = isSimpleSVGComponent(node)
	if (node.parent?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
		let arrowFunction = node.parent
		let isChildren = isChildrenInProps(context, arrowFunction)
		if (arrowFunction.parent?.type === AST_NODE_TYPES.VariableDeclarator) {
			if (!isChildren && !isSvg) {
				wrapWith(
					context,
					arrowFunction,
					(nodeText) => `${wrapName}(${nodeText})\n${componentName}.displayName = '${componentName}'`,
					'wrapWithMemo'
				)
				isAdded = true
			}
		} else if (arrowFunction.parent?.type === AST_NODE_TYPES.CallExpression) {
			let callExpression = arrowFunction.parent
			if (callExpression.callee.type === AST_NODE_TYPES.Identifier) {
				let identifier = callExpression.callee
				if (identifier.name === wrapName) {
					if (isChildren || isSvg) {
						removeCallIDentifier(context, callExpression, arrowFunction, 'wrapWithMemo')
					}

					// remove displayName
					let nextProgramExpression = getNextProgramExpression(context)
					if (nextProgramExpression?.type === AST_NODE_TYPES.ExpressionStatement) {
						let assignmentExpression = nextProgramExpression.expression
						if (assignmentExpression?.type === AST_NODE_TYPES.AssignmentExpression) {
							let left = assignmentExpression.left
							if (left?.type === AST_NODE_TYPES.MemberExpression) {
								let object = left.object
								let property = left.property
								if (
									object?.type === AST_NODE_TYPES.Identifier &&
									property?.type === AST_NODE_TYPES.Identifier
								) {
									if (property.name === 'displayName') {
										if (isChildren || isSvg) {
											let workNode = nextProgramExpression

											context.report({
												node: workNode,
												messageId: 'removeWrapWithMemo',
												fix(fixer) {
													return fixer.remove(workNode)
												},
											})
										} else {
											if (object.name !== componentName) {
												let workNode = object

												context.report({
													node: workNode,
													messageId: 'updateWrapWithMemo',
													fix(fixer) {
														return fixer.replaceText(workNode, componentName)
													},
												})
											}
											let right = assignmentExpression.right
											if (right?.type === AST_NODE_TYPES.Literal) {
												if (right.value !== componentName) {
													let workNode = right

													context.report({
														node: workNode,
														messageId: 'updateWrapWithMemo',
														fix(fixer) {
															return fixer.replaceText(workNode, `'${componentName}'`)
														},
													})
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
		}
	}

	return isAdded
}

const wrapWithHandler = (context: Context, node: TSESTree.BlockStatement, wrapHandler: WrapObject) => {
	let expressions = node.body
	let isAdded = false

	for (let expression of expressions) {
		if (expression.type === AST_NODE_TYPES.VariableDeclaration) {
			let variableDeclarator = expression.declarations[0]
			if (variableDeclarator?.type === AST_NODE_TYPES.VariableDeclarator) {
				let init = variableDeclarator.init
				if (init?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
					// if (!isDependent(context, init)) {
					// 	continue
					// }
					wrapWith(context, init, (nodeText) => `${wrapHandler.wrapName}(${nodeText})`)
					isAdded = true
				} else if (wrapHandler.replaces) {
					if (init?.type === AST_NODE_TYPES.CallExpression) {
						let callExpression = init
						if (callExpression.callee.type === AST_NODE_TYPES.Identifier) {
							let identifier = callExpression.callee
							let replaced = replaceCallIDentifier(
								context,
								identifier,
								wrapHandler.wrapName,
								wrapHandler.replaces
							)
							if (replaced) {
								isAdded = true
							}
						}
					}
				}
			}
		}
	}

	return isAdded
}

let wrapWith = (
	context: Context,
	workNode: TSESTree.Node,
	injectText: (nodeText: string) => string,
	messageId: MessageIds = 'testMessage'
) => {
	const nodeText = context.getSourceCode().getText(workNode)
	const replacementCode = `${injectText(nodeText)}`
	const functionStart = workNode.range[0]
	const functionEnd = workNode.range[1]

	context.report({
		node: workNode,
		messageId: messageId,
		fix(fixer) {
			return fixer.replaceTextRange([functionStart, functionEnd], replacementCode)
		},
	})
}

let replaceCallIDentifier = (
	context: Context,
	identifier: TSESTree.Identifier,
	wrapHandler: string,
	replaces?: string
) => {
	let workNode = identifier
	if (replaces) {
		if (!RegExp(replaces).test(workNode.name)) {
			return false
		}
	}
	if (identifier.name === wrapHandler) {
		return false
	}

	const replacementCode = wrapHandler
	const start = workNode.range[0]
	const end = workNode.range[1]

	context.report({
		node: workNode,
		messageId: 'testMessage',
		fix(fixer) {
			return fixer.replaceTextRange([start, end], replacementCode)
		},
	})
	return true
}
let removeCallIDentifier = (
	context: Context,
	callExpression: TSESTree.CallExpression,
	arrowFunctionExpression: TSESTree.ArrowFunctionExpression,
	messageId: MessageIds = 'testMessage'
) => {
	let workNode = callExpression
	const replacementCode = context.getSourceCode().getText(arrowFunctionExpression)
	const start = workNode.range[0]
	const end = workNode.range[1]

	context.report({
		node: workNode,
		messageId: messageId,
		fix(fixer) {
			return fixer.replaceTextRange([start, end], replacementCode)
		},
	})
}

export const reactWrap = { rule, RULE_NAME }
