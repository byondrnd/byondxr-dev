import { addNamed } from '@babel/helper-module-imports'
import * as t from '@babel/types'
import type { PluginObj, PluginPass } from '@babel/core'

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
	}
	actualImports: Map<string, string>
	componentName: string
}

export const isComponent = (str: string) => {
	return /^[A-Z]/.test(str)
}

const jsxVisitor: PluginObj<Options> = {
	visitor: {
		JSXElement(p, state) {
			const openingElement = p.get('openingElement')
			if (openingElement.isJSXOpeningElement()) {
				const existingAttribute = openingElement.node.attributes
					.filter((attr): attr is t.JSXAttribute => t.isJSXAttribute(attr))
					.find((attr) => t.isJSXAttribute(attr) && attr.name.name === 'data-component')

				if (existingAttribute) {
					existingAttribute.value = t.stringLiteral(state.componentName)
				} else {
					openingElement.node.attributes.push(
						t.jsxAttribute(t.jsxIdentifier('data-component'), t.stringLiteral(state.componentName))
					)
				}

				p.stop()
			}
		},
	},
}

const componentVisitor: PluginObj<Options> = {
	visitor: {
		VariableDeclaration(p, state) {
			const declarations = p.get('declarations')
			const declarator = declarations[0]
			if (declarator) {
				const init = declarator.get('init')
				if (init.isArrowFunctionExpression()) {
					if (t.isIdentifier(declarator.node.id)) {
						const componentName = declarator.node.id.name
						if (isComponent(componentName)) {
							const wrap = ({ importName, importSource }: Import) => {
								let actualImport = state.actualImports.get(importName)
								if (!actualImport) {
									actualImport = addNamed(p, importName, importSource).name
									state.actualImports.set(importName, actualImport)
								}
								init.replaceWith(t.callExpression(t.identifier(actualImport), [init.node]))
							}
							// probably important first to wrap with observer
							state.opts?.componentWrappers?.observer && wrap(state.opts.componentWrappers.observer)
							state.opts?.componentWrappers?.memo && wrap(state.opts.componentWrappers.memo)
							p.insertAfter(
								t.expressionStatement(
									t.assignmentExpression(
										'=',
										t.memberExpression(t.identifier(componentName), t.identifier('displayName')),
										t.stringLiteral(componentName)
									)
								)
							)

							init.traverse(jsxVisitor.visitor, { ...state, componentName })
						}
					}
				}
			}
			p.skip()
		},
	},
}

const plugin = (): PluginObj<Options> => {
	return {
		pre(file) {
			this.actualImports = new Map()
		},
		visitor: {
			Program(p, state) {
				p.traverse<Options>(componentVisitor.visitor, state)
			},
		},
		post(file) {
			console.log(file.path.toString().replaceAll('\t', '  '))
		},
	}
}

/**
 * next:
 * check what about these libs along side in js
 *
 * check the monorepo for children
 * add line numbers to the console.log
 * exclude wrap with a comment
 */

export default plugin
