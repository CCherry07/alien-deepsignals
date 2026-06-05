export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/test/**', 'dist/**', 'coverage/**', '*.config.ts'],
    },
  },
}
