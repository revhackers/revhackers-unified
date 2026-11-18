import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, test } from 'vitest';

import {
  ArtifactValidationError,
  formatArtifactValidationError,
  validateDeployArtifact,
} from '../scripts/validate-deploy-artifact.mjs';

const temporaryDirectories = [];

function createTemporaryDirectory() {
  const directory = mkdtempSync(
    path.join(tmpdir(), 'revhackers-artifact-test-'),
  );
  temporaryDirectories.push(directory);
  return directory;
}

function createValidArtifact() {
  const directory = createTemporaryDirectory();
  mkdirSync(path.join(directory, 'assets'));
  writeFileSync(
    path.join(directory, 'index.html'),
    '<!doctype html><title>RevHackers</title>',
  );
  writeFileSync(
    path.join(directory, 'sitemap.xml'),
    '<?xml version="1.0"?><urlset></urlset>',
  );
  writeFileSync(path.join(directory, 'assets', 'app.js'), 'console.log("ok");');
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe('validateDeployArtifact', () => {
  test('aceita um artefato válido e produz metadados determinísticos', () => {
    const directory = createValidArtifact();

    const firstResult = validateDeployArtifact(directory);
    const secondResult = validateDeployArtifact(directory);

    expect(firstResult).toEqual(secondResult);
    expect(firstResult).toMatchObject({
      ok: true,
      fileCount: 3,
    });
    expect(firstResult.totalBytes).toBeGreaterThan(0);
    expect(firstResult.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(firstResult)).not.toContain('RevHackers');
  });

  test('rejeita diretório ou arquivos obrigatórios ausentes', () => {
    const missingDirectory = path.join(
      createTemporaryDirectory(),
      'does-not-exist',
    );

    expect(() => validateDeployArtifact(missingDirectory)).toThrowError(
      expect.objectContaining({
        code: 'ARTIFACT_DIRECTORY_MISSING',
      }),
    );

    const emptyDirectory = createTemporaryDirectory();

    expect(() => validateDeployArtifact(emptyDirectory)).toThrowError(
      expect.objectContaining({
        code: 'ARTIFACT_REQUIRED_FILE_MISSING',
        relativePath: 'index.html',
      }),
    );
  });

  test.each(['127.0.0.1:9', 'offline-placeholder'])(
    'rejeita o placeholder offline %s em arquivo textual',
    (placeholder) => {
      const directory = createValidArtifact();
      writeFileSync(
        path.join(directory, 'assets', 'generated.js'),
        `const endpoint = "${placeholder}";`,
      );

      expect(() => validateDeployArtifact(directory)).toThrowError(
        expect.objectContaining({
          name: ArtifactValidationError.name,
          code: 'ARTIFACT_OFFLINE_PLACEHOLDER',
          relativePath: 'assets/generated.js',
        }),
      );
    },
  );

  test.each([
    '127.0.0.1\\u003a9',
    '127.0.0.1%3A9',
    '"127.0.0.1" + ":9"',
    'offline\\x2dplaceholder',
    '"offline" + "-placeholder"',
  ])('rejeita placeholder offline codificado ou dividido: %s', (placeholder) => {
    const directory = createValidArtifact();
    writeFileSync(
      path.join(directory, 'assets', 'generated.bin'),
      new TextEncoder().encode(placeholder),
    );

    expect(() => validateDeployArtifact(directory)).toThrowError(
      expect.objectContaining({
        code: 'ARTIFACT_OFFLINE_PLACEHOLDER',
        relativePath: 'assets/generated.bin',
      }),
    );
  });

  test('rejeita symlink, binário disfarçado e payload PHP/ZIP', () => {
    const symlinkArtifact = createValidArtifact();
    symlinkSync(
      path.join(symlinkArtifact, 'index.html'),
      path.join(symlinkArtifact, 'assets', 'linked.html'),
    );
    expect(() => validateDeployArtifact(symlinkArtifact)).toThrowError(
      expect.objectContaining({
        code: 'ARTIFACT_UNSUPPORTED_ENTRY',
      }),
    );

    const binaryArtifact = createValidArtifact();
    writeFileSync(
      path.join(binaryArtifact, 'assets', 'disguised.js'),
      new Uint8Array([0x00, 0x01, 0x02]),
    );
    expect(() => validateDeployArtifact(binaryArtifact)).toThrowError(
      expect.objectContaining({
        code: 'ARTIFACT_BINARY_DISGUISED_AS_TEXT',
      }),
    );

    for (const filename of ['unzip.php', 'dist.zip']) {
      const executableArtifact = createValidArtifact();
      writeFileSync(
        path.join(executableArtifact, filename),
        new TextEncoder().encode('not executable, but forbidden by policy'),
      );
      expect(() => validateDeployArtifact(executableArtifact)).toThrowError(
        expect.objectContaining({
          code: 'ARTIFACT_EXECUTABLE_PAYLOAD',
          relativePath: filename,
        }),
      );
    }
  });

  test('aplica limites de arquivo, contagem e tamanho total', () => {
    const perFileArtifact = createValidArtifact();
    expect(() =>
      validateDeployArtifact(perFileArtifact, {
        maxFileBytes: 8,
        maxFiles: 100,
        maxTotalBytes: 1_000,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'ARTIFACT_FILE_SIZE_LIMIT',
      }),
    );

    const fileCountArtifact = createValidArtifact();
    expect(() =>
      validateDeployArtifact(fileCountArtifact, {
        maxFileBytes: 1_000,
        maxFiles: 2,
        maxTotalBytes: 1_000,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'ARTIFACT_FILE_COUNT_LIMIT',
      }),
    );

    const totalArtifact = createValidArtifact();
    expect(() =>
      validateDeployArtifact(totalArtifact, {
        maxFileBytes: 1_000,
        maxFiles: 100,
        maxTotalBytes: 32,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'ARTIFACT_TOTAL_SIZE_LIMIT',
      }),
    );
  });

  test('rejeita arquivos obrigatórios vazios ou estruturalmente inválidos', () => {
    const missingSitemap = createValidArtifact();
    rmSync(path.join(missingSitemap, 'sitemap.xml'));
    expect(() => validateDeployArtifact(missingSitemap)).toThrowError(
      expect.objectContaining({
        code: 'ARTIFACT_REQUIRED_FILE_MISSING',
        relativePath: 'sitemap.xml',
      }),
    );

    for (const [filename, content] of [
      ['index.html', ''],
      ['sitemap.xml', ''],
      ['sitemap.xml', '<not-a-sitemap />'],
    ]) {
      const invalidArtifact = createValidArtifact();
      writeFileSync(path.join(invalidArtifact, filename), content);
      expect(() => validateDeployArtifact(invalidArtifact)).toThrowError(
        expect.objectContaining({
          code: 'ARTIFACT_REQUIRED_FILE_INVALID',
          relativePath: filename,
        }),
      );
    }
  });

  test.each([
    '-----BEGIN PRIVATE KEY-----\\nredacted\\n-----END PRIVATE KEY-----',
    'AKIA1234567890ABCDEF',
    'ghp_123456789012345678901234567890',
    'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz',
    'sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz',
    'sk-1234567890abcdefghijklmnopqrstuvwxyz',
    'sb_secret_1234567890abcdefghijklmnopqrstuvwxyz',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature123',
  ])('rejeita formato de credencial sem registrar seu conteúdo', (secretShape) => {
    const directory = createValidArtifact();
    const relativePath = `assets/${secretShape.slice(0, 8)}.js`;
    writeFileSync(
      path.join(directory, relativePath),
      new TextEncoder().encode(`const value = ${JSON.stringify(secretShape)};`),
    );

    let caughtError;
    try {
      validateDeployArtifact(directory);
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toMatchObject({
      code: 'ARTIFACT_SECRET_SHAPE',
      relativePath,
    });

    const formatted = JSON.stringify(
      formatArtifactValidationError(caughtError),
    );
    expect(formatted).not.toContain(secretShape);
    expect(formatted).not.toContain(relativePath);
    expect(formatted).toContain('pathDigest');
  });

  test.each([
    'sk-short',
    'sk-projeto-sem-credencial',
    'sb_publishable_1234567890abcdefghijklmnopqrstuvwxyz',
    'documentacao sobre sk-ant sem valor',
  ])('não bloqueia texto comum que não tem formato de segredo: %s', (text) => {
    const directory = createValidArtifact();
    writeFileSync(
      path.join(directory, 'assets', 'ordinary-copy.js'),
      JSON.stringify(text),
    );

    expect(validateDeployArtifact(directory)).toMatchObject({ ok: true });
  });

  test('rejeita raiz e subdiretório simbólicos', () => {
    const artifact = createValidArtifact();
    const rootLink = path.join(createTemporaryDirectory(), 'artifact-link');
    symlinkSync(artifact, rootLink);
    expect(() => validateDeployArtifact(rootLink)).toThrowError(
      expect.objectContaining({
        code: 'ARTIFACT_DIRECTORY_INVALID',
      }),
    );

    const directoryLinkArtifact = createValidArtifact();
    const outsideDirectory = createTemporaryDirectory();
    writeFileSync(path.join(outsideDirectory, 'external.js'), 'safe');
    symlinkSync(
      outsideDirectory,
      path.join(directoryLinkArtifact, 'linked-directory'),
    );
    expect(() => validateDeployArtifact(directoryLinkArtifact)).toThrowError(
      expect.objectContaining({
        code: 'ARTIFACT_UNSUPPORTED_ENTRY',
        relativePath: 'linked-directory',
      }),
    );
  });

  test('rejeita binário que excede o limite configurado', () => {
    const directory = createValidArtifact();
    writeFileSync(
      path.join(directory, 'assets', 'large.bin'),
      new Uint8Array(65),
    );

    expect(() =>
      validateDeployArtifact(directory, {
        maxFileBytes: 64,
        maxFiles: 100,
        maxTotalBytes: 1_000,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'ARTIFACT_FILE_SIZE_LIMIT',
        relativePath: 'assets/large.bin',
      }),
    );
  });
});

describe('legacy deployment safety', () => {
  // Os entrypoints abaixo foram movidos para _archive/ (Patches 2 e 5) porque o
  // deploy FTP/Hostinger foi substituído pelo gate GCP (scripts/validate-deploy-artifact.mjs
  // + GitHub Actions). O guard aqui garante que se alguém reintroduzir um deles
  // no path antigo, o teste falhe. Os paths no array apontam para o _archive/:
  // quem reintroduzir no root vai falhar ENOENT, e a correção é atualizar este array.
  const legacyEntrypoints = [
    '_archive/root-scripts/deploy.sh',
    '_archive/root-scripts/upload_worker.sh',
    '_archive/scripts-legacy/deploy.js',
    '_archive/scripts-legacy/deploy-basic.js',
    '_archive/scripts-legacy/deploy-chunked.js',
    '_archive/scripts-legacy/deploy-zip.js',
  ];

  test.each(legacyEntrypoints)(
    '%s encerra com falha antes de carregar qualquer cliente FTP',
    (entrypoint) => {
      const command = entrypoint.endsWith('.sh') ? '/bin/sh' : process.execPath;
      const result = spawnSync(command, [entrypoint], {
        cwd: path.resolve(import.meta.dirname, '..'),
        encoding: 'utf8',
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('LEGACY_FTP_DEPLOY_DISABLED');
      // O stderr cita o nome do script (basename), não o path completo de invocação.
      // Validamos o basename para que a asserção sobreviva a reorganizações de diretório.
      const basename = entrypoint.split('/').pop();
      expect(result.stderr).toContain(basename);

      const source = readFileSync(
        path.resolve(import.meta.dirname, '..', entrypoint),
        'utf8',
      );
      expect(source).not.toMatch(
        /basic-ftp|ftp-deploy|dotenv|curl\s+-T|ftp:\/\//,
      );
    },
  );

  test('workflow é manual, valida e preserva artefato sem publicar por FTP', () => {
    const workflow = readFileSync(
      path.resolve(import.meta.dirname, '../.github/workflows/deploy.yml'),
      'utf8',
    );

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/\bpush:/);
    expect(workflow).toContain('validate-deploy-artifact.mjs');
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).not.toMatch(/FTP-Deploy-Action|FTP_(SERVER|USERNAME|PASSWORD)/);
  });
});
