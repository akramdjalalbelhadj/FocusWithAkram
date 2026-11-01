import tseslint from 'typescript-eslint';
export default tseslint.config(...tseslint.configs.recommended, {rules:{'@typescript-eslint/no-empty-object-type':'off','no-empty':['error',{allowEmptyCatch:true}]}});
