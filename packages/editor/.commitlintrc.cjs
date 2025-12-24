module.exports = {
  extends: ['@commitlint/config-conventional'],
  rulse: {
    'prettier/prettier': 'error',
    'arrow-body-style': 'off',
    'prefer-arrow-callback': 'off',
    '@typescript-eslint/no-explicit-any': ['off'],
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'no-case-declarations': 'off',
    '@typescript-eslint/no-unused-vars': 'error'
  }
}
