import express from 'express';
import { supabase } from '../supabaseClient.js';
import { supabaseAdmin } from '../supabaseClient.js';
import { sendMail } from '../services/mailer.js';
import {
  buildResetUrl,
  createRateLimitKey,
  createRawToken,
  hashToken,
  isValidEmail,
  normalizeEmail,
  readClientIp,
  validatePassword,
} from '../services/passwordReset.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(401).json({ error: authError.message });
    }

    if (!authData.user || !authData.session) {
      return res.status(500).json({ error: 'Failed to retrieve session' });
    }

    // 2. Fetch user role from our custom 'usuarios' table
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('papel, clinica_id, nome')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      // We still return success but without custom user data, though ideally this shouldn't happen
      return res.status(200).json({
        session: authData.session,
        user: {
          ...authData.user,
          papel: 'unknown',
        }
      });
    }

    // 3. Return session and user data including role
    res.status(200).json({
      session: authData.session,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        nome: userData.nome,
        papel: userData.papel,
        clinica_id: userData.clinica_id,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function audit(params: {
  email: string;
  user_id: string | null;
  ip: string;
  user_agent: string;
  action: string;
  result: 'OK' | 'DENY' | 'ERROR';
  error_code?: string | null;
}) {
  const { email, user_id, ip, user_agent, action, result, error_code } = params;
  await supabaseAdmin.from('password_reset_audit').insert({
    email,
    user_id,
    ip,
    user_agent,
    action,
    result,
    error_code: error_code ?? null,
  });
}

async function checkRateLimit(params: { email: string; ip: string }) {
  const maxAttempts = Number(process.env.PASSWORD_RESET_MAX_ATTEMPTS ?? 5);
  const windowSeconds = Number(process.env.PASSWORD_RESET_WINDOW_SECONDS ?? 900);
  const now = new Date();
  const key = createRateLimitKey({ email: params.email, ip: params.ip });

  const { data: existing, error: findError } = await supabaseAdmin
    .from('password_reset_rate_limit')
    .select('id,count,window_start')
    .eq('key', key)
    .maybeSingle();
  if (findError) {
    return { ok: true as const, degraded: true as const };
  }

  const windowStart = existing?.window_start ? new Date(String(existing.window_start)) : null;
  const within = windowStart ? now.getTime() - windowStart.getTime() < windowSeconds * 1000 : false;

  const nextCount = within ? Number(existing?.count ?? 0) + 1 : 1;
  const nextWindowStart = within && windowStart ? windowStart.toISOString() : now.toISOString();

  if (within && Number(existing?.count ?? 0) >= maxAttempts) {
    return { ok: false as const };
  }

  await supabaseAdmin.from('password_reset_rate_limit').upsert(
    {
      key,
      count: nextCount,
      window_start: nextWindowStart,
      updated_at: now.toISOString(),
    },
    { onConflict: 'key' },
  );

  return { ok: true as const, degraded: false as const };
}

router.post('/forgot-password', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const ip = readClientIp(req.header('x-forwarded-for') ?? req.socket.remoteAddress);
  const userAgent = String(req.header('user-agent') ?? '').slice(0, 240);

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Informe um e-mail válido.' });
  }

  const rate = await checkRateLimit({ email, ip });
  if (!rate.ok) {
    await audit({ email, user_id: null, ip, user_agent: userAgent, action: 'RATE_LIMITED', result: 'DENY', error_code: 'RATE_LIMITED' });
    return res.status(429).json({
      ok: true,
      message: 'Se existir uma conta para este e-mail, você receberá um link em alguns minutos.',
    });
  }

  await audit({ email, user_id: null, ip, user_agent: userAgent, action: 'REQUESTED', result: 'OK', error_code: rate.degraded ? 'RATE_LIMIT_DEGRADED' : null });

  const { data: userRow, error: userError } = await supabaseAdmin
    .from('usuarios')
    .select('id,ativo')
    .eq('email', email)
    .maybeSingle();

  if (userError || !userRow?.id || userRow.ativo === false) {
    await audit({ email, user_id: userRow?.id ?? null, ip, user_agent: userAgent, action: 'EMAIL_TRIGGERED', result: 'OK', error_code: 'NO_ACCOUNT_OR_INACTIVE' });
    return res.status(200).json({
      ok: true,
      message: 'Se existir uma conta para este e-mail, você receberá um link em alguns minutos.',
    });
  }

  const token = createRawToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const ttlMinutes = Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 60);
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000).toISOString();

  const { error: insertError } = await supabaseAdmin.from('password_reset_tokens').insert({
    user_id: userRow.id,
    email,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_ip: ip,
    created_user_agent: userAgent,
  });

  if (insertError) {
    await audit({ email, user_id: userRow.id, ip, user_agent: userAgent, action: 'EMAIL_TRIGGERED', result: 'ERROR', error_code: 'TOKEN_PERSIST_FAILED' });
    return res.status(500).json({ error: 'Não foi possível processar agora. Tente novamente.' });
  }

  const appUrl = String(process.env.PUBLIC_APP_URL ?? '').trim();
  if (!appUrl) {
    await audit({ email, user_id: userRow.id, ip, user_agent: userAgent, action: 'EMAIL_TRIGGERED', result: 'ERROR', error_code: 'PUBLIC_APP_URL_NOT_CONFIGURED' });
    return res.status(500).json({ error: 'Não foi possível processar agora. Tente novamente.' });
  }

  const resetUrl = buildResetUrl({ appUrl, token });

  try {
    const brandName = 'Osler Notes'
    const baseUrl = appUrl.replace(/\/+$/, '')
    const logoUrl = `${baseUrl}/brand/generated/png/oslerlogo-256x256.png`
    await sendMail({
      to: email,
      subject: `Recuperação de senha — ${brandName}`,
      text: `Use o link a seguir para redefinir sua senha: ${resetUrl}`,
      html: `
        <div style="background:#0A0B0D;padding:24px">
          <div style="max-width:560px;margin:0 auto;background:#111214;border:1px solid #26282c;border-radius:18px;padding:24px;color:#ffffff;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
              <div style="width:44px;height:44px;background:#ffffff;border-radius:12px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                <img src="${logoUrl}" width="44" height="44" alt="Osler Notes Logo" style="display:block" />
              </div>
              <div style="line-height:1.1">
                <div style="font-size:16px;font-weight:700;letter-spacing:-0.01em">${brandName}</div>
                <div style="font-size:12px;color:#9aa0a6;letter-spacing:0.08em;text-transform:uppercase">Recuperação de senha</div>
              </div>
            </div>

            <div style="font-size:14px;color:#d6d9dd;line-height:1.55">
              <p style="margin:0 0 12px">Use o botão abaixo para redefinir sua senha. Se você não solicitou esta ação, ignore este e-mail.</p>
              <p style="margin:0 0 18px">
                <a href="${resetUrl}" style="display:inline-block;background:#007AFF;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:12px;font-weight:600">Redefinir senha</a>
              </p>
              <p style="margin:0;color:#9aa0a6;font-size:12px">Se o botão não funcionar, copie e cole este link no navegador:</p>
              <p style="margin:8px 0 0;word-break:break-all">
                <a href="${resetUrl}" style="color:#7aa7ff;text-decoration:underline">${resetUrl}</a>
              </p>
            </div>
          </div>
          <div style="max-width:560px;margin:14px auto 0;text-align:center;color:#7b8088;font-size:11px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
            © ${new Date().getFullYear()} ${brandName}
          </div>
        </div>
      `,
    });
    await audit({ email, user_id: userRow.id, ip, user_agent: userAgent, action: 'EMAIL_TRIGGERED', result: 'OK' });
  } catch (e) {
    const code = e instanceof Error ? e.message : 'MAIL_SEND_FAILED';
    await audit({ email, user_id: userRow.id, ip, user_agent: userAgent, action: 'EMAIL_TRIGGERED', result: 'ERROR', error_code: code });
    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).json({ ok: true, message: 'Se existir uma conta para este e-mail, você receberá um link em alguns minutos.', debug_reset_url: resetUrl });
    }
  }

  return res.status(200).json({
    ok: true,
    message: 'Se existir uma conta para este e-mail, você receberá um link em alguns minutos.',
  });
});

