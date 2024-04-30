import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils'
import * as tsutils from 'tsutils'
import * as ts from 'typescript'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'

export type Context = Readonly<TSESLint.RuleContext<string, readonly unknown[]>>

export const getChecker = (context: Context) => {
	const parserServices = ESLintUtils.getParserServices(context)
	const checker = parserServices.program.getTypeChecker()
	return { parserServices, checker }
}

export const getNodeType = (context: Context, node: TSESTree.Node) => {
	let { parserServices, checker } = getChecker(context)
	const originalNode = parserServices.esTreeNodeToTSNodeMap.get(node)
	return checker.getTypeAtLocation(originalNode)
}

export const getNextProgramExpression = (context: Context) => {
	let program = context.getAncestors()[0]
	let myExpression = context.getAncestors()[1]

	if (program?.type === AST_NODE_TYPES.Program) {
		let myIndex = program.body.findIndex((node) => node === myExpression)
		let nextIndex = myIndex + 1
		if (myIndex > -1 && nextIndex <= program.body.length - 1) {
			return program.body[nextIndex]
		}
	}
	return undefined
}

export const isChildrenInProps = (context: Context, arrowFunction: TSESTree.ArrowFunctionExpression) => {
	let paramNode = arrowFunction.params[0]
	if (!paramNode) {
		return false
	}

	let paramType = getNodeType(context, paramNode)
	return paramType.getProperties().find((prop) => prop.escapedName === 'children')
}

export const getNodeTypes = (context: Context, node: TSESTree.Node) => {
	let nodeType = getNodeType(context, node)
	return nodeType.isUnionOrIntersection() ? nodeType.types : [nodeType]
}

const doTypesIncludeNullOrUndefined = (types: ts.Type[]) => {
	return types.some((type) => {
		return type.flags & ts.TypeFlags.Null || type.flags & ts.TypeFlags.Undefined
	})
}

export const isNodeTypeIncludesNullOrUndefined = (context: Context, node: TSESTree.Node) => {
	let nodeTypes = getNodeTypes(context, node)
	return doTypesIncludeNullOrUndefined(nodeTypes)
}

export const isNodeTypeFunction = (nodeType: ts.Type) => {
	const regular =
		nodeType.getFlags() === ts.TypeFlags.Object &&
		(nodeType.getSymbol()?.members?.get(ts.InternalSymbolName.Call) !== undefined ||
			nodeType.getSymbol()?.escapedName === ts.InternalSymbolName.Function)

	return nodeType.getFlags() === ts.TypeFlags.Object && (regular || nodeType.getCallSignatures()[0])
}

export const isNodeTypeObjectOrArray = (nodeType: ts.Type) => {
	return tsutils.isTypeFlagSet(nodeType, ts.TypeFlags.Object) && !isNodeTypeFunction(nodeType)
}

const doTypesIncludeFunction = (types: ts.Type[]) => {
	return types.some((type) => {
		return isNodeTypeFunction(type)
	})
}
export const isNodeTypeIncludesFunction = (context: Context, node: TSESTree.Node) => {
	let nodeTypes = getNodeTypes(context, node)
	return doTypesIncludeFunction(nodeTypes)
}

export const isNodeTypeIncludesObjectOrArray = (context: Context, node: TSESTree.Node) => {
	const nodeType = getNodeType(context, node)
	const recursivefindIsObjectType = (type: ts.Type): boolean => {
		if (isNodeTypeObjectOrArray(type)) {
			return true
		}
		if (type.isUnionOrIntersection()) {
			return type.types.some((type) => recursivefindIsObjectType(type))
		}
		return false
	}

	return recursivefindIsObjectType(nodeType)
}

export const isHookIdentifier = (str: string): boolean => {
	return /^use[0-9A-Z$_]/.test(str)
}

