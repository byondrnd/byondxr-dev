import { writeFileSync } from 'fs'
import { addNamed } from '@babel/helper-module-imports'
import * as t from '@babel/types'
import type { NodePath, PluginObj, PluginPass } from '@babel/core'
import { dataComponentExcludes, dataComponentImportSourceExcludesRegex } from './data-component-excludes'

type Import = {
	importName: string
	importSource: string
}
export type Options = PluginPass & {
	opts?: {
		componentWrappers?: {
			observer?: Import
			memo?: Import
		}
		memoWithChildren?: boolean
		wrapObserverOnlyIfGet?: boolean
		dataComponent?: boolean
	}
	actualImports: Map<string, string>
	componentName: string
	hasObservableGetter: boolean
}

export const isComponent = (str: string) => {
	return /^[A-Z]/.test(str)
}

export const isDomElement = (str: string) => {
	return /^[a-z]/.test(str)
}

const filesEnteredMap = new Map<string, boolean>()
const log = {
	dataComponentWrites: 0,
	observerWraps: 0,
	memoWraps: 0,
	foundComponentsWithChildren: 0,
}

const jsxVisitor: PluginObj<Options> = {
	visitor: {
		JSXOpeningElement(p, state) {
			let disregard = false
			if (t.isJSXIdentifier(p.node.name)) {
				const elementName = p.node.name.name

				if (isDomElement(elementName) && dataComponentExcludes.includes(elementName)) {
					disregard = true
				}

				if (!isDomElement(elementName)) {
					let importSpecifier = p.scope.getBinding(elementName)?.path
					if (importSpecifier?.isImportSpecifier() || importSpecifier?.isImportDefaultSpecifier()) {
						const importDeclaration = importSpecifier.parentPath
						if (importDeclaration?.isImportDeclaration()) {
							const importSource = importDeclaration.node.source.value
							if (RegExp(dataComponentImportSourceExcludesRegex).test(importSource)) {
								disregard = true
							}
						}
					}
				}
			}
			if (!disregard) {
				const existingAttribute = p.node.attributes
					.filter((attr): attr is t.JSXAttribute => t.isJSXAttribute(attr))
					.find((attr) => t.isJSXAttribute(attr) && attr.name.name === 'data-component')

				log.dataComponentWrites++

				if (existingAttribute) {
					existingAttribute.value = t.stringLiteral(state.componentName)
				} else {
					p.node.attributes.unshift(
						t.jsxAttribute(t.jsxIdentifier('data-component'), t.stringLiteral(state.componentName))
					)
				}
			}

			p.stop()
		},
	},
}

const observableGetterSeeker: PluginObj<Options> = {
	visitor: {
		CallExpression(p, state) {
			let node = p.node
			if (t.isMemberExpression(node.callee)) {
				if (node.arguments.length === 0) {
					if (t.isIdentifier(node.callee.property)) {
						if (node.callee.property.name === 'get') {
							state.hasObservableGetter = true
							p.stop()
						}
					}
				}
			}
			p.skip()
		},
	},
}

// wrap max 0-1 wrapped components
const componentVisitor: PluginObj<Options> = {
	visitor: {
		VariableDeclaration(p, state) {
			const declarations = p.get('declarations')
			const declarator = declarations[0]
			if (declarator) {
				const init = declarator.get('init')
				let arrowFunction: NodePath<t.ArrowFunctionExpression> | undefined = undefined
				let wrapNodeName: string | undefined = undefined
				if (init.isArrowFunctionExpression()) {
					arrowFunction = init
				} else if (init.isCallExpression()) {
					wrapNodeName = t.isIdentifier(init.node.callee) ? init.node.callee.name : undefined
					const param = init.get('arguments')[0]
					if (param && param.isArrowFunctionExpression()) {
						arrowFunction = param
					}
				}

				if (arrowFunction) {
					if (t.isIdentifier(declarator.node.id)) {
						if (isComponent(declarator.node.id.name)) {
							const componentName = declarator.node.id.name
							const wrap = ({ importName, importSource }: Import, where: 'inner' | 'outer') => {
								let actualImport = state.actualImports.get(importName)
								if (!actualImport) {
									actualImport = addNamed(p, importName, importSource).name
									state.actualImports.set(importName, actualImport)
								}
								let replaceNode: NodePath<t.CallExpression> | NodePath<t.ArrowFunctionExpression>
								if (where === 'inner') {
									replaceNode = arrowFunction
								} else {
									replaceNode = init as NodePath<t.CallExpression>
								}

								if (wrapNodeName !== importName) {
									replaceNode.replaceWith(
										t.callExpression(t.identifier(actualImport), [replaceNode.node])
									)
									return true
								}
								return false
							}

							// make sure to run BEFORE any wrap that will replace the arrowFunction node
							let hasChildren = false
							if (!state.opts.memoWithChildren) {
								if (arrowFunction.node.params[0] && t.isObjectPattern(arrowFunction.node.params[0])) {
									let param = arrowFunction.get('params')[0] as NodePath<t.ObjectPattern>
									let paramNode = param.node

									hasChildren = paramNode.properties.some((property) => {
										if (t.isObjectProperty(property)) {
											return t.isIdentifier(property.key) && property.key.name === 'children'
										}
										return false
									})
									if (hasChildren) {
										log.foundComponentsWithChildren++
									}
								}
							}

							// The inside most wrap with observer
							if (state.opts?.componentWrappers?.observer) {
								if (state.opts.wrapObserverOnlyIfGet) {
									arrowFunction.traverse(observableGetterSeeker.visitor, state)
								}
								if (!state.opts.wrapObserverOnlyIfGet || state.hasObservableGetter) {
									if (wrap(state.opts.componentWrappers.observer, 'inner')) {
										log.observerWraps++
									}
								}
							}

							// The outer most wrap with memo
							if (state.opts?.componentWrappers?.memo && !hasChildren) {
								if (wrap(state.opts.componentWrappers.memo, 'outer')) {
									log.memoWraps++
								}
							}

							if (!wrapNodeName) {
								p.insertAfter(
									t.expressionStatement(
										t.assignmentExpression(
											'=',
											t.memberExpression(
												t.identifier(componentName),
												t.identifier('displayName')
											),
											t.stringLiteral(componentName)
										)
									)
								)
							}

							if (state.opts.dataComponent) {
								arrowFunction.traverse(jsxVisitor.visitor, { ...state, componentName })
							}
						}
					}
				}
			}
			p.skip()
		},
	},
}

let tm: NodeJS.Timeout
let logFinished = false
const writeLog = () => {
	let stringified = JSON.stringify(log, null, 2)
	console.warn(stringified)
	writeFileSync('byondxr-babel-plugin.log', stringified)
}
const plugin = (): PluginObj<Options> => {
	return {
		name: 'byondxr-babel-plugin',
		pre() {
			this.actualImports = new Map()
		},
		visitor: {
			Program: {
				enter(p, state) {
					p.traverse<Options>(componentVisitor.visitor, state)
				},
			},
		},
		post(file) {
			if (!logFinished && file.opts.filename) {
				if (!filesEnteredMap.get(file.opts.filename)) {
					filesEnteredMap.set(file.opts.filename, true)
					clearTimeout(tm)
					tm = setTimeout(() => {
						console.log('babel finished')
						logFinished = true
						writeLog()
					}, 10000)
				}
			}
			// console.log(file.path.toString().replaceAll('\t', '  '))
		},
	}
}

export default plugin
