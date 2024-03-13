import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import type { Context } from './ast-utils'
import type { TSESTree, TSESLint } from '@typescript-eslint/utils'

export class ImportUtils<TMessageIds extends string, TOptions extends readonly unknown[]> {
	savedImports = new Map<
		string,
		| {
				imports: {
					add: Map<string, Set<string>>
					remove: Map<string, Set<string>>
				}
		  }
		| undefined
	>()

	context: Context

	constructor(context: Readonly<TSESLint.RuleContext<TMessageIds, TOptions>>) {
		this.context = context
	}

	getImports = () => {
		const file = this.context.getFilename()
		return this.savedImports.get(file)?.imports
	}
	clearImports = () => {
		const file = this.context.getFilename()
		return this.savedImports.set(file, undefined)
	}
	pushImportsHelper = (from: string, keys: string[], addOrRemove: 'add' | 'remove') => {
		const file = this.context.getFilename()
		let fileSaved = this.savedImports.get(file)
		if (!fileSaved) {
			fileSaved = {
				imports: {
					add: new Map(),
					remove: new Map(),
				},
			}
			this.savedImports.set(file, fileSaved)
		}

		let fromImports = fileSaved.imports[addOrRemove].get(from) ?? []
		fromImports = new Set([...fromImports, ...keys])
		fileSaved.imports[addOrRemove].set(from, fromImports)
	}
	addImports = (from: string, keys: string[]) => {
		this.pushImportsHelper(from, keys, 'add')
	}

	updateImports = (messageId: TMessageIds) => {
		return {
			'Program:exit': (programNode: TSESTree.Program) => {
				let shouldImports = this.getImports()?.add
				if (shouldImports?.size) {
					let foundSources: string[] = []

					let expressions = programNode.body
					let lastImportExpression: TSESTree.ImportDeclaration | undefined = undefined
					for (let expression of expressions) {
						if (expression.type !== AST_NODE_TYPES.ImportDeclaration) {
							break
						}
						lastImportExpression = expression

						if (expression.importKind !== 'value') {
							continue
						}
						let nextExpression = false
						for (let [shouldSource, shouldSpecifiers] of shouldImports) {
							if (
								expression.source.value === shouldSource &&
								!foundSources.includes(shouldSource)
							) {
								foundSources.push(shouldSource)

								let specifiers: string[] = []
								for (let specifier of expression.specifiers) {
									if (specifier.type === AST_NODE_TYPES.ImportSpecifier) {
										if (
											specifier.importKind !== 'value' ||
											specifier.local.name !== specifier.imported.name
										) {
											nextExpression = true
											break
										}
										specifiers.push(specifier.imported.name)
									}
								}
								if (nextExpression) {
									break
								}
								let addSpecifiers: string[] = []
								for (let shouldSpecifier of shouldSpecifiers) {
									if (!specifiers.includes(shouldSpecifier)) {
										addSpecifiers.push(shouldSpecifier)
									}
								}
								if (addSpecifiers.length) {
									let workNode =
										expression.specifiers[expression.specifiers.length - 1]
									if (workNode) {
										this.context.report({
											node: workNode,
											messageId: messageId,
											fix(fixer) {
												if (!workNode) {
													return null
												}
												return fixer.insertTextAfter(
													workNode,
													`, ${addSpecifiers.join(', ')}`
												)
											},
										})
									}
								}
							}
						}
						if (nextExpression) {
							continue
						}
					}
					for (let [shouldSource, shouldSpecifiers] of shouldImports) {
						if (!foundSources.includes(shouldSource)) {
							let workNode = lastImportExpression ?? programNode
							this.context.report({
								node: workNode,
								messageId: messageId,
								fix(fixer) {
									let specifiersString = [...shouldSpecifiers].join(', ')
									let text = `import { ${specifiersString} } from '${shouldSource}'`
									return lastImportExpression
										? fixer.insertTextAfter(workNode, `\n${text}`)
										: fixer.insertTextBefore(workNode, `${text}\n\n`)
								},
							})
						}
					}
				}

				this.clearImports()
			},
		}
	}
}

export const getImportSource = (context: Context, str: string) => {
	const program = context.getAncestors()[0]

	if (program?.type === AST_NODE_TYPES.Program) {
		for (const node of program.body) {
			if (node.type !== AST_NODE_TYPES.ImportDeclaration) {
				break
			}
			let foundSpecifier = node.specifiers.find((specifier) => {
				if (specifier.type === AST_NODE_TYPES.ImportSpecifier) {
					if (specifier.local.name === str) {
						return true
					}
				}
				return false
			})

			if (foundSpecifier) {
				return node.source.value
			}
		}
	}
	return undefined
}
