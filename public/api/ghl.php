<?php
/**
 * ghl.php — RevHackers public lead relay (HARDENED).
 *
 * Location of THIS file: public/api/ghl.php in the revhackers repo (DEPLOYED
 * to Hostinger via deploy-hostinger.yml; requires GHL_PRIVATE_TOKEN env).
 * Lab origin (read-only reference): ghl-fix-v5 under
 *
 * Hardening checklist (slice F2, 12 items):
 *  1. GHL_PRIVATE_TOKEN via getenv() ONLY, fail-closed 500 + error_log WITHOUT
 *     the value. No hardcoded fallback, ever.
 *  2. Config validation: the token (no safe default exists) is fail-closed 500.
 *     Every other knob has a compiled safe default: invalid/missing values fall
 *     back to the default + one error_log line per process (never per request,
 *     to avoid log flooding). Rationale: a typo in an optional tunable must not
 *     500 every legit lead form; the defaults ARE the secure values. See README
 *     "Decisão item 2".
 *  3. Required contact channel: e-mail OR phone. E-mail via FILTER_VALIDATE_EMAIL
 *     (+ explicit CR/LF reject). Phone via digit-count sanity: 8–15 digits
 *     (E.164 range) after stripping non-digits; out of range => 422.
 *  4. Caps: raw body 64 KB (413, unchanged) + top-level field count cap
 *     (default 64 => 413) + per-field byte cap (default 8192 => 422).
 *  5. Strict types: scalar-expected keys receiving array/object => 422.
 *     `tags` must be an array (scalar coerced to 1-entry, entries sanitized);
 *     `customFields` must be an array of {id,value} scalar pairs (malformed
 *     entries dropped, values truncated). Unknown keys are dropped by the
 *     whitelist as before (but still count toward the field-count cap).
 *  6. Errors: EVERY failure returns generic JSON {"error":"..."} — no paths, no
 *     curl details, no upstream bodies. display_errors forced off. Upstream curl
 *     error => 500 + server log (detail server-side only). Upstream non-2xx =>
 *     generic 500 + server log with the status code only (CHANGED vs v1, which
 *     passed every upstream body through as 200; frontend-safe because
 *     ghlRelay.ts treats any non-2xx as non-critical `false`). Success (2xx)
 *     keeps the v1 contract: HTTP 200 + upstream body byte-for-byte, because
 *     the frontend only checks response.ok. Whether to propagate real upstream
 *     statuses on success stays PENDING (server follow-up).
 *  7. Timeouts: upsert 10s, GCP provision 5s, GHL conversations message 10s —
 *     set on EVERY ghl_http_post call (constants below; asserted by tests via
 *     the stub's $timeoutSecs). mail() is a synchronous local-MTA handoff with
 *     no PHP-level timeout knob; MTA-level review stays PENDING (server).
 *  8. Abuse: file-based per-IP sliding-log limiter kept (zero new deps), but
 *     hardened vs v1: bounded blocking lock-wait (<=100ms, 5ms slices) instead
 *     of instant LOCK_NB fail-open, so concurrent floods serialize and get
 *     COUNTED instead of all slipping through; hits array hard-capped at
 *     5×max; files store float timestamps only (no PII); filenames are
 *     md5(salt|ip) (no PII, no cross-site collision on shared /tmp). A
 *     sleep()-based tarpit was explicitly REJECTED: on shared hosting PHP
 *     workers are scarce, so forced sleeps amplify DoS (attacker ties up
 *     workers for free). GHL_ABUSE_BACKEND is a forward hook: only 'file' is
 *     implemented; any other value logs once per process and fails OPEN (never
 *     break legit forms). Real bot protection (Turnstile / hosting throttle) is
 *     PENDING owner decision — see README authorization list.
 *  9. Idempotency: sha256(identity|actionType|canonical payload JSON), where
 *     identity is lower(email), or digit-normalized phone ('tel:'-prefixed)
 *     for phone-only leads (Cycle A BUG2 fix; e-mail keys byte-identical to
 *     v2, so existing cache entries still hit). TTL 600s (env
 *     GHL_IDEMPOTENCY_TTL, 0 disables), file cache in
 *     GHL_IDEMPOTENCY_DIR. A hit returns the stored success body with 200 and
 *     ZERO upstream calls (no new GHL write, no GCP provision, no e-mail) —
 *     double-click/double-submit safe. Only 2xx upstream responses are cached;
 *     errors never are. Any cache error fails OPEN (process normally).
 *     Opportunistic stale-file pruning (1% of stores + forced in tests).
 * 10. Mail safety: CR/LF stripped from To (then re-validated; invalid => mail
 *     skipped + logged), from Subject BEFORE base64 encoding, and from header
 *     lines. Tests prove injection strings are neutralized. SMTP
 *     deliverability review stays PENDING.
 * 11. URL/data validation: non-empty website/materialLink must be http(s) URLs
 *     (FILTER_VALIDATE_URL + scheme allowlist; javascript:/data:/ftp:/CRLF
 *     rejected). Identity fields (e-mail/phone) reject the request (422);
 *     OPTIONAL URL fields are dropped + logged (field name only, never the
 *     value) so a bad marketing link never loses the lead. GCP provision
 *     inputs get the same treatment (e-mail re-validated, name/company cast +
 *     CR/LF-stripped + truncated, JSON-encode failure => skip).
 * 12. Contract: byte/behavior compatibility with src/lib/ghlRelay.ts verified
 *     in tests — status codes + JSON shapes for success, download-tracking,
 *     and every error case (see README contract table).
 *
 * Request pipeline order (each step returns before doing later work):
 *   CORS/OPTIONS -> method -> content-type -> config(fail-closed) ->
 *   rate-limit -> body size -> JSON parse -> field-count -> strict types ->
 *   field lengths -> e-mail/phone -> build payload (+tags/customFields
 *   sanitize, UTF-8 encode check) -> optional-URL drops -> idempotency lookup
 *   -> upsert -> provision -> dispatch e-mail -> idempotency store ->
 *   200 + upstream bytes.
 * Rate-limit-before-validation also bounds error_log volume per IP.
 */

@ini_set('display_errors', '0');

define('GHL_MAX_BODY_BYTES', 65536); // 64 KB raw body cap (unchanged from v1)
define('GHL_DEFAULT_ALLOWED_ORIGIN', 'https://revhackers.com.br');
define('GHL_DEFAULT_LOCATION_ID', 'oFTw9DcsKRUj6xCiq4mb'); // subaccount id (not a secret); overridable via GHL_LOCATION_ID
define('GHL_DEFAULT_RL_MAX', 30);
define('GHL_DEFAULT_RL_WINDOW', 60);
define('GHL_DEFAULT_MAX_FIELDS', 64);
define('GHL_DEFAULT_MAX_FIELD_BYTES', 8192);
define('GHL_DEFAULT_IDEMPOTENCY_TTL', 600); // 10 min: covers double-click/retry storms
define('GHL_RL_SALT', 'revhackers-ghl-v2'); // filename salt: no cross-site collision on shared /tmp
define('GHL_RL_LOCK_WAIT_MS', 100); // bounded lock-wait (item 8); never a tarpit
define('GHL_TIMEOUT_UPSERT', 10);
define('GHL_TIMEOUT_GCP', 5);
define('GHL_TIMEOUT_MSG', 10);
define('GHL_GCP_MAX_NAME_BYTES', 256);

if (!function_exists('ghl_env_str')) {
    function ghl_env_str($name, $default) {
        $v = getenv($name);
        if ($v === false || $v === '') {
            return $default;
        }
        return $v;
    }
}

if (!function_exists('ghl_env_int')) {
    /**
     * Integer env with range clamp. Invalid/out-of-range => compiled default +
     * ONE error_log per process (static guard: never log per request, otherwise
     * a bad env floods the log at request volume). Item 2.
     */
    function ghl_env_int($name, $default, $min, $max) {
        static $warned = [];
        $raw = getenv($name);
        if ($raw === false || $raw === '') {
            return $default;
        }
        $v = filter_var(trim((string) $raw), FILTER_VALIDATE_INT);
        if ($v === false || $v < $min || $v > $max) {
            if (!isset($warned[$name])) {
                $warned[$name] = true;
                error_log('[ghl.php] env ' . $name . ' invalida/fora do intervalo; usando default seguro.');
            }
            return $default;
        }
        return $v;
    }
}

