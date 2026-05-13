import { describe, expect, it } from '@jest/globals';
import {
  validatePackageMetadata,
} from '../scripts/assert-package-metadata.mjs';
import {
  verifyRegistryMetadata,
} from '../scripts/verify-registry-metadata.mjs';
import {
  verifyReleaseParity,
} from '../scripts/verify-release-parity.mjs';

describe('release guardrails', () => {
  it('accepts expected package metadata', () => {
    const mismatches = validatePackageMetadata({
      name: '@maksiph14/toolwall',
      main: 'dist/lib.js',
      exports: {
        '.': './dist/lib.js',
        './package.json': './package.json',
      },
      files: [
        'dist/admin/index.js',
        'dist/cache/index.js',
        'dist/cache/l1-cache.js',
        'dist/cache/l2-cache.js',
        'dist/cli-options.js',
        'dist/cli.js',
        'dist/embedded/server.js',
        'dist/errors.js',
        'dist/gateway-config.js',
        'dist/lib.js',
        'dist/mcp-tool-schemas.js',
        'dist/metrics/prometheus.js',
        'dist/middleware/ast-egress-filter.js',
        'dist/middleware/color-boundary.js',
        'dist/middleware/error-handler.js',
        'dist/middleware/nhi-auth-validator.js',
        'dist/middleware/preflight-validator.js',
        'dist/middleware/rate-limiter.js',
        'dist/middleware/schema-validator.js',
        'dist/middleware/scope-validator.js',
        'dist/proxy/circuit-breaker.js',
        'dist/proxy/router.js',
        'dist/proxy/shadow-leak-sanitizer.js',
        'dist/proxy/types.js',
        'dist/runtime-config.js',
        'dist/stdio/proxy.js',
        'dist/utils/auditLogger.js',
        'dist/utils/mcp-request.js',
        'docs/CLIENT_CONFIG_EXAMPLES.md',
        'docs/DEMO_RUN_TRANSCRIPT.md',
        'docs/EVIDENCE_BUNDLE.md',
        'docs/GUIDED_SETUP_AND_AUDITS.md',
        'docs/LIMITS_AND_NON_GOALS.md',
        'docs/PROXY_SETUP.md',
        'docs/QUICKSTART.md',
        'docs/RISK_MODEL.md',
        'docs/RISK_SUMMARY.md',
        'docs/RUNTIME_CONTRACT.md',
        'docs/VERIFICATION_GUIDE.md',
        'docs/WORKFLOW_HARDENING.md',
        '.env.example',
        'LICENSE',
        'README.md',
        'CHANGELOG.md',
        'SECURITY.md',
        'SUPPORT.md',
      ],
      bin: {
        'toolwall': 'dist/cli.js',
      },
      repository: {
        type: 'git',
        url: 'git+https://github.com/shleder/toolwall.git',
      },
      homepage: 'https://github.com/shleder/toolwall#readme',
      bugs: {
        url: 'https://github.com/shleder/toolwall/issues',
      },
      publishConfig: {
        access: 'public',
      },
      engines: {
        node: '>=20.0.0',
      },
      scripts: {
        prepare: 'npm run build',
      },
    });

    expect(mismatches).toEqual([]);
  });

  it('rejects package metadata when the packaging and install contract drifts', () => {
    const mismatches = validatePackageMetadata({
      name: 'toolwall',
      main: 'dist/index.js',
      exports: {
        '.': './dist/index.js',
      },
      files: [
        'dist',
        'docs/STDIO_BENCHMARK_GUIDE.md',
        'README.md',
      ],
      bin: {
        'toolwall': 'dist/index.js',
      },
      repository: {
        type: 'git',
        url: 'git+https://github.com/shleder/toolwall.git',
      },
      homepage: 'https://github.com/shleder/toolwall#readme',
      bugs: {
        url: 'https://github.com/shleder/toolwall/issues',
      },
      publishConfig: {
        access: 'public',
      },
      engines: {
        node: '>=18.0.0',
      },
      scripts: {},
    });

    expect(mismatches).toEqual(expect.arrayContaining([
      'main must be dist/lib.js, got dist/index.js',
      'exports["."] must be ./dist/lib.js, got ./dist/index.js',
      'bin.toolwall must be dist/cli.js, got dist/index.js',
      'engines.node must be >=20.0.0, got >=18.0.0',
      'scripts.prepare must be npm run build, got undefined',
      'files must not include unexpected entry dist',
      'files must not include unexpected entry docs/STDIO_BENCHMARK_GUIDE.md',
      'files must not include dist',
      'files must not include docs/STDIO_BENCHMARK_GUIDE.md',
      'files must include docs/CLIENT_CONFIG_EXAMPLES.md',
      'files must include docs/QUICKSTART.md',
      'files must include .env.example',
      'files must include LICENSE',
      'files must include CHANGELOG.md',
      'files must include SECURITY.md',
      'files must include SUPPORT.md',
    ]));
  });

  it('rejects package metadata that points to a different homepage', () => {
    const mismatches = validatePackageMetadata({
      name: 'toolwall',
      repository: {
        type: 'git',
        url: 'git+https://github.com/shleder/toolwall.git',
      },
      homepage: 'https://example.com/wrong-homepage',
      bugs: {
        url: 'https://github.com/shleder/toolwall/issues',
      },
      publishConfig: {
        access: 'public',
      },
    });

    expect(mismatches).toContainEqual(expect.stringContaining('homepage must be'));
  });

  it('accepts registry metadata when repo identity and gitHead match', () => {
    const result = verifyRegistryMetadata({
      pkg: {
        name: 'toolwall',
        version: '2.2.3',
        repository: {
          url: 'git+https://github.com/shleder/toolwall.git',
        },
        homepage: 'https://github.com/shleder/toolwall#readme',
        bugs: {
          url: 'https://github.com/shleder/toolwall/issues',
        },
      },
      env: {
        PACKAGE_VERSION: '2.2.3',
        EXPECTED_GIT_HEAD: 'abc123',
      },
      registryMetadata: {
        version: '2.2.3',
        repository: {
          url: 'git+https://github.com/shleder/toolwall.git',
        },
        homepage: 'https://github.com/shleder/toolwall#readme',
        bugs: {
          url: 'https://github.com/shleder/toolwall/issues',
        },
        gitHead: 'abc123',
      },
    });

    expect(result.mismatches).toEqual([]);
  });

  it('rejects registry metadata with a mismatched gitHead', () => {
    const result = verifyRegistryMetadata({
      pkg: {
        name: 'toolwall',
        version: '2.2.3',
        repository: {
          url: 'git+https://github.com/shleder/toolwall.git',
        },
        homepage: 'https://github.com/shleder/toolwall#readme',
        bugs: {
          url: 'https://github.com/shleder/toolwall/issues',
        },
      },
      env: {
        PACKAGE_VERSION: '2.2.3',
        EXPECTED_GIT_HEAD: 'abc123',
      },
      registryMetadata: {
        version: '2.2.3',
        repository: {
          url: 'git+https://github.com/shleder/toolwall.git',
        },
        homepage: 'https://github.com/shleder/toolwall#readme',
        bugs: {
          url: 'https://github.com/shleder/toolwall/issues',
        },
        gitHead: 'def456',
      },
    });

    expect(result.mismatches).toContainEqual(expect.stringContaining('registry gitHead must be'));
  });

  it('accepts release parity in the expected repo with the expected tag', () => {
    const result = verifyReleaseParity({
      pkg: {
        version: '2.2.5',
      },
      env: {
        GITHUB_REF_NAME: 'v2.2.5',
        GITHUB_REPOSITORY: 'shleder/toolwall',
      },
      readGitFn: (...args: string[]) => {
        if (args[0] === 'config') {
          return 'https://github.com/shleder/toolwall.git';
        }

        return 'abc123';
      },
    });

    expect(result.expectedTag).toBe('v2.2.5');
    expect(result.normalizedOriginRepository).toBe('shleder/toolwall');
    expect(result.mismatches).toEqual([]);
  });

  it('rejects release parity when the repo is not the expected one', () => {
    const result = verifyReleaseParity({
      pkg: {
        version: '2.2.5',
      },
      env: {
        GITHUB_REF_NAME: 'v2.2.5',
        GITHUB_REPOSITORY: 'wrong-owner/toolwall',
      },
      readGitFn: (...args: string[]) => {
        if (args[0] === 'config') {
          return 'https://github.com/shleder/toolwall.git';
        }

        return 'abc123';
      },
    });

    expect(result.mismatches).toContainEqual(expect.stringContaining('GITHUB_REPOSITORY must be'));
  });

  it('accepts SSH origin URLs when they resolve to the canonical repository', () => {
    const result = verifyReleaseParity({
      pkg: {
        version: '2.2.5',
      },
      env: {
        GITHUB_REF_NAME: 'v2.2.5',
        GITHUB_REPOSITORY: 'shleder/toolwall',
      },
      readGitFn: (...args: string[]) => {
        if (args[0] === 'config') {
          return 'git@github.com:shleder/toolwall.git';
        }

        return 'abc123';
      },
    });

    expect(result.normalizedOriginRepository).toBe('shleder/toolwall');
    expect(result.mismatches).toEqual([]);
  });

  it('rejects origins that only contain the canonical repository as a substring', () => {
    const result = verifyReleaseParity({
      pkg: {
        version: '2.2.5',
      },
      env: {
        GITHUB_REF_NAME: 'v2.2.5',
        GITHUB_REPOSITORY: 'shleder/toolwall',
      },
      readGitFn: (...args: string[]) => {
        if (args[0] === 'config') {
          return 'https://github.com/notshleder/toolwall.git';
        }

        return 'abc123';
      },
    });

    expect(result.mismatches).toContain(
      'remote.origin.url must point to shleder/toolwall, got notshleder/toolwall via https://github.com/notshleder/toolwall.git'
    );
  });

  it('rejects lookalike hostnames even when the owner and repo path match', () => {
    const result = verifyReleaseParity({
      pkg: {
        version: '2.2.5',
      },
      env: {
        GITHUB_REF_NAME: 'v2.2.5',
        GITHUB_REPOSITORY: 'shleder/toolwall',
      },
      readGitFn: (...args: string[]) => {
        if (args[0] === 'config') {
          return 'https://notgithub.com/shleder/toolwall.git';
        }

        return 'abc123';
      },
    });

    expect(result.normalizedOriginRepository).toBeNull();
    expect(result.mismatches).toContain(
      'remote.origin.url must point to shleder/toolwall, got https://notgithub.com/shleder/toolwall.git'
    );
  });

  it('reports a missing origin remote as a structured mismatch', () => {
    const result = verifyReleaseParity({
      pkg: {
        version: '2.2.5',
      },
      env: {
        GITHUB_REF_NAME: 'v2.2.5',
        GITHUB_REPOSITORY: 'shleder/toolwall',
      },
      readGitFn: (...args: string[]) => {
        if (args[0] === 'config') {
          throw new Error('missing origin');
        }

        return 'abc123';
      },
    });

    expect(result.mismatches).toContain(
      'remote.origin.url is not configured; expected shleder/toolwall'
    );
  });
});
