import tseslint from '../frontend-react/node_modules/typescript-eslint/dist/index.js';

export default tseslint.config(...tseslint.configs.recommended, {
  rules: {
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-restricted-syntax': [
      'error',
      {
        selector: "Decorator CallExpression[callee.name='Component'] Property[key.name=/^(template|styles)$/]",
        message: 'Use external HTML/CSS files through templateUrl and styleUrl.',
      },
    ],
  },
});