router.get('/reset-password/validate', async (req, res) => {
  const token = String(req.query.token ?? '').trim();
  if (!token) return res.status(400).json({ error: 'token_required' });
  const tokenHash = hashToken(token);
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('id,expires_at,used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error || !data?.id) return res.status(400).json({ error: 'token_invalid' });
  if (data.used_at) return res.status(400).json({ error: 'token_used' });
  if (String(data.expires_at) <= nowIso) return res.status(400).json({ error: 'token_expired' });
  return res.status(200).json({ ok: true });
});

router.post('/reset-password', async (req, res) => {
  const token = String(req.body?.token ?? '').trim();
  const password = String(req.body?.password ?? '');
  const ip = readClientIp(req.header('x-forwarded-for') ?? req.socket.remoteAddress);
  const userAgent = String(req.header('user-agent') ?? '').slice(0, 240);

  if (!token) return res.status(400).json({ error: 'token_required' });

  const pw = validatePassword(password);
  if (!pw.ok) {
    return res.status(400).json({ error: pw.message, code: pw.code });
  }

  const tokenHash = hashToken(token);
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: row, error: findError } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('id,user_id,email,expires_at,used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (findError || !row?.id) {
    return res.status(400).json({ error: 'Link inválido.' , code: 'TOKEN_INVALID' });
  }
  if (row.used_at) {
    return res.status(400).json({ error: 'Este link já foi usado.' , code: 'TOKEN_USED' });
  }
  if (String(row.expires_at) <= nowIso) {
    await audit({ email: String(row.email ?? ''), user_id: String(row.user_id ?? null), ip, user_agent: userAgent, action: 'RESET_FAILED', result: 'DENY', error_code: 'TOKEN_EXPIRED' });
    return res.status(400).json({ error: 'Este link expirou. Solicite um novo.', code: 'TOKEN_EXPIRED' });
  }

  const userId = String(row.user_id);
  const email = String(row.email ?? '');

  try {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    if (updateError) {
      await audit({ email, user_id: userId, ip, user_agent: userAgent, action: 'RESET_FAILED', result: 'ERROR', error_code: updateError.message });
      return res.status(500).json({ error: 'Não foi possível redefinir agora. Tente novamente.', code: 'RESET_FAILED' });
    }

    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: nowIso, used_ip: ip, used_user_agent: userAgent })
      .eq('id', row.id);

    await audit({ email, user_id: userId, ip, user_agent: userAgent, action: 'RESET_SUCCEEDED', result: 'OK' });

    return res.status(200).json({ ok: true });
  } catch (e) {
    await audit({ email, user_id: userId, ip, user_agent: userAgent, action: 'RESET_FAILED', result: 'ERROR', error_code: e instanceof Error ? e.message : 'RESET_FAILED' });
    return res.status(500).json({ error: 'Não foi possível redefinir agora. Tente novamente.', code: 'RESET_FAILED' });
  }
});

export default router;
