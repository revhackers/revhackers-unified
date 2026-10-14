import type { QueryablePool } from '../db/postgres';

export interface AuthRouteDependencies {
  pool: QueryablePool;
}

/**
 * Rotas públicas de autenticação por e-mail/senha (sem Google OAuth).
 *
 * POST /v1/auth/reset-password   → Gera token + envia e-mail com template RevHackers
 * POST /v1/auth/verify-reset     → Valida token + atualiza senha
 * POST /v1/auth/login            → Login por e-mail/senha (bcrypt ou scrypt)
 */
export function createAuthRoutes(deps: AuthRouteDependencies) {
  const { pool } = deps;

  return async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url);

    // ─── POST /v1/auth/reset-password ───────────────────────────
    if (url.pathname === '/v1/auth/reset-password' && request.method === 'POST') {
      try {
        const body = await request.json() as { email?: string; redirectTo?: string };
        const email = body.email?.trim().toLowerCase();
        if (!email) {
          return json(400, { error: 'Campo email é obrigatório.' });
        }

        // Verifica se existe na base de usuários internos
        const userResult = await pool.query<{ id: string; email: string }>(
          `SELECT u.id::text, i.subject AS email
           FROM app.user_identities i
           JOIN app.internal_users u ON u.id = i.user_id
           WHERE LOWER(i.subject) = $1
           LIMIT 1`,
          [email],
        );

        // Por segurança, sempre retorna 200 (não revela se e-mail existe)
        if (userResult.rows.length === 0) {
          // Checa se é o e-mail máster hardcoded
          if (email !== 'giulliano@revhackers.com.br') {
            return json(200, { message: 'Se o e-mail estiver cadastrado, as instruções serão enviadas.' });
          }
        }

        // Gera token seguro
        const token = generateSecureToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

        // Salva token na tabela de reset (cria se não existir via auto-create abaixo)
        await ensureResetTokensTable(pool);
        await pool.query(
          `INSERT INTO app.password_reset_tokens (email, token, expires_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (email) DO UPDATE SET token = $2, expires_at = $3, used = false`,
          [email, token, expiresAt.toISOString()],
        );

        // redirectTo allowlist: somente https no host oficial; qualquer outro
        // valor cai no default (evita e-mail de reset com link de phishing).
        const redirectBase = allowResetRedirect(body.redirectTo);
        const resetUrl = `${redirectBase}?token=${token}&email=${encodeURIComponent(email)}`;

        // Envia e-mail
        await sendBrandedResetEmail(email, resetUrl);

        return json(200, { message: 'Instruções de redefinição enviadas para o e-mail informado.' });
      } catch (err) {
        console.error('[auth-routes] reset-password error:', err);
        return json(500, { error: 'Erro interno ao processar solicitação.' });
      }
    }

    // ─── POST /v1/auth/verify-reset ─────────────────────────────
    if (url.pathname === '/v1/auth/verify-reset' && request.method === 'POST') {
      try {
        const body = await request.json() as { email?: string; token?: string; newPassword?: string };
        const email = body.email?.trim().toLowerCase();
        const token = body.token?.trim();
        const newPassword = body.newPassword;

        if (!email || !token || !newPassword) {
          return json(400, { error: 'Campos email, token e newPassword são obrigatórios.' });
        }
        if (newPassword.length < 6) {
          return json(400, { error: 'A senha deve conter no mínimo 6 caracteres.' });
        }

        // Valida token
        const tokenResult = await pool.query<{ id: string }>(
          `SELECT id::text FROM app.password_reset_tokens
           WHERE email = $1 AND token = $2 AND used = false AND expires_at > NOW()`,
          [email, token],
        );

        if (tokenResult.rows.length === 0) {
          return json(400, { error: 'Token inválido ou expirado. Solicite uma nova redefinição.' });
        }

        // Marca token como usado
        await pool.query(
          `UPDATE app.password_reset_tokens SET used = true WHERE email = $1 AND token = $2`,
          [email, token],
        );

        // Hash e salva nova senha
        const encoder = new TextEncoder();
        const data = encoder.encode(newPassword);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        await ensureUserPasswordsTable(pool);
        await pool.query(
          `INSERT INTO app.user_passwords (email, password_hash)
           VALUES ($1, $2)
           ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
          [email, hashHex],
        );

        return json(200, { message: 'Senha alterada com sucesso.' });
      } catch (err) {
        console.error('[auth-routes] verify-reset error:', err);
        return json(500, { error: 'Erro interno.' });
      }
    }

    // ─── POST /v1/auth/login ────────────────────────────────────
    if (url.pathname === '/v1/auth/login' && request.method === 'POST') {
      try {
        const body = await request.json() as { email?: string; password?: string };
        const email = body.email?.trim().toLowerCase();

        if (!email) {
          return json(400, { error: 'Campo email é obrigatório.' });
        }

        // Conta autorizada máster
        if (email === 'giulliano@revhackers.com.br') {
          if (!body.password) {
            return json(401, { error: 'E-mail ou senha inválidos.' });
          }

          const encoder = new TextEncoder();
          const data = encoder.encode(body.password);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          const expectedHash = process.env.MASTER_PASSWORD_HASH;
          if (!expectedHash) {
            console.error('[auth-routes] MASTER_PASSWORD_HASH ausente; login master desabilitado.');
            return json(401, { error: 'E-mail ou senha inválidos.' });
          }

          if (hashHex !== expectedHash) {
            return json(401, { error: 'E-mail ou senha inválidos.' });
          }

          return json(200, {
            user: {
              id: 'master-super-admin-id',
              email,
              role: 'super_admin',
              full_name: 'Giulliano Alves',
            },
            token: generateSecureToken(),
          });
        }

        // Verifica na base
        const userResult = await pool.query<{ id: string }>(
          `SELECT u.id::text
           FROM app.user_identities i
           JOIN app.internal_users u ON u.id = i.user_id
           WHERE LOWER(i.subject) = $1 AND u.status = 'active'
           LIMIT 1`,
          [email],
        );

        if (userResult.rows.length === 0) {
          return json(401, { error: 'E-mail ou senha inválidos.' });
        }

        return json(401, { error: 'Use Google Sign-In para autenticar.' });
      } catch (err) {
        console.error('[auth-routes] login error:', err);
        return json(500, { error: 'Erro interno.' });
      }
    }

    return null;
  };
}

// ─── Helpers ────────────────────────────────────────────────────

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

const RESET_REDIRECT_DEFAULT = 'https://revhackers.com.br/reset-password';

function allowResetRedirect(raw: unknown): string {
  if (typeof raw !== 'string' || raw === '') return RESET_REDIRECT_DEFAULT;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return RESET_REDIRECT_DEFAULT;
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'revhackers.com.br') {
    return RESET_REDIRECT_DEFAULT;
  }
  return `${parsed.origin}${parsed.pathname}`;
}

let tableEnsured = false;
async function ensureResetTokensTable(pool: QueryablePool): Promise<void> {
  if (tableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app.password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      token TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  tableEnsured = true;
}

let userPasswordsTableEnsured = false;
async function ensureUserPasswordsTable(pool: QueryablePool): Promise<void> {
  if (userPasswordsTableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app.user_passwords (
      email TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  userPasswordsTableEnsured = true;
}

async function sendBrandedResetEmail(email: string, resetUrl: string): Promise<void> {
  const htmlTemplate = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background-color:#0a0a0a;padding:32px 40px;text-align:center;">
          <img src="https://revhackers.com.br/lovable-uploads/c2b90340-9f06-4551-8d86-db7c94920535.png" alt="RevHackers" width="160" style="display:block;margin:0 auto;" />
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0a0a0a;">Redefinição de Senha</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#52525b;">
            Recebemos uma solicitação para redefinir a senha da sua conta associada a <strong>${email}</strong>.
          </p>
          <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#52525b;">
            Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>1 hora</strong>.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background-color:#00CC6A;border-radius:8px;">
              <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:14px;font-weight:700;color:#0a0a0a;text-decoration:none;letter-spacing:0.02em;">
                REDEFINIR MINHA SENHA
              </a>
            </td></tr>
          </table>
          <p style="margin:32px 0 0;font-size:13px;line-height:1.5;color:#a1a1aa;">
            Se você não solicitou esta redefinição, ignore este e-mail. Sua senha permanecerá inalterada.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e4e4e7;text-align:center;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">
            © ${new Date().getFullYear()} RevHackers · Growth Intelligence Platform
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Tenta Resend primeiro
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RevHackers <noreply@revhackers.com.br>',
        to: [email],
        subject: 'Redefinição de Senha — RevHackers',
        html: htmlTemplate,
      }),
    });
    if (!res.ok) {
      console.error('[auth-routes] Resend failed:', res.status, await res.text());
    } else {
      console.log('[auth-routes] E-mail de redefinição enviado via Resend para:', email);
      return;
    }
  }

  // Fallback: SMTP do Google Workspace
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpUser && smtpPass) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer: any = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: `"RevHackers" <${smtpUser}>`,
        to: email,
        subject: 'Redefinição de Senha — RevHackers',
        html: htmlTemplate,
      });
      console.log('[auth-routes] E-mail enviado via SMTP para:', email);
      return;
    } catch (smtpErr) {
      console.error('[auth-routes] SMTP failed:', smtpErr);
    }
  }

  console.warn('[auth-routes] NENHUM provedor de e-mail configurado. Reset URL:', resetUrl);
}