type ComponentName = { componentName?: string; hookName?: string }
export const getReactComponentName = (node: TSESTree.BindingName | null): ComponentName | undefined => {
	if (node?.type === AST_NODE_TYPES.Identifier) {
		if (/^[A-Z]/.test(node.name)) {
			return { componentName: node.name }
		} else if (isHookIdentifier(node.name)) {
			return { hookName: node.name }
		}
	}
	return undefined
}

/**
 * @param fn - function to call for each react component
 */
export const targetReactComponent = (
	fn: (node: TSESTree.BlockStatement, componentName: ComponentName | undefined) => void
) => {
	return {
		'Program > VariableDeclaration > VariableDeclarator, Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator':
			(node: TSESTree.VariableDeclarator) => {
				let init = node.init
				if (init?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
					let name = getReactComponentName(node.id)
					if (name && init.body.type === AST_NODE_TYPES.BlockStatement) {
						fn(init.body, name)
					}
				} else if (init?.type === AST_NODE_TYPES.CallExpression) {
					let insideFunction = init.arguments?.[0]
					if (
						insideFunction?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
						insideFunction?.type === AST_NODE_TYPES.FunctionExpression
					) {
						let name = getReactComponentName(node.id)
						if (name && insideFunction.body?.type === AST_NODE_TYPES.BlockStatement) {
							fn(insideFunction.body, name)
						}
					}
				}
			},
		'Program > FunctionDeclaration, Program > ExportNamedDeclaration > FunctionDeclaration': (
			node: TSESTree.FunctionDeclaration
		) => {
			let name = getReactComponentName(node.id)
			if (name && node.body.type === AST_NODE_TYPES.BlockStatement) {
				fn(node.body, name)
			}
		},
	}
}

export const getNLinesBetweenNodes = (node1: TSESTree.Node, node2: TSESTree.Node) => {
	return node2.loc.start.line - node1.loc.end.line
}

export const isSimpleSVGComponent = (node: TSESTree.BlockStatement) => {
	let expressions = node.body
	if (expressions.length > 1) {
		return false
	}
	const returnNode = expressions[expressions.length - 1]
	if (returnNode?.type === AST_NODE_TYPES.ReturnStatement) {
		let { argument } = returnNode
		if (argument?.type === AST_NODE_TYPES.JSXElement) {
			let { openingElement } = argument
			if (openingElement?.type === AST_NODE_TYPES.JSXOpeningElement) {
				let { name } = openingElement
				if (name?.type === AST_NODE_TYPES.JSXIdentifier) {
					if (name.name === 'svg' || name.name === 'Icon') {
						return true
					}
				}
			}
		}
	}
	return false
}

export const walkUpTillReactComponentOrHook = (
	node: TSESTree.Node,
	blockStatement?: TSESTree.BlockStatement
): TSESTree.BlockStatement | undefined => {
	if (node.type === AST_NODE_TYPES.VariableDeclaration) {
		const declarator = node.declarations[0]
		if (declarator?.type === AST_NODE_TYPES.VariableDeclarator) {
			if (getReactComponentName(declarator.id)) {
				return blockStatement
			}
		}
	}
	if (node.parent) {
		if (node.type === AST_NODE_TYPES.BlockStatement) {
			return walkUpTillReactComponentOrHook(node.parent, node)
		}
		return walkUpTillReactComponentOrHook(node.parent, blockStatement)
	}
	return undefined
}

export const walkUpTillNodeType = <
	T extends (typeof AST_NODE_TYPES)[keyof typeof AST_NODE_TYPES],
	N extends Extract<TSESTree.Node, { type: T }>,
>(
	node: TSESTree.Node,
	targetNodeType: T
): N | undefined => {
	if (node.type === targetNodeType) {
		return node as N
	}
	if (node.parent) {
		return walkUpTillNodeType(node.parent, targetNodeType)
	}
	return undefined
}

