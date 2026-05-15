import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const repoRoot = path.resolve(currentDirPath, '..');
const packageJsonPath = path.join(repoRoot, 'package.json');

const expectedMetadata = {
  name: '@maksiph14/toolwall',
  main: 'dist/lib.js',
  exportRoot: './dist/lib.js',
  exportPackageJson: './package.json',
  binPath: 'dist/cli.js',
  repositoryUrl: 'git+https://github.com/shleder/toolwall.git',
  homepage: 'https://github.com/shleder/toolwall#readme',
  bugsUrl: 'https://github.com/shleder/toolwall/issues',
  publishAccess: 'public',
  nodeEngine: '>=20.0.0',
  prepareScript: 'npm run build',
  requiredFiles: [
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
    'dist/security-constants.js',
    'dist/stdio/proxy.js',
    'dist/utils/auditLogger.js',
    'dist/utils/json-rpc.js',
    'dist/utils/mcp-request.js',
    'docs/CLIENT_CONFIG_EXAMPLES.md',
    'docs/EVIDENCE_BUNDLE.md',
    'docs/LIMITS_AND_NON_GOALS.md',
    'docs/ARCHITECTURE.md',
    'docs/QUICKSTART.md',
    'docs/RISK_MODEL.md',
    'docs/RUNTIME_CONTRACT.md',
    '.env.example',
    'LICENSE',
    'README.md',
    'CHANGELOG.md',
    'SECURITY.md',
    'SUPPORT.md',
  ],
  forbiddenFiles: [
    'dist',
    'docs/STDIO_BENCHMARK_GUIDE.md',
    'docs/STDIO_BENCHMARK_SNAPSHOT.json',
  ],
};

export const readPackageJson = () => {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
};

export const validatePackageMetadata = (pkg) => {
  const mismatches = [];
  const packageFiles = Array.isArray(pkg.files) ? pkg.files : [];
  const expectedFiles = new Set(expectedMetadata.requiredFiles);

  if (pkg.name !== expectedMetadata.name) {
    mismatches.push(`name must be ${expectedMetadata.name}, got ${pkg.name ?? 'undefined'}`);
  }

  if (pkg.main !== expectedMetadata.main) {
    mismatches.push(`main must be ${expectedMetadata.main}, got ${pkg.main ?? 'undefined'}`);
  }

  if (pkg.exports?.['.'] !== expectedMetadata.exportRoot) {
    mismatches.push(`exports["."] must be ${expectedMetadata.exportRoot}, got ${pkg.exports?.['.'] ?? 'undefined'}`);
  }

  if (pkg.exports?.['./package.json'] !== expectedMetadata.exportPackageJson) {
    mismatches.push(`exports["./package.json"] must be ${expectedMetadata.exportPackageJson}, got ${pkg.exports?.['./package.json'] ?? 'undefined'}`);
  }

  if (pkg.bin?.['toolwall'] !== expectedMetadata.binPath) {
    mismatches.push(`bin.toolwall must be ${expectedMetadata.binPath}, got ${pkg.bin?.['toolwall'] ?? 'undefined'}`);
  }

  if (pkg.repository?.url !== expectedMetadata.repositoryUrl) {
    mismatches.push(`repository.url must be ${expectedMetadata.repositoryUrl}, got ${pkg.repository?.url ?? 'undefined'}`);
  }

  if (pkg.homepage !== expectedMetadata.homepage) {
    mismatches.push(`homepage must be ${expectedMetadata.homepage}, got ${pkg.homepage ?? 'undefined'}`);
  }

  if (pkg.bugs?.url !== expectedMetadata.bugsUrl) {
    mismatches.push(`bugs.url must be ${expectedMetadata.bugsUrl}, got ${pkg.bugs?.url ?? 'undefined'}`);
  }

  if (pkg.publishConfig?.access !== expectedMetadata.publishAccess) {
    mismatches.push(`publishConfig.access must be ${expectedMetadata.publishAccess}, got ${pkg.publishConfig?.access ?? 'undefined'}`);
  }

  if (pkg.engines?.node !== expectedMetadata.nodeEngine) {
    mismatches.push(`engines.node must be ${expectedMetadata.nodeEngine}, got ${pkg.engines?.node ?? 'undefined'}`);
  }

  if (pkg.scripts?.prepare !== expectedMetadata.prepareScript) {
    mismatches.push(`scripts.prepare must be ${expectedMetadata.prepareScript}, got ${pkg.scripts?.prepare ?? 'undefined'}`);
  }

  for (const requiredFile of expectedMetadata.requiredFiles) {
    if (!packageFiles.includes(requiredFile)) {
      mismatches.push(`files must include ${requiredFile}`);
    }
  }

  for (const packageFile of packageFiles) {
    if (!expectedFiles.has(packageFile)) {
      mismatches.push(`files must not include unexpected entry ${packageFile}`);
    }
  }

  for (const forbiddenFile of expectedMetadata.forbiddenFiles) {
    if (packageFiles.includes(forbiddenFile)) {
      mismatches.push(`files must not include ${forbiddenFile}`);
    }
  }

  return mismatches;
};

export const main = () => {
  const pkg = readPackageJson();
  const mismatches = validatePackageMetadata(pkg);

  if (mismatches.length > 0) {
    console.error('Package metadata assertion failed:');
    for (const mismatch of mismatches) {
      console.error(`- ${mismatch}`);
    }
    process.exit(1);
  }

  console.log(`package metadata assertion passed for ${pkg.name}@${pkg.version}`);
};

if (process.argv[1] === currentFilePath) {
  main();
}
