import { createHash } from 'node:crypto';
import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_FILES = ['index.html', 'sitemap.xml'];
const REJECTED_EXTENSIONS = new Set(['.phar', '.php', '.phtml', '.zip']);
const SECRET_SHAPES = [
  /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
  /\bgh[pousr]_[0-9A-Za-z_]{20,}\b/,
  /\bsk-proj-[0-9A-Za-z_-]{20,}\b/,
  /\bsk-ant-(?:api[0-9]{2}-)?[0-9A-Za-z_-]{20,}\b/,
  /\bsk-[0-9A-Za-z]{32,}\b/,
  /\bsk_live_[0-9A-Za-z]{16,}\b/,
  /\bsb_secret_[0-9A-Za-z_-]{20,}\b/,
  /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/,
];
const JWT_SHAPE =
  /\beyJ[0-9A-Za-z_-]{8,}\.[0-9A-Za-z_-]{8,}\.[0-9A-Za-z_-]{8,}\b/g;
const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.htm',
  '.html',
  '.js',
  '.json',
  '.map',
  '.mjs',
  '.svg',
  '.txt',
  '.webmanifest',
  '.xml',
]);
const TEXT_FILENAMES = new Set(['.htaccess']);

export const DEFAULT_ARTIFACT_LIMITS = Object.freeze({
  maxFileBytes: 100 * 1024 * 1024,
  maxFiles: 50_000,
  maxTotalBytes: 1024 * 1024 * 1024,
});

export class ArtifactValidationError extends Error {
  constructor(code, relativePath) {
    super(code);
    this.name = 'ArtifactValidationError';
    this.code = code;
    this.relativePath = relativePath;
  }
}

function normalizeRelativePath(rootDirectory, filePath) {
  return path.relative(rootDirectory, filePath).split(path.sep).join('/');
}

function isInsideRoot(rootDirectory, candidatePath) {
  return (
    candidatePath === rootDirectory ||
    candidatePath.startsWith(`${rootDirectory}${path.sep}`)
  );
}

function assertStableRegularFile(rootDirectory, absolutePath, relativePath) {
  let fileStat;
  let realFilePath;

  try {
    fileStat = lstatSync(absolutePath);
    realFilePath = realpathSync(absolutePath);
  } catch {
    throw new ArtifactValidationError('ARTIFACT_FILE_UNREADABLE', relativePath);
  }

  if (
    !fileStat.isFile() ||
    fileStat.isSymbolicLink() ||
    !isInsideRoot(rootDirectory, realFilePath)
  ) {
    throw new ArtifactValidationError(
      'ARTIFACT_UNSUPPORTED_ENTRY',
      relativePath,
    );
  }

  return fileStat;
}

function collectFiles(rootDirectory, currentDirectory = rootDirectory) {
  const files = [];
  let entries;

  try {
    entries = readdirSync(currentDirectory, { withFileTypes: true });
  } catch {
    throw new ArtifactValidationError('ARTIFACT_DIRECTORY_UNREADABLE');
  }

  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const absolutePath = path.join(currentDirectory, entry.name);
    const relativePath = normalizeRelativePath(rootDirectory, absolutePath);

    if (entry.isSymbolicLink()) {
      throw new ArtifactValidationError(
        'ARTIFACT_UNSUPPORTED_ENTRY',
        relativePath,
      );
    }

    if (entry.isDirectory()) {
      const realDirectory = realpathSync(absolutePath);
      if (!isInsideRoot(rootDirectory, realDirectory)) {
        throw new ArtifactValidationError(
          'ARTIFACT_UNSUPPORTED_ENTRY',
          relativePath,
        );
      }
      files.push(...collectFiles(rootDirectory, absolutePath));
      continue;
    }

    if (!entry.isFile()) {
      throw new ArtifactValidationError(
        'ARTIFACT_UNSUPPORTED_ENTRY',
        relativePath,
      );
    }

    files.push({ absolutePath, relativePath });
  }

  return files;
}

function isTextFile(filePath) {
  const basename = path.basename(filePath).toLowerCase();
  return (
    TEXT_FILENAMES.has(basename) ||
    TEXT_EXTENSIONS.has(path.extname(basename))
  );
}

function normalizeEncodedText(value) {
  let normalized = value.toLowerCase();

  for (let pass = 0; pass < 2; pass += 1) {
    normalized = normalized
      .replace(/\\u([0-9a-f]{4})/gi, (_, hex) =>
        String.fromCodePoint(Number.parseInt(hex, 16)),
      )
      .replace(/\\x([0-9a-f]{2})/gi, (_, hex) =>
        String.fromCodePoint(Number.parseInt(hex, 16)),
      )
      .replace(/%([0-9a-f]{2})/gi, (_, hex) =>
        String.fromCodePoint(Number.parseInt(hex, 16)),
      )
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCodePoint(Number.parseInt(hex, 16)),
      )
      .replace(/&#([0-9]+);/g, (_, decimal) =>
        String.fromCodePoint(Number.parseInt(decimal, 10)),
      );
  }

  return normalized;
}

