import * as rules from './rules'

export default Object.fromEntries(Object.values(rules).map(({ RULE_NAME, rule }) => [RULE_NAME, rule]))