export const getReactScopeVariables = (
	context: Context,
	node: TSESTree.Node
): TSESLint.Scope.Variable[] | undefined => {
	let baseBlockNode = walkUpTillReactComponentOrHook(node)
	let baseArrowNode = baseBlockNode?.parent
	if (baseArrowNode?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
		const scopeManager = context.getSourceCode().scopeManager
		if (scopeManager) {
			let scope = scopeManager.acquire(baseArrowNode)
			if (scope) {
				return scope.variables
			}
		}
	}
	return undefined
}

export const walkUpTillNextComponentLevelRange = (
	node: TSESTree.Node,
	candidateNodeBellowBlock?: TSESTree.Node,
	lastNodeBellowBlock?: TSESTree.Node
): [number, number] | undefined => {
	if (node.type === AST_NODE_TYPES.Program) {
		return undefined
	}
	if (node.type === AST_NODE_TYPES.VariableDeclaration) {
		const declarator = node.declarations[0]
		if (declarator?.type === AST_NODE_TYPES.VariableDeclarator) {
			if (getReactComponentName(declarator.id)) {
				if (lastNodeBellowBlock) {
					if (lastNodeBellowBlock?.type === AST_NODE_TYPES.BlockStatement) {
						let blockNode = lastNodeBellowBlock
						return [lastNodeBellowBlock.range[0] + 1, blockNode.range[0] + 2]
					} else {
						return [lastNodeBellowBlock.range[1] + 1, lastNodeBellowBlock.range[1] + 2]
					}
				}
			}
		}
	}
	if (node.parent) {
		if (node.type === AST_NODE_TYPES.BlockStatement) {
			// let candidateIndex = node.body.findIndex((expression) => expression === candidateNodeBellowBlock)
			// let nextExpression = candidateIndex > -1 && candidateIndex < node.body.length - 1 ? node.body[candidateIndex + 1] : node

			return walkUpTillNextComponentLevelRange(node.parent, candidateNodeBellowBlock, candidateNodeBellowBlock)
		} else if (!lastNodeBellowBlock && node.type === AST_NODE_TYPES.ArrowFunctionExpression) {
			// case of walking up from params
			if (node.body.type === AST_NODE_TYPES.BlockStatement) {
				return walkUpTillNextComponentLevelRange(node.parent, node.body, node.body)
			}
		}
		return walkUpTillNextComponentLevelRange(node.parent, node, lastNodeBellowBlock)
	}
	return undefined
}

export const getWrappingHook = <const T extends { [index in string]: index }>(
	node: TSESTree.ExpressionStatement,
	hooks: T
) => {
	let wrappingHookName: keyof typeof hooks | undefined
	let variableDeclaratorName = ''
	let hookCallNode = walkUpTillNodeType(node, AST_NODE_TYPES.CallExpression)
	let hookArrowNode: TSESTree.ArrowFunctionExpression | undefined
	if (hookCallNode?.callee.type === AST_NODE_TYPES.Identifier) {
		if (hookCallNode.arguments[0]?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
			hookArrowNode = hookCallNode.arguments[0]
		}
		let _hookName = hookCallNode.callee.name as keyof typeof hooks
		if (hooks[_hookName] === _hookName) {
			wrappingHookName = _hookName
			if (hookCallNode.parent?.type === AST_NODE_TYPES.VariableDeclarator) {
				if (hookCallNode.parent.id.type === AST_NODE_TYPES.Identifier) {
					variableDeclaratorName = hookCallNode.parent.id.name
				}
			}
		}
	}

	return wrappingHookName && hookArrowNode ? { hookArrowNode, wrappingHookName, variableDeclaratorName } : undefined
}

