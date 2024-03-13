import { ESLintUtils } from '@typescript-eslint/utils'
import { targetReactComponent } from '../utils/ast-utils'

const createESLintRule = ESLintUtils.RuleCreator(() => ``)
const RULE_NAME = 'no-react-hooks'
type Options = []
type MessageIds = 'message'

const rule = createESLintRule<Options, MessageIds>({
	name: RULE_NAME,
	meta: {
		fixable: 'code',
		type: 'problem',
		docs: {
			description: 'Disallow react hooks',

			requiresTypeChecking: true,
		},
		hasSuggestions: true,
		messages: {
			message: 'Disallow react hooks for this file extension',
		},
		schema: [],
	},
	defaultOptions: [],
	create: (context) => {
		return {
			...targetReactComponent((node, componentName) => {
				if (componentName?.hookName) {
					context.report({
						node,
						messageId: 'message',
					})
				}
			}),
		}
	},
})

export const noReactHooks = { rule, RULE_NAME }
