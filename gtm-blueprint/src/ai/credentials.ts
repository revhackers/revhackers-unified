export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export function fromEnv(): AwsCredentials | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  if (accessKeyId && secretAccessKey) {
    return {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    };
  }
  return null;
}

export async function fromAwsCliSession(profile = 'default'): Promise<AwsCredentials> {
  // Exception: platform-specific module (node:child_process) does not exist in Cloudflare Workers.
  const { execSync } = await import('node:child_process');
  try {
    const stdout = execSync(`aws configure export-credentials --profile ${profile} --format process`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const parsed = JSON.parse(stdout.trim()) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'AccessKeyId' in parsed &&
      'SecretAccessKey' in parsed &&
      typeof (parsed as Record<string, unknown>).AccessKeyId === 'string' &&
      typeof (parsed as Record<string, unknown>).SecretAccessKey === 'string'
    ) {
      const p = parsed as { AccessKeyId: string; SecretAccessKey: string; SessionToken?: string };
      return {
        accessKeyId: p.AccessKeyId,
        secretAccessKey: p.SecretAccessKey,
        ...(p.SessionToken ? { sessionToken: p.SessionToken } : {}),
      };
    }
    throw new Error('Invalid credentials format exported from AWS CLI');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load AWS credentials from CLI session profile '${profile}': ${message}`);
  }
}

export async function resolveCredentials(profile = 'default'): Promise<AwsCredentials> {
  const envCreds = fromEnv();
  if (envCreds) {
    return envCreds;
  }
  return fromAwsCliSession(profile);
}
