import { describe, expect, it } from 'vitest';
import { assertNotLocalProd, PROD_PROJECT_ID } from './prod-guard';

const prod = {
  projectId: PROD_PROJECT_ID,
  useEmulators: false,
  hostname: 'toli-web--toli-app-prod.asia-southeast1.hosted.app',
};

describe('assertNotLocalProd', () => {
  it('lets production run as production, on the server and in the browser', () => {
    expect(() => assertNotLocalProd(prod)).not.toThrow();
    expect(() => assertNotLocalProd({ ...prod, hostname: undefined })).not.toThrow();
  });
  it('refuses the prod project from a laptop, however the laptop is addressed', () => {
    for (const hostname of ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'])
      expect(() => assertNotLocalProd({ ...prod, hostname }), hostname).toThrow(
        /never point local code/,
      );
  });
  it('refuses the prod project with emulator mode on, anywhere', () => {
    expect(() => assertNotLocalProd({ ...prod, useEmulators: true })).toThrow(/emulator mode/);
    expect(() => assertNotLocalProd({ ...prod, useEmulators: true, hostname: undefined })).toThrow(
      /emulator mode/,
    );
  });
  it('does not care about dev or the emulator project, locally or not', () => {
    for (const projectId of ['toli-app-dev', 'demo-toli', ''])
      expect(() =>
        assertNotLocalProd({ projectId, useEmulators: true, hostname: 'localhost' }),
      ).not.toThrow();
  });
  it('is not fooled by the old, never-used id', () => {
    expect(PROD_PROJECT_ID).toBe('toli-app-prod');
    expect(() =>
      assertNotLocalProd({ projectId: 'toli-prod', useEmulators: true, hostname: 'localhost' }),
    ).not.toThrow();
  });
});