if (!function_exists('ghl_load_config')) {
    /**
     * Central config load (parsed fresh per request: never static-cache env,
     * CLI harness drives many requests per process). Item 2.
     * Returns array; 'token' === '' means fail-closed 500 (item 1).
     */
    function ghl_load_config() {
        $token = getenv('GHL_PRIVATE_TOKEN');
        $token = is_string($token) ? trim($token) : '';

        $origin = ghl_env_str('GHL_ALLOWED_ORIGIN', GHL_DEFAULT_ALLOWED_ORIGIN);
        $origin = trim($origin);
        if ($origin === '' || filter_var($origin, FILTER_VALIDATE_URL) === false
            || !preg_match('#^https?://#i', $origin)) {
            error_log('[ghl.php] GHL_ALLOWED_ORIGIN invalida; usando default seguro.');
            $origin = GHL_DEFAULT_ALLOWED_ORIGIN;
        }

        return [
            'token' => $token,
            'allowed_origin' => $origin,
            'location_id' => ghl_env_str('GHL_LOCATION_ID', GHL_DEFAULT_LOCATION_ID),
            'rl_max' => ghl_env_int('GHL_RATE_LIMIT_MAX', GHL_DEFAULT_RL_MAX, 1, 10000),
            'rl_window' => ghl_env_int('GHL_RATE_LIMIT_WINDOW', GHL_DEFAULT_RL_WINDOW, 1, 3600),
            'rl_dir' => ghl_env_str('GHL_RATELIMIT_DIR', sys_get_temp_dir()),
            'rl_salt' => ghl_env_str('GHL_RL_SALT', GHL_RL_SALT),
            'abuse_backend' => ghl_env_str('GHL_ABUSE_BACKEND', 'file'),
            'max_fields' => ghl_env_int('GHL_MAX_FIELDS', GHL_DEFAULT_MAX_FIELDS, 1, 1000),
            'max_field_bytes' => ghl_env_int('GHL_MAX_FIELD_BYTES', GHL_DEFAULT_MAX_FIELD_BYTES, 64, 65536),
            'idem_ttl' => ghl_env_int('GHL_IDEMPOTENCY_TTL', GHL_DEFAULT_IDEMPOTENCY_TTL, 0, 86400),
            'idem_dir' => ghl_env_str('GHL_IDEMPOTENCY_DIR', sys_get_temp_dir()),
            'max_mails_per_recipient' => ghl_env_int('GHL_MAX_MAILS_PER_RECIPIENT', 5, 1, 100),
            'template_dir' => ghl_env_str('GHL_TEMPLATE_DIR', __DIR__ . '/../templates'),
        ];
    }
}

if (!function_exists('ghl_get_raw_input')) {
    function ghl_get_raw_input() {
        return file_get_contents('php://input');
    }
}

if (!function_exists('ghl_http_post')) {
    /**
     * Minimal injectable HTTP POST helper (keeps the original curl shape:
     * JSON body, custom headers, SSL verification, timeouts).
     * Returns ['error' => ?string, 'http_code' => int, 'body' => string].
     */
    function ghl_http_post($url, $bodyJson, $headers, $timeoutSecs) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $bodyJson);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, (int) $timeoutSecs);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($err !== '') {
            return ['error' => $err, 'http_code' => 0, 'body' => ''];
        }
        return ['error' => null, 'http_code' => $code, 'body' => (string) $body];
    }
}

if (!function_exists('ghl_send_mail')) {
    function ghl_send_mail($to, $subjectEncoded, $htmlBody, $headers) {
        return @mail($to, $subjectEncoded, $htmlBody, $headers);
    }
}

if (!function_exists('ghl_send_header')) {
    /**
     * Sends an HTTP header unless output already started (CLI harness case).
     * In production (PHP-FPM/Apache) headers are always sent normally.
     */
    function ghl_send_header($headerLine) {
        if (!headers_sent()) {
            header($headerLine);
        }
    }
}

if (!function_exists('ghl_set_status')) {
    /**
     * Sets the HTTP response status unless output already started.
     * Always returns the status so callers (and the CLI harness) can rely
     * on the return value instead of re-reading the SAPI state.
     */
    function ghl_set_status($status) {
        if (!headers_sent()) {
            http_response_code($status);
        }
        return $status;
    }
}

if (!function_exists('ghl_respond_json')) {
    /**
     * Sends a generic JSON response. Exits in production; returns the status
     * code under test (GHL_UNDER_TEST) so a CLI harness can keep driving cases.
     * Payloads here MUST stay generic (item 6): static strings only.
     */
    function ghl_respond_json($status, $payload) {
        ghl_set_status($status);
        echo json_encode($payload);
        if (!defined('GHL_UNDER_TEST')) {
            exit();
        }
        return $status;
    }
}

if (!function_exists('ghl_respond_raw')) {
    /**
     * Passes an upstream body through byte-for-byte (preserves the success
     * contract: the frontend only checks HTTP status). Used ONLY for 2xx
     * upstream responses and idempotent replays — never for errors (item 6).
     */
    function ghl_respond_raw($status, $rawBody) {
        ghl_set_status($status);
        echo $rawBody;
        if (!defined('GHL_UNDER_TEST')) {
            exit();
        }
        return $status;
    }
}

if (!function_exists('ghl_to_scalar_string')) {
    /**
     * Casts scalar input to string; arrays/objects/null/booleans-as-absence?
     * No: booleans cast ('1'/'') — only array/object/null return null.
     * Item 5.
     */
    function ghl_to_scalar_string($v) {
        if (is_string($v)) {
            return $v;
        }
        if (is_int($v) || is_float($v) || is_bool($v)) {
            return (string) $v;
        }
        return null;
    }
}

if (!function_exists('ghl_strip_crlf')) {
    /** Header-injection guard: CR/LF can never survive in mail contexts (item 10). */
    function ghl_strip_crlf($v) {
        return str_replace(["\r", "\n"], '', (string) $v);
    }
}

if (!function_exists('ghl_is_safe_url')) {
    /**
     * URL allowlist: http/https only; rejects javascript:/data:/ftp:/CRLF/
     * unparseable. Empty is NOT safe here (callers treat '' as absent).
     * Item 11.
     */
    function ghl_is_safe_url($u) {
        $u = trim((string) $u);
        if ($u === '') {
            return false;
        }
        if (strpos($u, "\r") !== false || strpos($u, "\n") !== false) {
            return false;
        }
        if (filter_var($u, FILTER_VALIDATE_URL) === false) {
            return false;
        }
        return (bool) preg_match('#^https?://#i', $u);
    }
}

if (!function_exists('ghl_is_valid_phone')) {
    /**
     * Phone sanity: 8–15 digits (E.164 range) after stripping non-digits.
     * Item 3 (soft-reject 422 on failure).
     */
    function ghl_is_valid_phone($phone) {
        $digits = preg_replace('/\D+/', '', (string) $phone);
        $len = strlen($digits);
        return $len >= 8 && $len <= 15;
    }
}

