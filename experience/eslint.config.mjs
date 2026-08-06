import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', '.next-dev/**', 'node_modules/**']),
  {
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
  {
    files: ['components/community-reader-experience.tsx'],
    rules: {
      'react-hooks/exhaustive-deps': 'off',
    },
  },
])
