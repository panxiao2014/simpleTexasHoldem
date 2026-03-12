# Copilot Instructions

## TypeScript typing requirements

- For all TypeScript code, always provide explicit static type annotations for variables, function parameters, and function return types.
- Do not use `any` unless absolutely unavoidable; prefer precise types, interfaces, type aliases, unions, and generics.

## React component documentation requirements

- When creating a React component, always add a comment above the component that explains:
	- The purpose of the component.
	- The props it receives.
	- The type of each prop.
	- How the component should be used.
- Keep the comment concise but complete enough for another developer to use the component correctly.

## Indentation and formatting requirements

- For all `.ts` and `.tsx` files, use **4 spaces** for indentation.
- Do not use tabs for indentation.
- Preserve consistent 4-space indentation in nested blocks, object literals, arrays, JSX, and function bodies.
- For `.ts` and `.tsx` files, add comment start with `//` for single-line comments and `/* */` for multi-line comments, and ensure they are properly indented according to the 4-space rule.
- For `.tsx` files, always insert a blank line before and after JSX elements to improve readability, and ensure the JSX is indented according to the 4-space rule.
- For `.tsx` files, always add comment for a React component used in JSX, explaining the purpose of the component and any important details about its usage, and ensure the comment is properly indented according to the 4-space rule.