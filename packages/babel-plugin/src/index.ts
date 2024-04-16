import { addNamed } from '@babel/helper-module-imports'
import * as t from '@babel/types'
import type { PluginObj, PluginPass } from '@babel/core'

type Import = {
	importName: string
	importSource: string
}
export type Options = PluginPass & {
	opts: {
		componentWrappers: {
			observer?: Import
			memo?: Import
		}
	}
	actualImports: Map<string, string>
}

export const isComponent = (str: string) => {
	return /^[A-Z]/.test(str)
}

const plugin = (): PluginObj<Options> => {
	return {
		pre(file) {
			this.actualImports = new Map()
		},
		visitor: {
			VariableDeclaration(p, state) {
				p.skip()
				const declarations = p.get('declarations')
				const declarator = declarations[0]
				if (declarator) {
					const init = declarator.get('init')
					if (init.isArrowFunctionExpression()) {
						if (t.isIdentifier(declarator.node.id) && isComponent(declarator.node.id.name)) {
							const wrap = ({ importName, importSource }: Import) => {
								let actualImport = state.actualImports.get(importName)
								if (!actualImport) {
									actualImport = addNamed(p, importName, importSource).name
									state.actualImports.set(importName, actualImport)
								}
								init.replaceWith(t.callExpression(t.identifier(actualImport), [init.node]))
							}
							// probably important first to wrap with observer
							state.opts.componentWrappers.observer && wrap(state.opts.componentWrappers.observer)
							state.opts.componentWrappers.memo && wrap(state.opts.componentWrappers.memo)
							p.insertAfter(
								t.expressionStatement(
									t.assignmentExpression(
										'=',
										t.memberExpression(
											t.identifier(declarator.node.id.name),
											t.identifier('displayName')
										),
										t.stringLiteral(declarator.node.id.name)
									)
								)
							)

							// Add data-component attribute to the first JSX element
							const componentName = declarator.node.id.name
							init.traverse({
								JSXElement(path) {
									const openingElement = path.get('openingElement')
									if (openingElement.isJSXOpeningElement()) {
										const existingAttribute = openingElement.node.attributes
											.filter((attr): attr is t.JSXAttribute => t.isJSXAttribute(attr))
											.find(
												(attr) => t.isJSXAttribute(attr) && attr.name.name === 'data-component'
											)

										if (existingAttribute) {
											// Update the existing attribute value
											existingAttribute.value = t.stringLiteral(componentName)
										} else {
											// Add a new attribute
											openingElement.node.attributes.push(
												t.jsxAttribute(
													t.jsxIdentifier('data-component'),
													t.stringLiteral(componentName)
												)
											)
										}

										path.stop() // Stop traversal after the first JSX element
									}
								},
							})
						}
					}
				}
			},
		},
		post(file) {
			console.log(file.path.toString().replaceAll('\t', '  '))
		},
	}
}

/**
 * next:
 * deploy
 * check the monorepo for children
 */

export default plugin
