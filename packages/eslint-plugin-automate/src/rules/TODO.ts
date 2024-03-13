/* generate react component:
check that it is kebabcase
in windows

deps:
fixed: no fn, no unnessesary, list of no need deps wrappers, auto fix without asking
codemod - first without removing unnessesary and without removing custom wrappers
 */

// TODO
// not sure if need auto wrap with r in jsx and all
//
/**
 * new suggestion:
 * auto add useHandler (it is better than JSON.stringify)
 * r will exist as an additional api when need
 * add the additional type for useHandler to disregard in deps or maybe add symbol to disregard at runtime and in memo
 * create useGetter with type/symbol
 * notice useMemo can return function
 * memo when passed function without the handler-symbol/getter-symbol, will warn in dev mode
 * if using symbol, ...
 * unblock functions from deps
 * maybe symbol will be regarded as type as well
 */

/**
 * New Thinking, New Plan
 *
 v* (No need) (hard) to auto add import statement or use ts auto add import
*
v* to auto wrap with useHandler - (NOP (hard)for now Maybe to auto wrap/unwrap Only if there are local deps)
v* useHandler as a parameter
v* handlers to replace
v* disregard for now JSX callbacks
*
v* Continue disregarding functions
v* (hard) fix the eslint rule
v* | undefined fixed
v* the other two Maybe will not do right now
*
*v* memo:
*v* continue disregarding functions
*v* return it to without ref form
*v* (hard) then auto wrap with memo except these with children
*v* auto add displayname
*v* ADD auto remove displayname
** ADD render statistics
*
*v* ban-deps-ignore
*
* WHEN APPLYIONG

------------------
 order of application:
 --------
 no-react-hooks

 remove eslint ignore - find regex
// eslint-disable-next-line @byondxr/automate/exhaustive-deps\n
 -->check auto fixed dep
 
 using replace-identifier: remove useCustomEffect/useCustomMemo
 y nx run editor-kit:lint --fix --skip-nx-cache --parallel=12
 clean: remove replace-identifier

 addDataComponent
 rule: new react empty-line
 rule: ban-deps-ignore
 rule: useHandler

 ->clean: remove the replace effect dep property

 rule: memo with replaces
 ->clean: remove the replaces


 rule: useMemo

 //.

 
y nx run space-editor:lint --fix --skip-nx-cache --parallel=6
y nx run-many -t lint --parallel=6 --fix --projects=ui\* --skip-nx-cache
y nx format:write

 v *****  exclude svg
 v *****  same for hooks
 v *****  react tsx only

 rule: no-optional with auto fix
 remove autofix


*v** useMemo auto wrapper
*
**** ADD @@@@@@@ [component name, props name, component name as filename, data-component] be compatible @@@@@@
*
*v* put the addImports and removeImports in the appropriate place
*v* put imports feature in a util
*v* remove imports for replacement
*v* imports as parameter
*
*v* replacement for useCustomEffect useCustomMemo
*
*v*** put all react component rules in one( react component)
*
* (not clear for the meantime) recoil:
* paramselector/selector form with deps
* new selector with new id (maybe on each zeroing of mounts and deps change) or on each mount
* think about local vs common selectors vs selector which passed params
* check that the deprecated selector not get called on each change
*/
