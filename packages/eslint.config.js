import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'no-console': 'warn',
    'curly': ['warn', 'multi-or-nest', 'consistent'],
  },
})