export const walkUpTillKeyAttribute = (context: Context, node: TSESTree.Node): string | undefined => {
	let jsxOpeningElement: TSESTree.JSXOpeningElement | undefined
	if (node.type === AST_NODE_TYPES.JSXOpeningElement) {
		jsxOpeningElement = node
	}
	if (node.type === AST_NODE_TYPES.JSXElement && node.openingElement) {
		jsxOpeningElement = node.openingElement
	}
	if (jsxOpeningElement) {
		const keyAttribute = jsxOpeningElement.attributes.find(
			(attribute) => attribute.type === AST_NODE_TYPES.JSXAttribute && attribute.name.name === 'key'
		)
		if (
			keyAttribute &&
			keyAttribute.type === AST_NODE_TYPES.JSXAttribute &&
			keyAttribute.value?.type === AST_NODE_TYPES.JSXExpressionContainer
		) {
			return context.getSourceCode().getText(keyAttribute.value.expression)
		}
	}
	if (node.type === AST_NODE_TYPES.ReturnStatement) {
		return undefined
	}
	if (node.parent) {
		return walkUpTillKeyAttribute(context, node.parent)
	}
	return undefined
}

const walkUpTillTopmostReturn = (node: TSESTree.Node): TSESTree.ReturnStatement | undefined => {
	if (node.type === AST_NODE_TYPES.ReturnStatement) {
		if (node.parent) {
			return walkUpTillTopmostReturn(node.parent) ?? node
		}
		return node
	}
	if (node.parent) {
		return walkUpTillTopmostReturn(node.parent)
	}
	return undefined
}

export const checkHookCall = (node: TSESTree.Node) => {
	let hasCall = false
	let hasHookCall = false
	const walk = (node: TSESTree.Node) => {
		if (!node) {
			return
		}
		if (node.type === AST_NODE_TYPES.Identifier) {
			return
		}
		if (node.type === AST_NODE_TYPES.CallExpression) {
			hasCall = true
			if (node.callee.type === AST_NODE_TYPES.Identifier) {
				hasHookCall = hasHookCall || isHookIdentifier(node.callee.name)
			} else if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
				if (node.callee.property.type === AST_NODE_TYPES.Identifier) {
					hasHookCall = hasHookCall || isHookIdentifier(node.callee.property.name)
				}
				walk(node.callee.object)
			}
		}
		if (node.type === AST_NODE_TYPES.MemberExpression) {
			walk(node.object)
		}
	}

	walk(node)
	return { hasCall, hasHookCall }
}

export const walkUpIsInJsx = (node: TSESTree.Node | undefined, endNode: TSESTree.BlockStatement) => {
	let inJSXAttribute = false
	let inJSX = false
	let underReturn = false
	let inJSXAttributeFunction = false
	let underFunction = false
	const walk = (node: TSESTree.Node | undefined): void => {
		if (!node || node === endNode) {
			if (underReturn) {
				inJSX = true
			}
			return
		}
		if (node.type === AST_NODE_TYPES.JSXAttribute) {
			inJSX = true
			inJSXAttribute = true
			if (underFunction) {
				inJSXAttributeFunction = true
			}
			return
		}
		if (node.type === AST_NODE_TYPES.ArrowFunctionExpression) {
			underFunction = true
		}
		if (node.type === AST_NODE_TYPES.JSXElement || node.type === AST_NODE_TYPES.JSXOpeningElement) {
			inJSX = true
			return
		}

		if (node === endNode.body.at(-1)) {
			underReturn = true
		}
		walk(node.parent)
	}
	walk(node)
	return { inJSXAttribute, inJSX, inJSXAttributeFunction }
}

export const getHostFunctionScopeName = (context: Context, node: TSESTree.Node) => {
	let arrowFnNode = walkUpTillNodeType(node, AST_NODE_TYPES.ArrowFunctionExpression)
	let _name = ''
	if (arrowFnNode) {
		if (arrowFnNode.parent?.type === AST_NODE_TYPES.VariableDeclarator) {
			if (arrowFnNode.parent.id?.type === AST_NODE_TYPES.Identifier) {
				_name = arrowFnNode.parent.id.name
			}
		} else if (arrowFnNode.parent?.type === AST_NODE_TYPES.CallExpression) {
			if (arrowFnNode.parent.parent?.type === AST_NODE_TYPES.VariableDeclarator) {
				if (arrowFnNode.parent.parent.id?.type === AST_NODE_TYPES.Identifier) {
					_name = arrowFnNode.parent.parent.id.name
				}
			}
		}
	}
	return { _name, arrowFnNode }
}