if (!function_exists('ghl_is_valid_email')) {
    /** E-mail check with explicit CR/LF reject (defense in depth, item 3/10). */
    function ghl_is_valid_email($email) {
        $email = (string) $email;
        if (strpos($email, "\r") !== false || strpos($email, "\n") !== false) {
            return false;
        }
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
}

if (!function_exists('ghl_rate_limit_exceeded')) {
    /**
     * Best-effort sliding-log per-IP rate limiter, file backend, zero new
     * dependencies. Hardened vs v1 (item 8):
     *  - bounded blocking lock-wait (<= GHL_RL_LOCK_WAIT_MS, 5ms slices):
     *    concurrent floods serialize and get COUNTED instead of all passing
     *    through the old instant LOCK_NB fail-open;
     *  - still FAIL-OPEN on unwritable dir / unobtainable lock (legit lead
     *    forms must never break because the limiter broke);
     *  - hits array hard-capped at 5x max (bounds file size for huge windows);
     *  - stored content is float timestamps only (no PII); filename is
     *    md5(salt|ip) (no PII in the name, no cross-site collision on the
     *    shared /tmp of shared hosting);
     *  - GHL_ABUSE_BACKEND forward hook: only 'file' exists; anything else
     *    logs once per process and fails OPEN.
     * No sleep()-based tarpit: on shared hosting PHP workers are scarce and a
     * forced sleep is self-DoS amplification (documented tradeoff, README).
     */
    function ghl_rate_limit_exceeded($ip, $cfg = null) {
        if ($cfg === null) {
            $cfg = ghl_load_config();
        }
        $backend = isset($cfg['abuse_backend']) ? $cfg['abuse_backend'] : 'file';
        if ($backend !== 'file') {
            static $warnedBackend = false;
            if (!$warnedBackend) {
                $warnedBackend = true;
                error_log('[ghl.php] GHL_ABUSE_BACKEND desconhecido; sem backend local — fail-open.');
            }
            return false;
        }
        $max = (int) $cfg['rl_max'];
        $window = (int) $cfg['rl_window'];
        if ($max <= 0 || $window <= 0) {
            return false;
        }
        $dir = (string) $cfg['rl_dir'];
        $salt = (string) $cfg['rl_salt'];
        $file = rtrim($dir, '/\\') . '/ghl_v2_rl_' . md5($salt . '|' . (string) $ip) . '.json';
        // Best-effort symlink pre-creation guard (local-attacker model).
        // Residual TOCTOU on shared /tmp remains: prefer a private
        // GHL_RATELIMIT_DIR (0700, owned by the web user).
        if (@is_link($file)) {
            @unlink($file);
        }
        $fp = @fopen($file, 'c+');
        if (!$fp) {
            static $warnedRlStorage = false;
            if (!$warnedRlStorage) {
                $warnedRlStorage = true;
                error_log('[ghl.php] rate limiter indisponivel (storage); fail-open, sem protecao anti-abuso.');
            }
            return false; // fail-open: storage broken, never block the lead
        }
        // State must not stay world-readable on shared hosting (default
        // umask yields 0644; bucket content is timestamps but the idem
        // cache sibling can echo upstream PII).
        @chmod($file, 0600);
        // Bounded lock-wait: serialize brief contention instead of letting a
        // concurrent flood bypass the counter. Still fail-open past deadline.
        $locked = false;
        $deadline = microtime(true) + (GHL_RL_LOCK_WAIT_MS / 1000.0);
        do {
            if (@flock($fp, LOCK_EX | LOCK_NB)) {
                $locked = true;
                break;
            }
            usleep(5000);
        } while (microtime(true) < $deadline);
        if (!$locked) {
            @fclose($fp);
            static $warnedRlLock = false;
            if (!$warnedRlLock) {
                $warnedRlLock = true;
                error_log('[ghl.php] rate limiter sob contencao (lock); fail-open, hit nao contado.');
            }
            return false; // fail-open (lock contention beyond budget)
        }
        $now = microtime(true);
        $cutoff = $now - $window;
        $hits = [];
        $size = @filesize($file);
        if ($size > 0 && $size < 1048576) {
            $raw = @stream_get_contents($fp);
            $decoded = is_string($raw) ? json_decode($raw, true) : null;
            if (is_array($decoded)) {
                foreach ($decoded as $t) {
                    if (is_numeric($t) && $t >= $cutoff) {
                        $hits[] = (float) $t;
                    }
                }
            }
        }
        $hits[] = $now;
        if (count($hits) > 5 * $max) {
            $hits = array_slice($hits, -5 * $max);
        }
        // Best effort persist; ignore write errors (fail-open on next hit too).
        @ftruncate($fp, 0);
        @rewind($fp);
        @fwrite($fp, json_encode($hits));
        @fflush($fp);
        @flock($fp, LOCK_UN);
        @fclose($fp);
        return count($hits) > $max;
    }
}

if (!function_exists('ghl_canonical_mail_key')) {
    /**
     * Canonical recipient for ABUSE-COUNTING ONLY (never for delivery or
     * idempotency identity): lowercases and strips RFC-5233 "+tag" suffixes
     * so victim+1@x / victim+2@x share one throttle bucket with victim@x.
     * Assumption: '+' tags route to the same mailbox (true for Gmail,
     * Outlook, iCloud, Fastmail and most Brazilian providers). Providers
     * where '+' is a literal distinct local-part would over-throttle legit
     * distinct users — accepted tradeoff for a 5/day abuse cap; the lead is
     * still upserted and answered 200 either way. Round-2a P02 (B2).
     */
    function ghl_canonical_mail_key($emailLower) {
        $e = strtolower(trim((string) $emailLower));
        $parts = explode('@', $e);
        if (count($parts) === 2) {
            $local = $parts[0];
            $plus = strpos($local, '+');
            if ($plus !== false) { $local = substr($local, 0, $plus); }
            $e = $local . '@' . $parts[1];
        }
        return $e;
    }
}

if (!function_exists('ghl_recipient_mail_allowed')) {
    /**
     * Per-recipient mail throttle (abuse: the relay mails the *submitted*
     * address, so anyone can mail anyone; per-IP limiting alone leaves a
     * 30/min/IP branded-mail channel with attacker-influenced subject).
     * Sliding log of mail timestamps keyed by sha256(salt|lower(email)) in
     * the rate-limit dir; window 86400s, cap from
     * GHL_MAX_MAILS_PER_RECIPIENT (default 5). Exceeding only skips the
     * mail — the lead is still upserted and the caller still gets 200.
     * Storage/lock failure => true (fail-open, same doctrine as the IP
     * limiter). File content is timestamps only; filename is a hash.
     */
    function ghl_recipient_mail_allowed($emailLower, $cfg = null, $count = 1, $consume = true) {
        if ($cfg === null) {
            $cfg = ghl_load_config();
        }
        $emailLower = ghl_canonical_mail_key($emailLower);
        $max = isset($cfg['max_mails_per_recipient']) ? (int) $cfg['max_mails_per_recipient'] : 5;
        if ($max <= 0) {
            return true;
        }
        $window = 86400;
        $dir = (string) (isset($cfg['rl_dir']) ? $cfg['rl_dir'] : sys_get_temp_dir());
        $salt = (string) (isset($cfg['rl_salt']) ? $cfg['rl_salt'] : GHL_RL_SALT);
        $file = rtrim($dir, '/\\') . '/ghl_v2_mail_' . hash('sha256', $salt . '|' . (string) $emailLower) . '.json';
        if (@is_link($file)) {
            @unlink($file);
        }
        $fp = @fopen($file, 'c+');
        if (!$fp) {
            return true; // fail-open
        }
        @chmod($file, 0600);
        // Round-2a S2: the IP limiter retries the lock ~100ms (item 8); the
        // mail throttle gave up instantly, over-mailing under concurrency.
        // Same bounded wait here (never a tarpit: 100ms cap, 5ms slices).
        $locked = false;
        $deadline = microtime(true) + (GHL_RL_LOCK_WAIT_MS / 1000.0);
        do {
            if (@flock($fp, LOCK_EX | LOCK_NB)) { $locked = true; break; }
            usleep(5000);
        } while (microtime(true) < $deadline);
        if (!$locked) {
            @fclose($fp);
            return true; // contention: fail-open (mail sent; next hit re-checks)
        }
        $now = microtime(true);
        $cutoff = $now - $window;
        $hits = [];
        $size = @filesize($file);
        if ($size > 0 && $size < 1048576) {
            $raw = @stream_get_contents($fp);
            $decoded = is_string($raw) ? json_decode($raw, true) : null;
            if (is_array($decoded)) {
                foreach ($decoded as $t) {
                    if (is_numeric($t) && $t >= $cutoff) {
                        $hits[] = (float) $t;
                    }
                }
            }
        }
        if (count($hits) + (int) $count - 1 >= $max) {
            @flock($fp, LOCK_UN);
            @fclose($fp);
            return false;
        }
        // Consume AFTER the caller confirms a mail was actually emitted
        // (round-2a B3: each dispatch emits TWO mails — GHL-msg + mail();
        // B7: failed/skipped dispatches must not burn quota).
        if ($consume) {
            for ($i = 0; $i < (int) $count; $i++) { $hits[] = $now; }
        }
        @ftruncate($fp, 0);
        @rewind($fp);
        @fwrite($fp, json_encode($hits));
        @fflush($fp);
        @flock($fp, LOCK_UN);
        @fclose($fp);
        return true;
    }
}

if (!function_exists('ghl_recipient_mail_consume')) {
    /**
     * Records $count mail emissions after a successful dispatch (round-2a
     * P03: one dispatch = two branded emissions, GHL-msg + mail()).
     */
    function ghl_recipient_mail_consume($emailLower, $cfg = null, $count = 2) {
        ghl_recipient_mail_allowed($emailLower, $cfg, $count, true);
    }
}

if (!function_exists('ghl_prune_stale_files')) {
    /**
     * Deletes expired v2 limiter/idempotency files in $dir. Called
     * opportunistically (1% of idempotency stores) or with $force=true
     * (tests). Bounded scan; ignores non-v2 files. Fail-open: any I/O error
     * just stops pruning. Round-2a P04 (B4):
     *  - mail-throttle files (ghl_v2_mail_*) are pruned too (were NEVER
     *    pruned: permanent per-recipient disk growth). A mail file is kept
     *    while ANY hit is inside the 24h throttle window (deleting a live
     *    file would reset that recipient's counter: attacker-friendly).
     *  - rate files (ghl_v2_rl_*) expire by their OWN window, never by the
     *    idempotency TTL. Unknown window defaults to the 3600s max: pruning
     *    is disk-hygiene only (the limiter re-filters by cutoff at read),
     *    so erring toward KEEP is behavior-neutral and never resets live
     *    attacker counters early (fail-safe direction).
     *  - the whole dir is scanned in bounded batches (cap 2000) instead of
     *    stopping at 200 (residue bug); callers run this at ~1% of stores
     *    so amortised cost stays negligible.
     */
    function ghl_prune_stale_files($dir, $ttlSecs, $force = false, $rlWindowSecs = null) {
        if (!$force && mt_rand(1, 100) !== 1) {
            return;
        }
        $dh = @opendir((string) $dir);
        if (!$dh) {
            return;
        }
        $now = time();
        $seen = 0;
        while (($seen < 2000) && (($f = @readdir($dh)) !== false)) {
            $isIdem = strpos($f, 'ghl_v2_idem_') === 0;
            $isRl = strpos($f, 'ghl_v2_rl_') === 0;
            $isMail = strpos($f, 'ghl_v2_mail_') === 0;
            if (!$isIdem && !$isRl && !$isMail) {
                continue;
            }
            $seen++;
            $full = rtrim((string) $dir, '/\\') . '/' . $f;
            $mtime = @filemtime($full);
            // Rate files expire by their OWN window (B4b), never by the
            // idempotency TTL; unknown => 3600s max (fail-safe, see above).
            $fileTtl = $isRl ? ($rlWindowSecs !== null ? (int) $rlWindowSecs : 3600) : (int) $ttlSecs;
            if ($mtime !== false && ($now - $mtime) > $fileTtl) {
                // Idempotency files carry their own expiry; re-check content.
                if ($isIdem) {
                    $raw = @file_get_contents($full);
                    $dec = is_string($raw) ? json_decode($raw, true) : null;
                    if (is_array($dec) && isset($dec['exp']) && (int) $dec['exp'] > $now) {
                        continue;
                    }
                }
                // Mail files: keep while any hit is inside the 24h window.
                if ($isMail) {
                    $raw = @file_get_contents($full);
                    $dec = is_string($raw) ? json_decode($raw, true) : null;
                    $live = false;
                    if (is_array($dec)) {
                        foreach ($dec as $t) {
                            if (is_numeric($t) && (float) $t >= (microtime(true) - 86400)) { $live = true; break; }
                        }
                    }
                    if ($live) { continue; }
                }
                @unlink($full);
            }
        }
        @closedir($dh);
    }
}

if (!function_exists('ghl_utf8_byte_cut')) {
    /**
     * Truncates to $maxBytes WITHOUT splitting a multibyte char (round-2a
     * P07/B12 integrator version: prefers mb_strcut when available, else a
     * pure-PHP fallback that backs off to a UTF-8 boundary — this lab's PHP
     * build has no mbstring, and a bare substr fallback would silently keep
     * the bug there. Invalid trailing bytes can only come from the cut
     * itself (inputs are validated upstream), so at most a few bytes back
     * off; an all-invalid string degrades to '' rather than a 422.
     */
    function ghl_utf8_byte_cut($s, $maxBytes) {
        $s = (string) $s;
        $max = (int) $maxBytes;
        if (strlen($s) <= $max) { return $s; }
        if (function_exists('mb_strcut')) {
            return mb_strcut($s, 0, $max, 'UTF-8');
        }
        $cut = substr($s, 0, $max);
        while ($cut !== '' && !preg_match('//u', $cut)) {
            $cut = substr($cut, 0, -1);
        }
        return $cut;
    }
}

if (!function_exists('ghl_material_sig')) {
    /**
     * Short stable signature of the material actually mailed ('-' when none).
     * Round-2a P01 (B1): leads differing ONLY in the mailed material must
     * never share an idempotency replay. Caller-injected '_material' is
     * stripped before upstream, so the GHL upsert schema is unchanged.
     */
    function ghl_material_sig($m) {
        if (!is_array($m)) { return '-'; }
        $t = isset($m['title']) ? trim((string) $m['title']) : '';
        $l = isset($m['link']) ? trim((string) $m['link']) : '';
        // An unsafe-stripped link ('', unsafe=true) must NOT share a key with
        // a genuinely missing link ('', unsafe=false): mail handling differs
        // (refuse vs welcome fallback). The common safe-empty case stays '-'
        // so pre-existing cache entries still hit.
        if ($t === '' && $l === '' && empty($m['unsafe'])) { return '-'; }
        $u = !empty($m['unsafe']) ? '1' : '0';
        return substr(hash('sha256', $t . "\0" . $l . "\0" . $u), 0, 16);
    }
}

if (!function_exists('ghl_idempotency_key')) {
    /**
     * Cheap idempotency key: sha256 over lower(email)|actionType|material-sig|
     * canonical contact JSON. actionType is included so a 'download' tracking
     * call and an 'email_material' call for the same lead never share a replay.
     * The material signature (P01) keeps two different mailed materials from
     * sharing a replay; non-material leads hash sig '-' (byte-identical keys
     * to pre-P01, so existing cache entries still hit). Item 9.
     */
    function ghl_idempotency_key($emailLower, $actionType, $cleanPayload) {
        $mat = (isset($cleanPayload['_material']) && is_array($cleanPayload['_material'])) ? $cleanPayload['_material'] : null;
        $payload = $cleanPayload;
        unset($payload['_material']);
        return hash('sha256', (string) $emailLower . '|' . (string) $actionType . '|' . ghl_material_sig($mat) . '|' . json_encode($payload));
    }
}

if (!function_exists('ghl_idempotency_lookup')) {
    /**
     * Returns the stored success body string on a live hit, null on miss or
     * ANY cache error (fail-open: process normally). Item 9.
     */
    function ghl_idempotency_lookup($dir, $key) {
        if (!preg_match('/^[0-9a-f]{64}$/', (string) $key)) {
            return null;
        }
        $file = rtrim((string) $dir, '/\\') . '/ghl_v2_idem_' . $key . '.json';
        // Round-2a S1: every other state path (rate/store/reserve/mail) has a
        // symlink pre-creation guard; lookup opened 'r' with none, letting a
        // local attacker point a predicted key at another tenant file and have
        // its JSON served back as a 200 replay. Same best-effort guard here.
        // (Residual TOCTOU on shared /tmp remains by design: prefer a private
        // 0700 GHL_IDEMPOTENCY_DIR — documented, unchanged.)
        if (@is_link($file)) {
            @unlink($file);
            return null;
        }
        $fp = @fopen($file, 'r');
        if (!$fp) {
            return null; // miss or unwritable: fail-open
        }
        if (!@flock($fp, LOCK_SH | LOCK_NB)) {
            @fclose($fp);
            static $warnedIdemLookup = false;
            if (!$warnedIdemLookup) {
                $warnedIdemLookup = true;
                error_log('[ghl.php] idempotency lookup sob contencao; fail-open, possivel reprocessamento.');
            }
            return null; // contention: fail-open
        }
        $raw = @stream_get_contents($fp);
        @flock($fp, LOCK_UN);
        @fclose($fp);
        $dec = is_string($raw) ? json_decode($raw, true) : null;
        if (!is_array($dec) || !isset($dec['exp'], $dec['body']) || !is_string($dec['body'])) {
            return null;
        }
        if ((int) $dec['exp'] <= time()) {
            @unlink($file); // best effort expiry cleanup
            return null;
        }
        return $dec['body'];
    }
}

if (!function_exists('ghl_idempotency_reserve')) {
    /**
     * Best-effort in-flight marker against exact-duplicate races (double
     * GHL write + double e-mail when two identical requests overlap in the
     * lookup -> upstream -> store window). Returns:
     *   'stored'   a live success body appeared meanwhile (caller replays it);
     *   'inflight' another request is processing this exact payload now;
     *   true       marker placed, caller owns processing;
     *   false      any failure: fail-open, caller processes normally.
     * Marker shares the future store path and self-heals via 30s expiry;
     * the success store overwrites it. Phone-only leads participate too
     * (v3 identity falls back to 'tel:'-prefixed digits, so they own keys).
     */
    function ghl_idempotency_reserve($dir, $key, $reserveSecs) {
        if (!preg_match('/^[0-9a-f]{64}$/', (string) $key)) {
            return false;
        }
        $file = rtrim((string) $dir, '/\\') . '/ghl_v2_idem_' . $key . '.json';
        if (@is_link($file)) {
            @unlink($file);
        }
        $fp = @fopen($file, 'c+');
        if (!$fp) {
            return false;
        }
        if (!@flock($fp, LOCK_EX | LOCK_NB)) {
            @fclose($fp);
            return false; // contention: fail-open (pathological held-lock case)
        }
        $now = time();
        $raw = @stream_get_contents($fp);
        $dec = is_string($raw) ? json_decode($raw, true) : null;
        if (is_array($dec) && isset($dec['exp']) && (int) $dec['exp'] > $now) {
            if (isset($dec['body']) && is_string($dec['body'])) {
                @flock($fp, LOCK_UN);
                @fclose($fp);
                return 'stored';
            }
            if (!empty($dec['processing'])) {
                @flock($fp, LOCK_UN);
                @fclose($fp);
                return 'inflight';
            }
        }
        @ftruncate($fp, 0);
        @rewind($fp);
        @fwrite($fp, json_encode(['exp' => $now + (int) $reserveSecs, 'processing' => true]));
        @fflush($fp);
        @flock($fp, LOCK_UN);
        @fclose($fp);
        @chmod($file, 0600);
        return true;
    }
}

if (!function_exists('ghl_idempotency_release')) {
    /**
     * Removes a live processing marker (upstream-error paths only; the
     * success store overwrites the marker, so release never deletes a real
     * replay body — content-guarded). Best effort, fail-open.
     */
    function ghl_idempotency_release($dir, $key) {
        if (!preg_match('/^[0-9a-f]{64}$/', (string) $key)) {
            return;
        }
        $file = rtrim((string) $dir, '/\\') . '/ghl_v2_idem_' . $key . '.json';
        $raw = @file_get_contents($file);
        $dec = is_string($raw) ? json_decode($raw, true) : null;
        if (is_array($dec) && !empty($dec['processing']) && !isset($dec['body'])) {
            @unlink($file);
        }
    }
}

if (!function_exists('ghl_idempotency_store')) {
    /**
     * Stores a 2xx upstream body for TTL seconds. Best effort, fail-open.
     * Errors are NEVER cached (transient failures must retry normally).
     * Item 9.
     */
    function ghl_idempotency_store($dir, $key, $body, $ttlSecs, $rlWindowSecs = null) {
        $ttl = (int) $ttlSecs;
        if ($ttl <= 0) {
            return;
        }
        if (!preg_match('/^[0-9a-f]{64}$/', (string) $key) || !is_string($body)) {
            return;
        }
        $file = rtrim((string) $dir, '/\\') . '/ghl_v2_idem_' . $key . '.json';
        // Best-effort symlink pre-creation guard (local-attacker model).
        // Residual TOCTOU on shared /tmp remains: prefer a private
        // GHL_IDEMPOTENCY_DIR (0700, owned by the web user).
        if (@is_link($file)) {
            @unlink($file);
        }
        $fp = @fopen($file, 'c');
        if (!$fp) {
            static $warnedIdemStore = false;
            if (!$warnedIdemStore) {
                $warnedIdemStore = true;
                error_log('[ghl.php] idempotency store indisponivel; fail-open, sem deduplicacao.');
            }
            return; // fail-open
        }
        // Idem cache persists upstream bodies (may echo lead PII): never
        // leave it world-readable on shared hosting.
        @chmod($file, 0600);
        if (!@flock($fp, LOCK_EX | LOCK_NB)) {
            @fclose($fp);
            static $warnedIdemStoreLock = false;
            if (!$warnedIdemStoreLock) {
                $warnedIdemStoreLock = true;
                error_log('[ghl.php] idempotency store sob contencao; fail-open, sem deduplicacao.');
            }
            return; // fail-open
        }
        @ftruncate($fp, 0);
        @rewind($fp);
        @fwrite($fp, json_encode(['exp' => time() + $ttl, 'body' => $body]));
        @fflush($fp);
        @flock($fp, LOCK_UN);
        @fclose($fp);
        ghl_prune_stale_files($dir, $ttl, false, $rlWindowSecs);
    }
}

if (!function_exists('ghl_build_contact_payload')) {
    /**
     * Strict whitelist of GHL v2 API top-level properties (unchanged from the
     * original) plus the same fullName/company/tag normalization, now with
     * type sanitation (item 5): scalar fields are cast, tags entries are
     * cleaned (CR/LF stripped, empties/oversized/nested dropped), customFields
     * entries must be {id,value} scalar pairs (malformed dropped, values
     * truncated to $maxFieldBytes — newlines KEPT: legit messages use them).
     * Client locationId is ALWAYS ignored: the tenant is server-pinned
     * (Cycle A BUG1: a non-empty client value used to overwrite the default,
     * letting any caller redirect leads to an arbitrary location under the
     * agency token. The frontend never sends locationId — verified in
     * ghlRelay.ts — so ignoring it breaks no legit flow).
     */
    function ghl_build_contact_payload($data, $maxFieldBytes = 8192) {
        $allowedKeys = [
            'locationId',
            'firstName',
            'lastName',
            'email',
            'phone',
            'companyName',
            'website',
            'source',
            'tags',
            'customFields'
        ];

        $cleanPayload = [
            'locationId' => ghl_env_str('GHL_LOCATION_ID', GHL_DEFAULT_LOCATION_ID)
        ];

        foreach ($allowedKeys as $key) {
            if ($key === 'locationId') {
                continue; // BUG1 fix: tenant is server-pinned, never client-set.
            }
            if ($key === 'tags' || $key === 'customFields') {
                continue; // handled below with shape validation
            }
            if (array_key_exists($key, $data) && $data[$key] !== null) {
                $s = ghl_to_scalar_string($data[$key]);
                if ($s !== null && trim($s) !== '') {
                    $cleanPayload[$key] = $s;
                }
            }
        }

        // Parse fullName or name if firstName is missing
        if (empty($cleanPayload['firstName'])) {
            $rawName = '';
            foreach (['fullName', 'name'] as $nk) {
                $s = isset($data[$nk]) ? ghl_to_scalar_string($data[$nk]) : null;
                if ($s !== null && trim($s) !== '') {
                    $rawName = trim($s);
                    break;
                }
            }
            if ($rawName !== '') {
                $nameParts = preg_split('/\s+/', $rawName);
                $cleanPayload['firstName'] = array_shift($nameParts);
                if (!empty($nameParts)) {
                    $cleanPayload['lastName'] = implode(' ', $nameParts);
                }
            }
        }

        if (!empty($data['company']) && empty($cleanPayload['companyName'])) {
            $s = ghl_to_scalar_string($data['company']);
            if ($s !== null && trim($s) !== '') {
                $cleanPayload['companyName'] = $s;
            }
        }

        // Tags: array of clean scalar strings (CR/LF stripped, capped, deduped).
        $tags = [];
        if (isset($data['tags'])) {
            $rawTags = is_array($data['tags']) ? $data['tags'] : [$data['tags']];
            foreach ($rawTags as $t) {
                $s = ghl_to_scalar_string($t);
                if ($s === null) {
                    continue; // nested array/object inside tags: drop entry
                }
                $s = trim(ghl_strip_crlf($s));
                if ($s === '' || strlen($s) > (int) $maxFieldBytes) {
                    continue;
                }
                if (!in_array($s, $tags, true)) {
                    $tags[] = $s;
                }
            }
        }
        if (!in_array('revhackers', $tags, true)) {
            $tags[] = 'revhackers';
        }
        $cleanPayload['tags'] = $tags;

        // customFields: array of {id, value} scalar pairs; malformed dropped.
        if (isset($data['customFields']) && is_array($data['customFields'])) {
            $cf = [];
            foreach ($data['customFields'] as $entry) {
                if (!is_array($entry) || !array_key_exists('id', $entry) || !array_key_exists('value', $entry)) {
                    continue;
                }
                $id = ghl_to_scalar_string($entry['id']);
                $val = ghl_to_scalar_string($entry['value']);
                // Round-2a S8: customField `id` length was uncapped (bounded
                // only by the 64KB body cap); drop over-long ids here.
                if ($id === null || $val === null || trim($id) === '' || strlen($id) > (int) $maxFieldBytes) {
                    continue;
                }
                if (strlen($val) > (int) $maxFieldBytes) {
                    // Round-2a B12: byte-substr can split a multibyte char and
                    // turn the whole payload into a 422. Cut on a char
                    // boundary instead (UTF-8-safe helper, mbstring-optional).
                    $val = ghl_utf8_byte_cut($val, (int) $maxFieldBytes);
                }
                $cf[] = ['id' => $id, 'value' => $val];
            }
            if (!empty($cf)) {
                $cleanPayload['customFields'] = $cf;
            }
        }

        return $cleanPayload;
    }
}

if (!function_exists('handle_ghl_request')) {
    function handle_ghl_request() {
        $cfg = ghl_load_config();
        $allowedOrigin = $cfg['allowed_origin'];

        // CORS is NOT auth: this only tells browsers which frontend origin may
        // read the response. Raw HTTP clients can still call this endpoint,
        // which is expected for a public lead form.
        $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
        ghl_send_header('Access-Control-Allow-Origin: ' . $allowedOrigin);
        if ($requestOrigin !== '' && $requestOrigin === $allowedOrigin) {
            ghl_send_header('Vary: Origin');
        }
        ghl_send_header('Access-Control-Allow-Methods: POST, OPTIONS');
        ghl_send_header('Access-Control-Allow-Headers: Content-Type, Authorization');
        ghl_send_header('Content-Type: application/json');
        // Round-2a S4: upstream bodies are passed through byte-for-byte; never
        // let a browser sniff them as HTML (reflected content via GHL echo).
        ghl_send_header('X-Content-Type-Options: nosniff');

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            return ghl_set_status(200);
        }

        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            ghl_send_header('Allow: POST, OPTIONS');
            return ghl_respond_json(405, ['error' => 'Method Not Allowed']);
        }

        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        // Round-2a B9: substring match accepted 'application/jsonx'. Strict
        // media-type parse: 'application/json' optionally followed by ';...'.
        $ctMain = strtolower(trim(strtok((string) $contentType, ';')));
        if ($ctMain !== 'application/json') {
            return ghl_respond_json(415, ['error' => 'Content-Type must be application/json']);
        }

        // Token from server config ONLY. FAIL-CLOSED on missing/empty (item 1).
        // NEVER add a hardcoded fallback here.
        if ($cfg['token'] === '') {
            error_log('[ghl.php] GHL_PRIVATE_TOKEN ausente/vazio; recusando request (fail-closed).');
            return ghl_respond_json(500, ['error' => 'Server configuration error']);
        }
        $token = $cfg['token'];

        $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        if (ghl_rate_limit_exceeded($clientIp, $cfg)) {
            ghl_send_header('Retry-After: ' . (string) $cfg['rl_window']);
            return ghl_respond_json(429, ['error' => 'Too many requests, please try again later']);
        }

        $rawInput = ghl_get_raw_input();
        if (empty($rawInput)) {
            return ghl_respond_json(400, ['error' => 'Empty payload']);
        }
        if (strlen($rawInput) > GHL_MAX_BODY_BYTES) {
            return ghl_respond_json(413, ['error' => 'Payload too large']);
        }

        $data = json_decode($rawInput, true);
        if (!is_array($data)) {
            return ghl_respond_json(400, ['error' => 'Invalid JSON payload']);
        }

        // Item 4: field-count cap (counts raw keys, including unknown/dropped).
        if (count($data) > (int) $cfg['max_fields']) {
            return ghl_respond_json(413, ['error' => 'Too many fields']);
        }

        // Item 5: strict scalar types. Keys below must be scalar-or-null;
        // nested arrays/objects where a scalar is expected => 422.
        $scalarKeys = [
            'locationId', 'firstName', 'lastName', 'fullName', 'name',
            'email', 'phone', 'companyName', 'company', 'website', 'source',
            'actionType', 'formType', 'materialTitle', 'materialLink', 'slug'
        ];
        foreach ($scalarKeys as $k) {
            if (array_key_exists($k, $data) && $data[$k] !== null && !is_scalar($data[$k])) {
                return ghl_respond_json(422, ['error' => 'Invalid field type']);
            }
        }

        // Item 4: per-field byte cap on top-level scalar values.
        foreach ($data as $v) {
            if (is_string($v) && strlen($v) > (int) $cfg['max_field_bytes']) {
                return ghl_respond_json(422, ['error' => 'Field too long']);
            }
        }

        $cleanPayload = ghl_build_contact_payload($data, (int) $cfg['max_field_bytes']);

        // Strict required-field check: a lead needs at least one contact
        // channel. Every legit public form collects e-mail and/or phone.
        if (empty($cleanPayload['email']) && empty($cleanPayload['phone'])) {
            return ghl_respond_json(422, ['error' => 'Contact e-mail or phone is required']);
        }
        if (!empty($cleanPayload['email']) && !ghl_is_valid_email($cleanPayload['email'])) {
            return ghl_respond_json(422, ['error' => 'Invalid e-mail address']);
        }
        if (!empty($cleanPayload['phone']) && !ghl_is_valid_phone($cleanPayload['phone'])) {
            return ghl_respond_json(422, ['error' => 'Invalid phone number']);
        }

        // Payload must be UTF-8 clean: json_encode fails on bad bytes, which
        // would otherwise send garbage upstream. Fail closed (422), no HTTP.
        $contactJson = json_encode($cleanPayload);
        if ($contactJson === false) {
            return ghl_respond_json(422, ['error' => 'Invalid payload encoding']);
        }

        // Item 11: OPTIONAL URL fields — invalid values are dropped + logged
        // (field name only) so a bad marketing link never loses the lead.
        // Identity fields above keep the strict 422 path instead.
        if (!empty($cleanPayload['website']) && !ghl_is_safe_url($cleanPayload['website'])) {
            // Round-2a B20: per-request drop logs scale with request rate.
            // One line per process is enough for ops signal.
            static $warnedWebsiteDrop = false;
            if (!$warnedWebsiteDrop) { $warnedWebsiteDrop = true; error_log('[ghl.php] website invalida descartada (drop, sem 422).'); }
            unset($cleanPayload['website']);
            $contactJson = json_encode($cleanPayload);
            if ($contactJson === false) {
                return ghl_respond_json(422, ['error' => 'Invalid payload encoding']);
            }
        }
        $materialLinkForMail = '';
        $materialLinkUnsafe = false;
        if (isset($data['materialLink'])) {
            $ml = ghl_to_scalar_string($data['materialLink']);
            $ml = $ml === null ? '' : trim($ml);
            if ($ml !== '' && !ghl_is_safe_url($ml)) {
                static $warnedMlDrop = false;
                if (!$warnedMlDrop) { $warnedMlDrop = true; error_log('[ghl.php] materialLink invalida descartada (drop, sem 422).'); }
                $ml = '';
                // Integrator fix-up (P05 interaction): the strip above would
                // otherwise make an UNSAFE link indistinguishable from a
                // MISSING one downstream, silently converting the pinned
                // "unsafe => no mail" (i-ml) into a welcome mail. Thread the
                // signal so dispatch still refuses, and the idem key below
                // keeps the two cases apart (different mail handling).
                $materialLinkUnsafe = true;
            }
            $materialLinkForMail = $ml;
        }

        // Item 9: idempotency lookup BEFORE any upstream call. A hit replays
        // the stored success body with 200 and zero side effects.
        // Identity is the e-mail; phone-only leads fall back to the
        // digit-normalized phone (Cycle A BUG2: they previously skipped
        // idempotency entirely, so every retry re-wrote the contact).
        // The 'tel:' prefix keeps the phone namespace disjoint from e-mails.
        $emailKey = isset($cleanPayload['email']) ? strtolower(trim((string) $cleanPayload['email'])) : '';
        $identityKey = $emailKey;
        if ($identityKey === '' && !empty($cleanPayload['phone'])) {
            $identityKey = 'tel:' . preg_replace('/\D+/', '', (string) $cleanPayload['phone']);
        }
        $dispatchActionType = '';
        $at = $data['actionType'] ?? $data['formType'] ?? '';
        if (is_scalar($at)) {
            $dispatchActionType = (string) $at;
        }
        // Material actually mailed participates in the key (round-2a B1).
        // Kept OUT of $contactJson: the GHL upsert schema is unchanged.
        $keyPayload = $cleanPayload;
        // Round-2a B11: the key hashed the RAW phone string, so '+55 (11)...'
        // vs '5511...' (same line) produced different keys and double
        // upserts. Hash a digit-canonical view instead; the upstream payload
        // keeps the user-typed formatting untouched.
        if (isset($keyPayload['phone'])) {
            $keyPayload['phone'] = preg_replace('/\D+/', '', (string) $keyPayload['phone']);
        }
        $mtForKey = isset($data['materialTitle']) && is_scalar($data['materialTitle']) ? (string) $data['materialTitle'] : '';
        $keyPayload['_material'] = ['title' => $mtForKey, 'link' => $materialLinkForMail, 'unsafe' => $materialLinkUnsafe];
        $idemKey = null;
        if ($identityKey !== '' && (int) $cfg['idem_ttl'] > 0) {
            $idemKey = ghl_idempotency_key($identityKey, $dispatchActionType, $keyPayload);
            $cached = ghl_idempotency_lookup((string) $cfg['idem_dir'], $idemKey);
            if ($cached !== null) {
                // Round-2a B8: the replay header was a submission oracle (told
                // anyone guessing the payload that this identity submitted
                // recently). The frontend never reads it (only response.ok),
                // so it is dropped. Timing side-channel remains (residual).
                return ghl_respond_raw(200, $cached);
            }
            // In-flight race guard: a second identical request arriving while
            // the first is still upstream gets a frontend-safe 429 (ghlRelay
            // maps non-2xx to non-critical false) instead of double-sending.
            $reserve = ghl_idempotency_reserve((string) $cfg['idem_dir'], $idemKey, 30);
            if ($reserve === 'stored') {
                $cached = ghl_idempotency_lookup((string) $cfg['idem_dir'], $idemKey);
                if ($cached !== null) {
                    // (same B8 rationale: no replay header)
                    return ghl_respond_raw(200, $cached);
                }
            } elseif ($reserve === 'inflight') {
                ghl_send_header('Retry-After: 30');
                return ghl_respond_json(429, ['error' => 'Too many requests, please try again later']);
            }
            // $reserve === true|false => own processing / fail-open processing.
        }

        // Use GHL Contacts Upsert Endpoint (same as original; timeout added).
        $upsert = ghl_http_post(
            'https://services.leadconnectorhq.com/contacts/upsert',
            $contactJson,
            [
                'Authorization: Bearer ' . $token,
                'Version: 2021-07-28',
                'Content-Type: application/json'
            ],
            GHL_TIMEOUT_UPSERT
        );

        // Item 6: curl failure => generic 500, detail server-side only.
        if ($upsert['error'] !== null) {
            if ($idemKey !== null) {
                ghl_idempotency_release((string) $cfg['idem_dir'], $idemKey);
            }
            error_log('[ghl.php] GHL upsert HTTP error (detalhe so no servidor).');
            return ghl_respond_json(500, ['error' => 'Upstream request failed']);
        }
        // Item 6: upstream non-2xx => generic 500 + server log (code only,
        // never the upstream body). CHANGED vs v1 (which echoed everything as
        // 200); frontend-safe: ghlRelay.ts maps non-2xx to non-critical false.
        $upCode = (int) $upsert['http_code'];
        if ($upCode < 200 || $upCode >= 300) {
            if ($idemKey !== null) {
                ghl_idempotency_release((string) $cfg['idem_dir'], $idemKey);
            }
            error_log('[ghl.php] GHL upsert retornou HTTP ' . $upCode . ' (corpo omitido do log e da resposta).');
            return ghl_respond_json(500, ['error' => 'Upstream request failed']);
        }

        $response = $upsert['body'];
        $ghlData = json_decode($response, true);
        $contactId = (is_array($ghlData) ? ($ghlData['contact']['id'] ?? null) : null);

        // 1. Provision account in GCP Euler Platform (same fire-and-forget
        // shape as the original: result intentionally ignored; inputs now
        // validated the same way as the lead fields — item 11).
        if (!empty($cleanPayload['email'])) {
            provisionGcpEulerAccount(
                $cleanPayload['email'],
                ($cleanPayload['firstName'] ?? '') . ' ' . ($cleanPayload['lastName'] ?? ''),
                $cleanPayload['companyName'] ?? 'Empresa'
            );
        }

        // 2. Send email via GHL Conversations API + PHP Mail fallback.
        // A chamada 'download' e apenas rastreio/tag de CRM (materialLink ainda
        // nao populado nesse ponto do fluxo). O e-mail com o material real e
        // disparado pela chamada seguinte, actionType 'email_material'/
        // 'send_material_email'.
        $isTrackingOnlyDownloadCall = $dispatchActionType === 'download';
        if (!empty($cleanPayload['email']) && !$isTrackingOnlyDownloadCall) {
            // Per-recipient throttle: over-quota only skips the mail. The
            // lead stays saved and the response stays 200 (frontend-safe).
            $recipientLower = strtolower(trim((string) $cleanPayload['email']));
            // Peek first: do not burn quota on a dispatch that sends nothing
            // (round-2a B3/B7: one dispatch emits TWO mails; failed dispatches
            // emit none). Benign race on concurrent peeks (fail-safe: extra
            // mail over lost lead), bounded by the IP limiter.
            if (!ghl_recipient_mail_allowed($recipientLower, $cfg, 2, false)) {
                error_log('[ghl.php] limite de e-mails por destinatario atingido; lead salvo sem e-mail.');
            } else {
                $mailData = $data;
                $mailData['materialLink'] = $materialLinkForMail;
                // ROUND-3 R1: '_materialLinkUnsafe' e sinal interno handler->dispatch.
                // Sem o unset, um chamador remoto (endpoint publico, sem auth) pode
                // envia-lo no JSON e suprimir o e-mail de material de um lead
                // valido (v3 ignorava a chave e enviava; v4 recusava).
                unset($mailData['_materialLinkUnsafe']);
                if ($materialLinkUnsafe) { $mailData['_materialLinkUnsafe'] = true; }
                $sent = dispatchConfirmationEmail(
                    $cleanPayload['email'],
                    $cleanPayload['firstName'] ?? 'Parceiro',
                    $cleanPayload['companyName'] ?? 'Sua Empresa',
                    $contactId,
                    $token,
                    $mailData
                );
                if ($sent === true) {
                    // ROUND-3 R4: uma emissao normal = GHL-msg + mail() (2),
                    // MAS sem contactId (upstream sem contact.id) o GHL-msg e
                    // pulado e so o mail() sai (1). Contar 2 ali nega e-mail
                    // legitimo futuro (fail-closed na direcao errada).
                    // Prova: stub '{}' => http=2, mail=1, 2 hits gravados.
                    $emissions = empty($contactId) ? 1 : 2;
                    ghl_recipient_mail_consume($recipientLower, $cfg, $emissions);
                }
            }
        }

        // Item 9: cache the 2xx success body for the TTL window.
        if ($idemKey !== null) {
            // Round-2a B17: never cache an unbounded upstream body. Past 64KB
            // the entry is skipped (fail-safe: reprocess next time, still 200
            // now). GHL contact payloads are ~bytes; anything bigger is
            // anomalous and not worth disk.
            if (strlen((string) $response) <= 65536) {
                ghl_idempotency_store((string) $cfg['idem_dir'], $idemKey, (string) $response, (int) $cfg['idem_ttl'], (int) $cfg['rl_window']);
            } else {
                error_log('[ghl.php] resposta upstream grande demais p/ idem cache; sem deduplicacao desta vez.');
            }
        }

        // Preserve the success contract: the frontend (src/lib/ghlRelay.ts)
        // only checks the HTTP status, so the 2xx upstream body is passed
        // through byte-for-byte with HTTP 200, exactly as the original did.
        // PENDING (server, optional follow-up): propagate real upstream error
        // statuses instead; the frontend already handles non-2xx gracefully.
        return ghl_respond_raw(200, $response);
    }
}

