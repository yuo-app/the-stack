import antfu from '@antfu/eslint-config'

export default antfu({
  unocss: true,
  solid: true,
  rules: {
    'no-console': 'warn',
    'curly': ['warn', 'multi-or-nest', 'consistent'],
    'style/jsx-one-expression-per-line': ['warn', { allow: 'single-line' }],
  },
  ignores: [
    '**/src-tauri/*',
  ],
})
