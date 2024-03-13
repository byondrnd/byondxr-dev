import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils'
import { toPairs } from 'remeda'
import { match, P } from 'ts-pattern'
import type { Context } from '../utils/ast-utils'
import type { TSESTree } from '@typescript-eslint/utils'
import {
	getDepReferences,
	getReactScopeVariables,
	getWrappingHook,
	walkUpTillNextComponentLevelRange,
} from '../utils/ast-utils'
import { listToEnum } from '../utils/general-utils'
import { ImportUtils } from '../utils/import-utils'

const createESLintRule = ESLintUtils.RuleCreator(() => ``)
const RULE_NAME = 'recoil-gen-template'
type Options = []
type MessageIds = 'addImport' | 'gen stage1' | 'gen stage2' | 'gen hook' | 'remove trigger' | 'gen selector getters'

/**
 * TODO
 * try selector like [expression.object.name]
 * tests
 */

const ADD = '+'
const TRIGGER = '_0'
const STAGE1 = '_1'
const STAGE2 = '_2'
const allHooks = listToEnum([
	'useRecoilLocalAtom',
	'useRecoilValue(atom)',
	'useRecoilValue(atom, (s) => s.property)',
	'useRecoilSelector',
	'useRecoilMemoSelector',
	'useRecoilMemoValue',
	'useRecoilMemoParamSelector',
	'useRecoilEffect',
	'useRecoilAsyncCallback',
	'useEffect',
] as const)
type AllHooks = keyof typeof allHooks

const noSelectorHooksList = toPairs
	.strict(allHooks)
	.filter(
		([k, v]) =>
			!(
				['useRecoilValue(atom)', 'useRecoilValue(atom, (s) => s.property)', 'useRecoilSelector'] as string[]
			).includes(k)
	)
	.map(([k, v]) => v)
const withSelectorHooksList = Object.entries(allHooks)
	.filter(([k, v]) => k !== allHooks['useEffect'] && k !== allHooks['useRecoilLocalAtom'])
	.map(([k, v]) => v)

