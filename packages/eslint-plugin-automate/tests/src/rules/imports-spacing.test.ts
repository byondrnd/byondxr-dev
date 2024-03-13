import { RuleTester } from '@typescript-eslint/rule-tester'
import { dedent } from 'ts-dedent'
import { afterAll, describe, it } from 'vitest'
import { importsSpacing } from '../../../src/rules'

const { RULE_NAME, rule } = importsSpacing

describe(RULE_NAME, () => {
	RuleTester.describeSkip = describe.skip
	RuleTester.afterAll = afterAll
	RuleTester.describe = describe
	RuleTester.itOnly = it.only
	RuleTester.itSkip = it.skip
	RuleTester.it = it

	let ruleTester = new RuleTester({
		parser: '@typescript-eslint/parser',
	})

	describe(`${RULE_NAME}: inside`, () => {
		ruleTester.run(`${RULE_NAME}: ruleTester inside`, rule, {
			valid: [
				{
					code: dedent`
                    import { x } from 'y'

                    const restofcode = ()=>{}
                    `,
				},
			],
			invalid: [
				{
					code: dedent`
                    import { x } from 'y'
                    const restofcode = ()=>{}
                    `,
					output: dedent`
                    import { x } from 'y'

                    const restofcode = ()=>{}
                    `,
					errors: [
						{
							messageId: 'testMessage',
						},
					],
				},
			],
		})
	})
})
