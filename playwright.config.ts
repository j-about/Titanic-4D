import { defineConfig, devices } from '@playwright/test';

const isCi = process.env['CI'] === 'true';
const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4173';

const softwareWebGpuArgs = [
  '--enable-unsafe-webgpu',
  '--use-webgpu-adapter=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
];

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFileName}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, threshold: 0.2, animations: 'disabled' },
  },
  use: {
    baseURL,
    trace: 'off',
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  },
  projects: [
    {
      name: 'webgl2',
      use: { ...devices['Desktop Chrome'], launchOptions: { args: [] } },
    },
    {
      name: 'webgpu',
      use: { ...devices['Desktop Chrome'], launchOptions: { args: softwareWebGpuArgs } },
    },
  ],
  ...(process.env['E2E_BASE_URL'] === undefined
    ? {
        webServer: {
          command: 'vite preview',
          url: baseURL,
          reuseExistingServer: !isCi,
          timeout: 60_000,
        },
      }
    : {}),
});