function containsOfflinePlaceholder(content) {
  const decoded = normalizeEncodedText(
    `${content.toString('utf8')}\n${content.toString('latin1')}`,
  );
  const collapsed = decoded.replace(/["'`()\[\],+\s]/g, '');

  return (
    decoded.includes('127.0.0.1:9') ||
    decoded.includes('offline-placeholder') ||
    collapsed.includes('127.0.0.1:9') ||
    collapsed.includes('offline-placeholder')
  );
}

function containsSecretShape(content) {
  const text = content.toString('latin1');
  if (SECRET_SHAPES.some((pattern) => pattern.test(text))) {
    return true;
  }

  if ([...text.matchAll(JWT_SHAPE)].length > 0) {
    return true;
  }

  return false;
}

function assertRequiredFiles(rootDirectory) {
  for (const relativePath of REQUIRED_FILES) {
    const absolutePath = path.join(rootDirectory, relativePath);
    let fileStat;

    try {
      fileStat = lstatSync(absolutePath);
    } catch {
      throw new ArtifactValidationError(
        'ARTIFACT_REQUIRED_FILE_MISSING',
        relativePath,
      );
    }

    if (
      !fileStat.isFile() ||
      fileStat.isSymbolicLink() ||
      fileStat.size === 0
    ) {
      throw new ArtifactValidationError(
        'ARTIFACT_REQUIRED_FILE_INVALID',
        relativePath,
      );
    }

    let content;
    try {
      content = readFileSync(absolutePath, 'utf8');
    } catch {
      throw new ArtifactValidationError(
        'ARTIFACT_REQUIRED_FILE_INVALID',
        relativePath,
      );
    }

    const normalizedContent = content.trim().toLowerCase();
    const hasExpectedStructure =
      relativePath === 'index.html'
        ? /<!doctype\s+html|<html(?:\s|>)/.test(normalizedContent)
        : /<(?:urlset|sitemapindex)(?:\s|>)/.test(normalizedContent) &&
          /<\/(?:urlset|sitemapindex)>/.test(normalizedContent);

    if (!hasExpectedStructure) {
      throw new ArtifactValidationError(
        'ARTIFACT_REQUIRED_FILE_INVALID',
        relativePath,
      );
    }
  }
}

export function formatArtifactValidationError(error) {
  if (error instanceof ArtifactValidationError) {
    return {
      ok: false,
      code: error.code,
      ...(error.relativePath
        ? {
            pathDigest: createHash('sha256')
              .update(error.relativePath)
              .digest('hex')
              .slice(0, 16),
          }
        : {}),
    };
  }

  return {
    ok: false,
    code: 'ARTIFACT_VALIDATION_FAILED',
  };
}

export function validateDeployArtifact(
  directoryPath,
  limits = DEFAULT_ARTIFACT_LIMITS,
) {
  const requestedRoot = path.resolve(directoryPath);
  let rootStat;
  let rootDirectory;

  try {
    rootStat = lstatSync(requestedRoot);
    rootDirectory = realpathSync(requestedRoot);
  } catch {
    throw new ArtifactValidationError('ARTIFACT_DIRECTORY_MISSING');
  }

  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new ArtifactValidationError('ARTIFACT_DIRECTORY_INVALID');
  }

  assertRequiredFiles(rootDirectory);

  const files = collectFiles(rootDirectory);
  if (files.length > limits.maxFiles) {
    throw new ArtifactValidationError('ARTIFACT_FILE_COUNT_LIMIT');
  }

  const digest = createHash('sha256');
  let totalBytes = 0;

  for (const file of files) {
    const extension = path.extname(file.relativePath).toLowerCase();
    if (REJECTED_EXTENSIONS.has(extension)) {
      throw new ArtifactValidationError(
        'ARTIFACT_EXECUTABLE_PAYLOAD',
        file.relativePath,
      );
    }

    const beforeRead = assertStableRegularFile(
      rootDirectory,
      file.absolutePath,
      file.relativePath,
    );

    if (beforeRead.size > limits.maxFileBytes) {
      throw new ArtifactValidationError(
        'ARTIFACT_FILE_SIZE_LIMIT',
        file.relativePath,
      );
    }

    totalBytes += beforeRead.size;
    if (totalBytes > limits.maxTotalBytes) {
      throw new ArtifactValidationError('ARTIFACT_TOTAL_SIZE_LIMIT');
    }

    let content;
    try {
      content = readFileSync(file.absolutePath);
    } catch {
      throw new ArtifactValidationError(
        'ARTIFACT_FILE_UNREADABLE',
        file.relativePath,
      );
    }

    const afterRead = assertStableRegularFile(
      rootDirectory,
      file.absolutePath,
      file.relativePath,
    );
    if (
      beforeRead.dev !== afterRead.dev ||
      beforeRead.ino !== afterRead.ino ||
      beforeRead.size !== afterRead.size ||
      beforeRead.mtimeMs !== afterRead.mtimeMs ||
      content.byteLength !== afterRead.size
    ) {
      throw new ArtifactValidationError(
        'ARTIFACT_FILE_CHANGED',
        file.relativePath,
      );
    }

    if (isTextFile(file.absolutePath) && content.includes(0)) {
      throw new ArtifactValidationError(
        'ARTIFACT_BINARY_DISGUISED_AS_TEXT',
        file.relativePath,
      );
    }

    if (containsOfflinePlaceholder(content)) {
      throw new ArtifactValidationError(
        'ARTIFACT_OFFLINE_PLACEHOLDER',
        file.relativePath,
      );
    }

    if (containsSecretShape(content)) {
      throw new ArtifactValidationError(
        'ARTIFACT_SECRET_SHAPE',
        file.relativePath,
      );
    }

    const fileDigest = createHash('sha256').update(content).digest('hex');
    digest.update(
      `${file.relativePath}\0${content.byteLength}\0${fileDigest}\n`,
    );
  }

  return {
    ok: true,
    fileCount: files.length,
    totalBytes,
    digest: digest.digest('hex'),
  };
}

const isCli =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isCli) {
  const directoryPath = process.argv[2] ?? 'dist';

  try {
    console.log(JSON.stringify(validateDeployArtifact(directoryPath)));
  } catch (error) {
    console.error(JSON.stringify(formatArtifactValidationError(error)));
    process.exitCode = 1;
  }
}