if (!function_exists('provisionGcpEulerAccount')) {
    function provisionGcpEulerAccount($email, $name, $companyName) {
        $email = ghl_strip_crlf(trim(ghl_to_scalar_string($email) ?? ''));
        if (!ghl_is_valid_email($email)) {
            error_log('[ghl.php] provisionGcpEulerAccount: e-mail invalido, provision skip.');
            return false;
        }
        $name = ghl_utf8_byte_cut(trim(ghl_strip_crlf(ghl_to_scalar_string($name) ?? '')), GHL_GCP_MAX_NAME_BYTES);
        $company = ghl_to_scalar_string($companyName);
        $company = $company === null || trim($company) === '' ? 'Empresa' : ghl_utf8_byte_cut(trim(ghl_strip_crlf($company)), GHL_GCP_MAX_NAME_BYTES);
        $payload = [
            'email' => $email,
            'name' => $name,
            'companyName' => $company,
            'status' => 'active',
            'role' => 'user',
            'source' => 'claude_partner_network'
        ];
        $json = json_encode($payload);
        if ($json === false) {
            error_log('[ghl.php] provisionGcpEulerAccount: encoding invalida, skip.');
            return false;
        }

        // Fire-and-forget, same as the original (result intentionally ignored).
        ghl_http_post(
            'https://revhackers-api-staging-3na73syj5a-rj.a.run.app/v1/clients',
            $json,
            [
                'Content-Type: application/json',
                'X-Service-Source: revhackers-web'
            ],
            GHL_TIMEOUT_GCP
        );
        return true;
    }
}