export const getDepReferences = (
	context: Context,
	node: TSESTree.ArrowFunctionExpression
): TSESLint.Scope.Reference[] => {
	const scopeManager = context.getSourceCode().scopeManager

	if (scopeManager) {
		let scope = scopeManager.acquire(node)

		if (scope) {
			let upperScope = scope.upper
			if (upperScope) {
				let variables = upperScope.variables
				return scope.through.filter((r) => variables.find((v) => v.name === r.identifier.name))
			}
		}
	}
	return []
}

export const isDependent = (context: Context, node: TSESTree.ArrowFunctionExpression) => {
	let depReferences = getDepReferences(context, node)
	if (depReferences.length === 0 || depReferences.every((r) => isNodeTypeIncludesFunction(context, r.identifier))) {
		return false
	}
	return true
}

export const isUsed = (context: Context, varDeclaration: TSESTree.VariableDeclaration) => {
	const scopeManager = context.getSourceCode().scopeManager

	if (scopeManager) {
		for (let variable of scopeManager.getDeclaredVariables(varDeclaration)) {
			if (variable.references.length <= 1) {
				return false
			}
		}
	}
	return true
}

export const getNextLineIndex = (context: Context, node: TSESTree.Node) => {
	return context.getSourceCode().getIndexFromLoc({
		line: node.loc.start.line + 1,
		column: 0,
	})
}

export const getPrevLineIndex = (context: Context, node: TSESTree.Node) => {
	return context.getSourceCode().getIndexFromLoc({
		line: node.loc.start.line - 1,
		column: 0,
	})
}
export const getCurrentLineIndex = (context: Context, node: TSESTree.Node) => {
	return context.getSourceCode().getIndexFromLoc({
		line: node.loc.start.line,
		column: 0,
	})
}

// export const getNextLineRange = (context: Context, node: TSESTree.Node) => {
// 	const nextLineIndex = getNextLineIndex(context, node)
// 	return [nextLineIndex - 1, nextLineIndex + 1] as const
// }

export const getPrevLineRange = (context: Context, node: TSESTree.Node) => {
	const startLineIndex = getCurrentLineIndex(context, node)
	const prevLineIndex = getPrevLineIndex(context, node)
	return [prevLineIndex, startLineIndex - 1] as const
}

export const getCurrentLineRange = (context: Context, node: TSESTree.Node) => {
	const startLineIndex = getCurrentLineIndex(context, node)
	const nextLineIndex = getNextLineIndex(context, node)

	return [startLineIndex, nextLineIndex - 1] as const
}

export const getNodeLineRange = (context: Context, node: TSESTree.Node) => {
	let nextLineIndex = getNextLineIndex(context, node)
	const startLineIndex = getCurrentLineIndex(context, node)
	return [startLineIndex - 1, nextLineIndex + 1] as const
}

export const LINT_COMMENT_PREFIX = '__lint__'
export const getUpdatedLintComment = (flag: string, existing = '') => {
	let processing = existing.replace(`// ${LINT_COMMENT_PREFIX}`, '')
	let groups = processing
		.split(';')
		.map((s) => s.trim())
		.filter((s) => s)

	if (!groups.includes(flag)) {
		groups.push(flag)
	}
	return `// ${LINT_COMMENT_PREFIX} ${groups.join('; ')}`
}

export const SELECTOR_LOCAL_FUNCTION_DEPENDECY_COMMENT = 'local selector function dependency'
export const SELECTOR_LOCAL_REF_DEPENDECY_COMMENT = 'local selector ref dependency'
