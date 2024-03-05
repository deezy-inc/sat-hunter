module.exports = {
    env: {
        node: true,
        es2021: true,
    },
    extends: ['eslint:recommended', 'prettier'],
    plugins: ['prettier'],
    parserOptions: {
        ecmaVersion: 'latest',
    },
    rules: {
        indent: ['error', 4],
        'linebreak-style': ['error', 'unix'],
        quotes: [
            'error',
            'single',
            {
                avoidEscape: true,
                allowTemplateLiterals: true,
            },
        ],
        semi: ['error', 'never'],
        'no-undef': 'error',
        'no-unused-vars': ['error', { argsIgnorePattern: 'req|res|next|__' }],
        'no-unused-expressions': ['error', { allowTernary: true }],
        'prettier/prettier': 'error',
        eqeqeq: 'warn',
        'no-return-assign': 'error',
        'no-useless-concat': 'error',
        'no-useless-return': 'error',
        'no-mixed-spaces-and-tabs': 'warn',
        'no-constant-condition': 'warn',
        'space-before-blocks': 'error',
        'max-len': ['error', { code: 200 }],
        'no-mixed-operators': 'warn',
        'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
        'no-whitespace-before-property': 'error',
        'nonblock-statement-body-position': 'error',
        'object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],

        //* ES6
        'arrow-spacing': 'error',
        'no-confusing-arrow': 'error',
        'no-duplicate-imports': 'error',
        'no-var': 'error',
        'object-shorthand': ['warn', 'always'],
        'prefer-const': 'error',
        'prefer-template': 'warn',
    },
    overrides: [
        {
            files: ['**/__tests__/**/*.{js,mjs}?(x)'],
            env: {
                jest: true,
            },
        },
    ],
}