let getAvailableSelectorsString = (
	context: Context,
	node: TSESTree.Node,
	wrappingHook?: ReturnType<typeof getWrappingHook<typeof allHooks>>
) => {
	let availableSelectors: string[] | undefined = undefined
	if (wrappingHook) {
		let depReferences = getDepReferences(context, wrappingHook.hookArrowNode)
			.map((v) => v.identifier.name)
			.filter((v) => v.endsWith('Selector') || v.endsWith('Atom'))
		availableSelectors = getReactScopeVariables(context, node)
			?.map((v) => v.name)
			.filter((v) => v.endsWith('Selector') || v.endsWith('Atom'))
			.filter((v) => v !== wrappingHook.variableDeclaratorName)
			.filter((v) => !depReferences.includes(v))
	} else {
		availableSelectors = getReactScopeVariables(context, node)
			?.map((v) => v.name)
			.filter((v) => v.endsWith('Selector') || v.endsWith('Atom'))
	}

	return availableSelectors ? `${STAGE2}(${availableSelectors.map((s) => `'${s}'`).join(',')})` : ''
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
			'gen stage1': 'gen stage1',
			'gen selector getters': 'gen selector getters',
			'gen stage2': 'gen stage2',
			'gen hook': 'gen hook',
			'remove trigger': 'remove trigger',
			addImport: 'add imports',
		},
		schema: [],
	},
	defaultOptions: [],
	create: (context) => {
		const importUtils = new ImportUtils(context)

		return {
			...importUtils.updateImports('addImport'),
			[`Identifier[name=/${TRIGGER}/]`]: (node: TSESTree.Identifier) => {
				let triggerString = node.name

				const getStage1String = (variable?: string) => {
					let includeVariable = variable ? `('${variable}')` : ''
					let _hooks = Object.keys(allHooks)
						.filter((s) =>
							variable
								? withSelectorHooksList.includes(s as AllHooks)
								: noSelectorHooksList.includes(s as AllHooks)
						)
						.map((s) => `'${s}'`)
						.join(',')
					return `\n\n${STAGE1}(${_hooks})${includeVariable}\n\n`
				}

				if (triggerString === TRIGGER) {
					// trigger on new line
					let expressionNode = node.parent
					if (expressionNode?.type === AST_NODE_TYPES.ExpressionStatement) {
						let _expressionNode = expressionNode
						const wrappingHook = getWrappingHook(expressionNode, allHooks)
						context.report({
							node: expressionNode,
							messageId: 'gen stage1',
							fix: (fixer) => {
								return fixer.replaceText(
									node,
									wrappingHook
										? getAvailableSelectorsString(context, _expressionNode, wrappingHook)
										: getStage1String()
								)
							},
						})
					}
				} else {
					// trigger in token
					let token = triggerString.replace(TRIGGER, '')

					if (/^(?!use[0-9A-Z]).*(Selector|Atom)$/.test(token)) {
						// trigger in selector

						let componentLevelNodeRange = walkUpTillNextComponentLevelRange(node)
						if (componentLevelNodeRange) {
							// generate stage1
							let _componentLevelNodeRange = componentLevelNodeRange
							context.report({
								node,
								messageId: 'gen stage1',
								fix: (fixer) => {
									let str = getStage1String(token)
									return fixer.insertTextAfterRange(_componentLevelNodeRange, str)
								},
							})
						}

						// remove the trigger
						context.report({
							node,
							messageId: 'remove trigger',
							fix: (fixer) => {
								return fixer.replaceTextRange([node.range[0], node.range[0] + node.name.length], token)
							},
						})
					} else if (token === 'useHandler') {
						if (node.parent?.type === AST_NODE_TYPES.CallExpression) {
							let arrowNode: TSESTree.ArrowFunctionExpression | undefined
							if (node.parent.arguments[0]?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
								arrowNode = node.parent.arguments[0]
								let _arrowNode = arrowNode
								let _callbackNode = node.parent

								context.report({
									node: _callbackNode,
									messageId: 'gen hook',
									fix: (fixer) => {
										let arrowText = context.getSourceCode().getText(_arrowNode)
										return fixer.replaceText(
											_callbackNode,
											`useRecoilAsyncCallback(({ asyncGet }) => async ${arrowText.replace(
												/^async /,
												''
											)})`
										)
									},
								})
							}
						}
					} else if (token === 'useRecoilAsyncCallback') {
						if (node.parent?.type === AST_NODE_TYPES.CallExpression) {
							let arrowNode: TSESTree.ArrowFunctionExpression | undefined
							if (node.parent.arguments[0]?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
								if (node.parent.arguments[0].body?.type === AST_NODE_TYPES.ArrowFunctionExpression) {
									arrowNode = node.parent.arguments[0].body
									let _arrowNode = arrowNode
									let _callbackNode = node.parent

									context.report({
										node: _callbackNode,
										messageId: 'gen hook',
										fix: (fixer) => {
											let arrowText = context.getSourceCode().getText(_arrowNode)
											return fixer.replaceText(
												_callbackNode,
												`useHandler(${arrowText.replace(/^async /, '')})`
											)
										},
									})
								}
							}
						}
					}
				}
			},
			[`CallExpression[callee.name=${STAGE1}]`]: (callNode: TSESTree.CallExpression) => {
				let hookChoice: AllHooks | undefined
				let selectorChoice = ''

				for (let argument of callNode.arguments) {
					if (argument.type === AST_NODE_TYPES.Literal) {
						if (typeof argument.value === 'string') {
							if (argument.value.includes(TRIGGER)) {
								let _hookChoice = argument.value.replace(TRIGGER, '') as AllHooks
								if (allHooks[_hookChoice] === _hookChoice) {
									hookChoice = _hookChoice
								}
							}
						}
					}
				}

				let expressionNode: TSESTree.ExpressionStatement | undefined
				if (callNode.parent?.type === AST_NODE_TYPES.ExpressionStatement) {
					expressionNode = callNode.parent
				} else if (callNode.parent?.type === AST_NODE_TYPES.CallExpression) {
					if (callNode.parent.parent?.type === AST_NODE_TYPES.ExpressionStatement) {
						expressionNode = callNode.parent.parent
					}
					let literal = callNode.parent.arguments[0]
					if (literal?.type === AST_NODE_TYPES.Literal) {
						if (typeof literal.value === 'string') {
							selectorChoice = literal.value
						}
					}
				}

				if (expressionNode && hookChoice) {
					let availableSelectorsStr = selectorChoice
						? ''
						: getAvailableSelectorsString(context, expressionNode)
					let value = selectorChoice.replace('Selector', '').replace('Atom', '')

					let str = match(hookChoice)
						.returnType<string>()
						.with('useRecoilValue(atom)', () => {
							if (selectorChoice) {
								importUtils.addImports('recoil', ['useRecoilValue'])
								return `const ${value} = useRecoilValue(${selectorChoice})`
							} else {
								return ''
							}
						})
						.with(
							P.union('useRecoilMemoSelector', 'useRecoilMemoValue', 'useRecoilMemoParamSelector'),
							(hook) => {
								importUtils.addImports('@byondxr/recoil-utils', [hook])
								let selectorLine = selectorChoice
									? `const ${value} = get(${selectorChoice})`
									: availableSelectorsStr
								let param = hook === 'useRecoilMemoParamSelector' ? '()=>' : ''
								return `
							 const valueSelector = ${hook}(${param}({get})=>{
							 	${selectorLine}
							 	return undefined
							 },[])
							 `
							}
						)
						.with('useRecoilSelector', (hook) => {
							if (selectorChoice) {
								importUtils.addImports('@byondxr/recoil-utils', [hook])
								return `
							        const valueSelector = useRecoilSelector(${selectorChoice}, (s)=>s)
							    `
							} else {
								return ''
							}
						})
						.with('useRecoilValue(atom, (s) => s.property)', () => {
							if (selectorChoice) {
								importUtils.addImports('@byondxr/recoil-utils', ['useRecoilValue'])
								return `
							        const ${value} = useRecoilValue(${selectorChoice}, (s)=>s)
							    `
							} else {
								return ''
							}
						})
						.with('useRecoilEffect', (hook) => {
							importUtils.addImports('@byondxr/recoil-utils', [hook])
							let selectorLine = selectorChoice
								? `const ${selectorChoice
										?.replace('Selector', '')
										.replace('Atom', '')} = await getAsync(${selectorChoice})`
								: availableSelectorsStr
							return `
							 useRecoilEffect(async ({getAsync})=>{
							 	${selectorLine}
								 },[],({get})=>{

							 })
						 `
						})
						.with('useRecoilAsyncCallback', (hook) => {
							importUtils.addImports('@byondxr/recoil-utils', [hook])
							let selectorLine = selectorChoice
								? `const ${selectorChoice
										?.replace('Selector', '')
										.replace('Atom', '')} = await asyncGet(${selectorChoice})`
								: availableSelectorsStr
							console.log({ selectorLine, selectorChoice })
							return `
							 const callback = useRecoilAsyncCallback( ({ asyncGet })=> async ()=>{
							 	${selectorLine}
								 })
						 `
						})
						.with('useEffect', (hook) => {
							importUtils.addImports('react', [hook])
							return `
							 useEffect(()=>{
							 	//
							 },[])
						 `
						})
						.with('useRecoilLocalAtom', (hook) => {
							importUtils.addImports('@byondxr/recoil-utils', [hook])
							return `
								const [replaceAtom, setReplaceAtom] = useRecoilLocalAtom('')
							`
						})
						.exhaustive()

					let _expressionNode = expressionNode
					context.report({
						node: expressionNode,
						messageId: 'gen hook',
						fix: (fixer) => {
							return fixer.replaceText(_expressionNode, `\n${str}`)
						},
					})
				}
			},
			[`ExpressionStatement[expression.callee.name=${STAGE2}]`]: (node: TSESTree.ExpressionStatement) => {
				let selectorChoices: string[] = []
				let triggerFound = false
				let wrappingHookName: undefined | keyof typeof allHooks

				let callNode = node.expression
				if (callNode.type === AST_NODE_TYPES.CallExpression) {
					for (let argument of callNode.arguments) {
						if (argument.type === AST_NODE_TYPES.Literal) {
							if (typeof argument.value === 'string') {
								if (argument.value.includes(TRIGGER)) {
									selectorChoices.push(argument.value.replace(TRIGGER, '').replace(ADD, ''))
									triggerFound = true
								} else if (argument.value.includes(ADD)) {
									selectorChoices.push(argument.value.replace(ADD, ''))
								}
							}
						}
					}

					if (triggerFound) {
						if (selectorChoices.length > 0) {
							let wrappingHook = getWrappingHook(node, allHooks)
							if (wrappingHook) {
								wrappingHookName = wrappingHook.wrappingHookName
							}
						}
					}
				}

				if (wrappingHookName) {
					let lines: string[] = []
					for (let selectorChoice of selectorChoices) {
						let cleanedSelectorChoice = selectorChoice.replace('Selector', '').replace('Atom', '')
						let str = match(wrappingHookName)
							.returnType<string>()
							.with(
								P.union('useRecoilMemoSelector', 'useRecoilMemoValue', 'useRecoilMemoParamSelector'),
								() => {
									return `const ${cleanedSelectorChoice} = get(${selectorChoice})`
								}
							)
							.with('useRecoilEffect', () => {
								return `const ${cleanedSelectorChoice} = await getAsync(${selectorChoice})`
							})
							.with('useRecoilAsyncCallback', () => {
								return `const ${cleanedSelectorChoice} = await asyncGet(${selectorChoice})`
							})
							.with(
								P.union(
									'useRecoilValue(atom)',
									'useRecoilValue(atom, (s) => s.property)',
									'useRecoilSelector',
									'useEffect',
									'useRecoilLocalAtom'
								),
								() => {
									return ''
								}
							)
							.exhaustive()
						if (str) {
							lines.push(str)
						}
					}
					context.report({
						node,
						messageId: 'gen selector getters',
						fix: (fixer) => {
							return fixer.replaceText(node, `${lines.join('\n')}`)
						},
					})
				}
			},
		}
	},
})

export const recoilGenTemplate = { rule, RULE_NAME }
