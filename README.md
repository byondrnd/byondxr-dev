# Introduction

This repo contains a set of utilities for React and Recoil and ESLint rules to make developer experience better.

Lint is used for code quality and code automation

The purpose of React/Recoil abstractions/utils, Lint rules and Code Generation is to GUIDE developer into happy path - where less bugs and less worry about language/react/recoil imperfect implementation or coexistence. Producing features more efficiently and more joyfully instead of thinking how to satisfy quirks and deficiencies of specific tools.

See [example app](./example-app) for usage examples.

# Setup

## Installation

```
pnpm add @byondxr/react-utils, @byondxr/recoil-utils, @byondxr/react-recoil-utils, @byondxr/eslint-automate, @byondxr/zustand-utils
```

## Configuration

Add plugin @byondxr/automate and the required rules to your eslint config. See [eslint example](./example-app/.eslintrc.json) for the full list of rules.

# Documentation

### Parts of the code which are generated/updated automatically

_These must not be modified or relied upon_

1. dependency array in react or recoil hooks
2. `useRecoilEffect:` getter function after the dependency array
3. `useHandler` (you can add more, but important to tell me - so I add it to the automation)
4. `r()` in inline callback
5. `const { r } = useInlineHandler()`
6. `useMemo` (you can add more, but important to tell me - so I add it to the automation)
7. `memo`
8. `displayName`
9. `data-component`
10. recoil utils - key string
11. comment like this `// local selector function dependency`

### Recoil-Utils Cheat sheet

create global atom => <br/>`const globalAtom = useRecoilAtom('key', 'default')`

create local atom =><br/>`const [localAtom, setLocalAtom] = useLocalAtom('default')`

create a selector purely function of one atom =><br/>`const selector = useRecoilSelector(atom, (state)=>state.property)`

create a selector =><br/>`const selector = useRecoilMemoSelector( ( { get, getParam, getAsync, getParamAsync } ) => {}, [ ] )`

create a selector per param =><br/>`const paramSelector = useRecoilMemoParamSelector( (param: Dict) => ( { get, getParam, getAsync, getParamAsync } ) => {}, [ ] )`

unwrap value =><br/>`const value = useRecoilValue(atom)`<br/>`const propertyValue = useRecoilValue(atom, (state)=>state.property)`

create a selector value =><br/>`const selector = useRecoilMemoValue( ( { get, getParam, getAsync, getParamAsync } ) => {}, [ ] )`

access value =><br/>`const handleClick = useRecoilAsyncCallback( ({ asyncGet, asyncParamGet }) => async (params) => { } )`

subscribe =><br/>`useRecoilEffect( ( { getAsync, getParamAsync, getCurrentAsync } ) => {}, [ ] )`

Global caching

-   selectors are auto cached globally most of the time
-   using not external functions or refVar.current will disable global cache and mark this var with comment
-   marking function, which is not external, as fnName\_\_global will enable global caching (edited)

## Snippets generation

### When saving new file

-   saving empty .tsx file will generate => component
-   saving empty use-…..tsx file => hook
-   saving …-icon.tsx file => icon component

### Generating snippets

These work in any editor which runs eslint autofix, whether it is VS Code, WebStorm or any other.
Assuming a shortcut F3 was configured (see bellow), these are the available scenarios:

1. place cursor on a new line and press F3 --> will provide a choice of hooks
    - press F3 on the hook from the choice given --> will generate the hook + choice of selectors/atoms
        - press F3 on a selector/atom --> will generate the appropriate getter line
2. press F3 on a selector or atom --> will provide a choice of hooks
    - press F3 on the hook from the choice given --> will generate the hook + getter line for the selected selector
3. place cursor inside a hook on an empty line and press F3 --> will provide a choice of selectors and atoms in the file
    - choose selectors (by typing +) and press F3 on one of them --> will generate the getter lines accordingly
4. press F3 when cursor on `useHandler` --> will switch it to useRecoilAsyncCallback and Vice Versa…

### Configuring a shortcut

How the snippets generation works? By typing \_0 and applying eslint autofix.
Best to configure a shortcut and to do autofix on save. This is how to configure it in VS Code:

1. Install [macros](https://github.com/geddski/macros) extension
2. click ctrl+shift+p, select - "user settings JSON" and add this to the file:

```json
  "macros": {
    "recoilGenTemplate": [
      { "command": "type", "args": { "text": "_0" } },
      "workbench.action.files.save"
    ],
  },
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
  },
```

3. click ctrl+shift+p, select - "keyboard JSON " and add this:

```json
{
	"key": "f3",
	"command": "macros.recoilGenTemplate"
}
```

### useRecoilMemoSelector

### \_\_global caching

# Develop

## Install

```
pnpm i
```

## VS Code

Use **eslint** and **prettier** extensions. Enable autofix and format upon save.

## Run tests

```
pnpm test
```

## Release

1. Create a branch
2. Run `pnpm changeset` and follow the instructions. (if you need patch only, press enter upon being asked about minor/major).
3. Commit, push, create a PR and merge it.
4. Wait till version PR is created in the CI and merge it.
5. Release will be created and published to npm automatically.

# TODO

See [todo file](./TODO.md)
