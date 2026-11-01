import tseslint from '../frontend-react/node_modules/typescript-eslint/dist/index.js';
export default tseslint.config(...tseslint.configs.recommended, {rules:{'no-empty':['error',{allowEmptyCatch:true}]}});