if (!function_exists('dispatchConfirmationEmail')) {
    function dispatchConfirmationEmail($toEmail, $firstName, $companyName, $contactId, $token, $rawData = []) {
        // Item 10: To is stripped of CR/LF, then re-validated. Invalid =>
        // skip the mail (logged), never send to a smuggled address.
        $to = ghl_strip_crlf(trim(ghl_to_scalar_string($toEmail) ?? ''));
        if (!ghl_is_valid_email($to)) {
            error_log('[ghl.php] dispatchConfirmationEmail: destinatario invalido, e-mail nao enviado.');
            return false;
        }
        // Template base overridable for CLI tests (default preserves the
        // production layout: public/api/ghl.php + public/templates/).
        $templateBase = ghl_env_str('GHL_TEMPLATE_DIR', __DIR__ . '/../templates');
        // NOTE (round-2a B5): $rawData['tags'] are CRM-segmentation only and
        // intentionally play NO role in mail-path routing anymore.
        $atRaw = $rawData['actionType'] ?? $rawData['formType'] ?? '';
        $actionType = is_scalar($atRaw) ? substr((string) $atRaw, 0, 64) : '';

        $isMaterialDownload = !empty($rawData['materialLink']) ||
                              !empty($rawData['materialTitle']) ||
                              $actionType === 'download' ||
                              $actionType === 'email_material';
        // NOTE (round-2a B5): tags ('materiais' / 'download:...') intentionally
        // do NOT enter the mail path anymore: the frontend adds those tags for
        // CRM segmentation on material flows, so a tag match is not proof that
        // THIS dispatch carries a material. Only title/link/actionType decide.
        // A non-material lead with such tags now gets the welcome mail.

        if ($isMaterialDownload) {
            $mtRaw = ghl_to_scalar_string($rawData['materialTitle'] ?? null);
            $mlRaw = ghl_to_scalar_string($rawData['materialLink'] ?? null);
            $materialTitle = $mtRaw === null ? '' : trim($mtRaw);
            $materialLink = $mlRaw === null ? '' : trim($mlRaw);
            if (!empty($rawData['_materialLinkUnsafe'])) {
                // Handler already stripped an unsafe link (logged there with
                // the field name only): refuse instead of falling back to
                // welcome (preserves the pinned "unsafe => no mail" (i-ml)).
                error_log('[ghl.php] dispatchConfirmationEmail: materialLink insegura (strip no handler), e-mail nao enviado.');
                return false;
            }
            if ($materialLink !== '' && !ghl_is_safe_url($materialLink)) {
                error_log('[ghl.php] dispatchConfirmationEmail: materialLink insegura, e-mail nao enviado.');
                return false;
            }
            if ($materialLink === '' || $materialTitle === '') {
                // Round-2a B6: a material-flagged call WITHOUT a mailable pair
                // falls through to the welcome template instead of dying
                // silent. The lead still gets a branded confirmation; the
                // missing-material case is logged for ops follow-up.
                error_log('[ghl.php] dispatchConfirmationEmail: material incompleto, fallback para welcome.');
                $isMaterialDownload = false;
            }
        }
        if ($isMaterialDownload) {
            $templatePath = $templateBase . '/email-material-delivery.html';
            // Item 10: subject interpolates user data => strip CR/LF BEFORE
            // base64 encoding (base64 would otherwise hide the injection).
            $subject = ghl_strip_crlf("[RevHackers] Seu Material: " . substr($materialTitle, 0, 512));
        } else {
            $templatePath = $templateBase . '/email-claude-partner-network.html';
            $subject = "Seja bem-vindo ao Claude Partner Network & RevHackers.";
            $materialTitle = '';
            $materialLink = '';
        }

        if (!file_exists($templatePath)) {
            return false;
        }

        $htmlBody = file_get_contents($templatePath);

        // Setup Password / First Access URL for direct access to GCP Euler Platform
        $secureToken = bin2hex(random_bytes(16));
        $loginUrl = 'https://revhackers.com.br/auth/setup-password?email=' . urlencode($to) . '&token=' . $secureToken . '&utm_source=claude_partner_network';

        // Display values: cast + truncate (HTML context escaped below;
        // newlines harmless in HTML body, so no CR/LF strip here).
        $firstNameSafe = substr(ghl_to_scalar_string($firstName) ?? 'Parceiro', 0, 512);
        $companySafe = substr(ghl_to_scalar_string($companyName) ?? 'Sua Empresa', 0, 512);
        $materialTitleSafe = substr($materialTitle, 0, 512);

        // Replace GHL style placeholders with lead values & credentials
        $htmlBody = str_replace(['{{contact.first_name}}', '{{firstName}}'], htmlspecialchars($firstNameSafe), $htmlBody);
        $htmlBody = str_replace(['{{contact.email}}', '{{email}}'], htmlspecialchars($to), $htmlBody);
        $htmlBody = str_replace(['{{contact.company_name}}', '{{companyName}}'], htmlspecialchars($companySafe), $htmlBody);
        $htmlBody = str_replace(['{{login_url}}', '{{loginUrl}}'], htmlspecialchars($loginUrl), $htmlBody);
        $htmlBody = str_replace(['{{materialTitle}}'], htmlspecialchars($materialTitleSafe), $htmlBody);
        $htmlBody = str_replace(['{{materialLink}}'], htmlspecialchars($materialLink), $htmlBody);
        $htmlBody = str_replace(['{{right_now.year}}'], date('Y'), $htmlBody);
        $htmlBody = str_replace(['{{location.name}}'], 'RevHackers', $htmlBody);

        // 1. Send via GHL Conversations API (Verified LC Mail / SendGrid for the configured location)
        if ($contactId) {
            $cid = ghl_to_scalar_string($contactId);
            if ($cid !== null && trim($cid) !== '') {
                $ghlMsgPayload = [
                    'type' => 'Email',
                    'contactId' => $cid,
                    'emailTo' => $to,
                    'subject' => $subject,
                    'html' => $htmlBody,
                    'locationId' => ghl_env_str('GHL_LOCATION_ID', GHL_DEFAULT_LOCATION_ID)
                ];
                $msgJson = json_encode($ghlMsgPayload);
                if ($msgJson !== false) {
                    ghl_http_post(
                        'https://services.leadconnectorhq.com/conversations/messages',
                        $msgJson,
                        [
                            'Authorization: Bearer ' . $token,
                            'Version: 2021-07-28',
                            'Content-Type: application/json'
                        ],
                        GHL_TIMEOUT_MSG
                    );
                }
            }
        }

        // 2. Secondary fallback: Send via PHP mail()
        // PENDING (review, not redesigned here): evaluate deliverability and
        // whether this fallback should stay; kept to preserve behavior.
        // Item 10: every interpolated value is CR/LF-free by construction
        // ($to validated, $subject stripped, headers static + stripped).
        $subjectEncoded = "=?UTF-8?B?" . base64_encode($subject) . "?=";
        $headers  = ghl_strip_crlf("MIME-Version: 1.0") . "\r\n";
        $headers .= ghl_strip_crlf("Content-type: text/html; charset=UTF-8") . "\r\n";
        $headers .= ghl_strip_crlf("From: RevHackers <contato@revhackers.com.br>") . "\r\n";
        $headers .= ghl_strip_crlf("Reply-To: contato@revhackers.com.br") . "\r\n";
        $headers .= ghl_strip_crlf("X-Mailer: PHP/" . phpversion());

        ghl_send_mail($to, $subjectEncoded, $htmlBody, $headers);
        return true;
    }
}

if (!defined('GHL_UNDER_TEST')) {
    handle_ghl_request();
}
