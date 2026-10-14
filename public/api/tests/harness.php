<?php
/**
 * tests/harness.php — CLI harness for /tmp/ghl-fix-v2/ghl.php (zero real network).
 *
 * Covers the 12 slice-F2 items: (a) token fail-closed + config defaults,
 * (b) whitelist/strict types, (b2) download tracking, (c) invalid inputs +
 * caps + types + encoding, (d) rate limit + abuse-backend hook, (e) generic
 * errors + upstream non-2xx, (f) outbound timeouts, (g) idempotency replay,
 * (h) mail header-injection guards, (i) URL validation + GCP payload,
 * (j) frontend contract matrix, (k) stale-file pruning. UTF-8 edge cases live
 * in (c) alongside the other input-validation cases.
 */

error_reporting(E_ALL);
define('GHL_UNDER_TEST', true);

$GLOBALS['__test_raw_input'] = '';
$GLOBALS['__http_calls'] = [];
$GLOBALS['__http_handler'] = null; // optional callable($url,$bodyJson,$headers,$timeout)
$GLOBALS['__mail_calls'] = [];

// ---- Stubs (must exist before the fixed file is included) ----
function ghl_get_raw_input() {
    return $GLOBALS['__test_raw_input'];
}

function ghl_http_post($url, $bodyJson, $headers, $timeoutSecs) {
    $GLOBALS['__http_calls'][] = [
        'url' => $url,
        'body' => $bodyJson,
        'headers' => $headers,
        'timeout' => $timeoutSecs,
    ];
    $h = $GLOBALS['__http_handler'];
    if (is_callable($h)) {
        return $h($url, $bodyJson, $headers, $timeoutSecs);
    }
    return ['error' => null, 'http_code' => 200, 'body' => '{"contact":{"id":"ct_test123"}}'];
}

function ghl_send_mail($to, $subjectEncoded, $htmlBody, $headers) {
    $GLOBALS['__mail_calls'][] = ['to' => $to, 'subject' => $subjectEncoded, 'body' => $htmlBody, 'headers' => $headers];
    return true;
}

require __DIR__ . '/../ghl.php';

// ---- Mini framework ----
$PASS = 0;
$FAIL = 0;
function check($label, $cond, $detail = '') {
    global $PASS, $FAIL;
    if ($cond) {
        $PASS++;
        echo "PASS: $label\n";
    } else {
        $FAIL++;
        echo "FAIL: $label" . ($detail !== '' ? " — $detail" : '') . "\n";
    }
}

function reset_state() {
    $GLOBALS['__test_raw_input'] = '';
    $GLOBALS['__http_calls'] = [];
    $GLOBALS['__http_handler'] = null;
    $GLOBALS['__mail_calls'] = [];
    $_SERVER = [];
    if (!headers_sent()) {
        http_response_code(200);
    }
    foreach (['GHL_PRIVATE_TOKEN','GHL_ALLOWED_ORIGIN','GHL_LOCATION_ID','GHL_RATE_LIMIT_MAX','GHL_RATE_LIMIT_WINDOW',
              'GHL_RATELIMIT_DIR','GHL_RL_SALT','GHL_ABUSE_BACKEND','GHL_MAX_FIELDS',
              'GHL_MAX_FIELD_BYTES','GHL_IDEMPOTENCY_TTL','GHL_IDEMPOTENCY_DIR','GHL_TEMPLATE_DIR'] as $k) {
        putenv($k);
    }
    // Repo layout: templates live at public/templates (production files, exercised for real).
    putenv('GHL_TEMPLATE_DIR=' . __DIR__ . '/../../templates');
}

/** Fresh, empty rl+idem dirs for one section; returns [rlDir, idemDir]. */
function test_dirs($tag) {
    $base = sys_get_temp_dir() . '/ghlv2_' . $tag . '_' . getmypid();
    $rl = $base . '_rl';
    $idem = $base . '_idem';
    @mkdir($rl, 0700, true);
    @mkdir($idem, 0700, true);
    foreach (glob($rl . '/*.json') ?: [] as $f) {
        @unlink($f);
    }
    foreach (glob($idem . '/*.json') ?: [] as $f) {
        @unlink($f);
    }
    putenv("GHL_RATELIMIT_DIR=$rl");
    putenv("GHL_IDEMPOTENCY_DIR=$idem");
    return [$rl, $idem];
}

/** Drive one request; returns [status, output]. Status comes from the
 * handler's return value (header state is unreliable in CLI). */
function run_request($method, $contentType, $raw, $ip = '9.9.9.9') {
    $_SERVER['REQUEST_METHOD'] = $method;
    $_SERVER['CONTENT_TYPE'] = $contentType;
    $_SERVER['REMOTE_ADDR'] = $ip;
    $GLOBALS['__test_raw_input'] = $raw;
    ob_start();
    $status = handle_ghl_request();
    $out = ob_get_clean();
    return [(int) $status, $out];
}
function valid_lead_raw($extra = []) {
    return json_encode(array_merge(
        ['firstName' => 'Maria', 'email' => 'maria@example.com', 'companyName' => 'Acme'],
        $extra
    ));
}
/** Every error response must be exactly {"error": "<generic string>"}. */
function is_generic_error_shape($out) {
    $dec = json_decode($out, true);
    return is_array($dec) && array_keys($dec) === ['error'] && is_string($dec['error']) && $dec['error'] !== '';
}

$FAKE = '__FAKE_GHL_TOKEN_FOR_TESTS__';

// ================= (a) token fail-closed + config safe-defaults =================
reset_state();
test_dirs('a');
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw());
check('(a) missing token => 500', $st === 500, "got $st / $out");
check('(a) body is generic JSON error', is_generic_error_shape($out), "got: $out");
check('(a) generic message leaks no token', strpos($out, 'FAKE') === false && strpos($out, 'TOKEN') === false, "got: $out");
check('(a) no HTTP stub called', count($GLOBALS['__http_calls']) === 0, 'calls=' . count($GLOBALS['__http_calls']));

reset_state(); // item 2: invalid origin falls back to compiled default, still serves
test_dirs('a2');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_ALLOWED_ORIGIN=javascript:alert(1)');
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'a2@example.com']), '9.9.9.21');
check('(a2) invalid origin => safe default, still 200', $st === 200, "got $st / $out");

reset_state(); // item 2: invalid numerics fall back to defaults, still serves
test_dirs('a3');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_RATE_LIMIT_MAX=banana');
putenv('GHL_RATE_LIMIT_WINDOW=-5');
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'a3@example.com']), '9.9.9.22');
check('(a3) invalid numerics => safe defaults, still 200', $st === 200, "got $st / $out");

// ================= (b) valid token => upsert + whitelist + strict types =================
reset_state();
test_dirs('b');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['hackerField' => 'drop me', 'tags' => ['promo', ['nested' => 1], 42]]));
check('(b) valid token => 200', $st === 200, "got $st / $out");
check('(b) upsert was called', count($GLOBALS['__http_calls']) >= 1, 'calls=' . count($GLOBALS['__http_calls']));
$upsert = $GLOBALS['__http_calls'][0];
check('(b) upsert URL', $upsert['url'] === 'https://services.leadconnectorhq.com/contacts/upsert', $upsert['url']);
$authHeaders = array_values(array_filter($upsert['headers'], function ($h) {
    return stripos($h, 'Authorization:') === 0;
}));
check('(b) Authorization Bearer fake token', count($authHeaders) === 1 && $authHeaders[0] === "Authorization: Bearer $FAKE", implode('|', $upsert['headers']));
$sentBody = json_decode($upsert['body'], true);
$allowedTop = ['locationId','firstName','lastName','email','phone','companyName','website','source','tags','customFields'];
$leaked = array_diff(array_keys($sentBody), $allowedTop);
check('(b) contact payload has only whitelisted fields', $leaked === [], 'leaked=' . implode(',', $leaked));
check('(b) revhackers tag present', in_array('revhackers', $sentBody['tags'] ?? []), json_encode($sentBody['tags'] ?? null));
check('(b) nested tag entry dropped, scalar coerced', in_array('promo', $sentBody['tags'] ?? []) && in_array('42', $sentBody['tags'] ?? []), json_encode($sentBody['tags'] ?? null));
check('(b) mail fallback path preserved (mail stub called)', count($GLOBALS['__mail_calls']) === 1 && $GLOBALS['__mail_calls'][0]['to'] === 'maria@example.com', json_encode(array_map(function ($m) { return $m['to']; }, $GLOBALS['__mail_calls'])));
check('(b) mail body has replaced placeholders', strpos($GLOBALS['__mail_calls'][0]['body'] ?? '', 'Maria') !== false && strpos($GLOBALS['__mail_calls'][0]['body'] ?? '', '{{firstName}}') === false, substr($GLOBALS['__mail_calls'][0]['body'] ?? '', 0, 120));

reset_state(); // item 5: locationId games
test_dirs('b3');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'bloc@example.com', 'locationId' => '']), '9.9.9.23');
$sentBody = json_decode($GLOBALS['__http_calls'][0]['body'] ?? '{}', true);
check('(b3) empty client locationId => server default kept', $st === 200 && ($sentBody['locationId'] ?? '') === 'oFTw9DcsKRUj6xCiq4mb', "got $st / " . json_encode($sentBody));
reset_state();
test_dirs('b4');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'bloc2@example.com', 'locationId' => ['evil' => 1]]), '9.9.9.24');
check('(b4) array locationId => 422, no HTTP', $st === 422 && count($GLOBALS['__http_calls']) === 0, "got $st / $out");

reset_state(); // item 5: malformed customFields dropped, well-formed kept
test_dirs('b5');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw([
    'email' => 'b5@example.com',
    'customFields' => [['id' => 'abc123', 'value' => 'x'], 'junk', ['id' => ['nested'], 'value' => 'y']],
]), '9.9.9.25');
$sentBody = json_decode($GLOBALS['__http_calls'][0]['body'] ?? '{}', true);
check('(b5) customFields: good kept, malformed dropped', $st === 200 && ($sentBody['customFields'] ?? null) === [['id' => 'abc123', 'value' => 'x']], "got $st / " . json_encode($sentBody));

// tracking-only download call: no dispatch e-mail expected
reset_state();
test_dirs('b2');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st2, $out2) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'dl@example.com', 'actionType' => 'download']), '9.9.9.8');
check('(b2) download tracking call => 200', $st2 === 200, "got $st2 / $out2");
check('(b2) download call sends no e-mail (mail stub silent)', count($GLOBALS['__mail_calls']) === 0, json_encode($GLOBALS['__mail_calls']));
$hasUpsert = false;
foreach ($GLOBALS['__http_calls'] as $c) {
    if (strpos($c['url'], 'contacts/upsert') !== false) {
        $hasUpsert = true;
    }
}
check('(b2) download call still upserts the contact', $hasUpsert, json_encode(array_column($GLOBALS['__http_calls'], 'url')));

// ================= (c) invalid inputs / caps / types / encoding =================
$cases = [
    ['GET method => 405', 'GET', 'application/json', valid_lead_raw(), 405, '9.9.9.10'],
    ['bad JSON => 400', 'POST', 'application/json', '{not json', 400, '9.9.9.11'],
    ['empty body => 400', 'POST', 'application/json', '', 400, '9.9.9.12'],
    ['oversized body => 413', 'POST', 'application/json', str_repeat('x', 70000), 413, '9.9.9.13'],
    ['wrong content-type => 415', 'POST', 'text/plain', valid_lead_raw(), 415, '9.9.9.14'],
    ['missing e-mail+phone => 422', 'POST', 'application/json', json_encode(['firstName' => 'Ana']), 422, '9.9.9.15'],
    ['invalid e-mail => 422', 'POST', 'application/json', json_encode(['firstName' => 'Ana', 'email' => 'not-an-email']), 422, '9.9.9.16'],
    ['e-mail with CRLF => 422', 'POST', 'application/json', json_encode(['email' => "a@b.com\r\nBcc: x@y.com"]), 422, '9.9.9.26'],
    ['phone gibberish => 422', 'POST', 'application/json', json_encode(['email' => 'ok@example.com', 'phone' => 'abc']), 422, '9.9.9.27'],
    ['phone too short => 422', 'POST', 'application/json', json_encode(['phone' => '1234567']), 422, '9.9.9.28'],
    ['phone too long => 422', 'POST', 'application/json', json_encode(['phone' => '1234567890123456']), 422, '9.9.9.29'],
    ['too many fields => 413', 'POST', 'application/json', (function () { $d = ['email' => 'many@example.com']; for ($i = 0; $i < 70; $i++) { $d["k$i"] = 'v'; } return json_encode($d); })(), 413, '9.9.9.30'],
    ['oversized field => 422', 'POST', 'application/json', json_encode(['email' => 'big@example.com', 'firstName' => str_repeat('A', 9000)]), 422, '9.9.9.31'],
    ['nested array in scalar => 422', 'POST', 'application/json', json_encode(['email' => 'n@example.com', 'firstName' => ['x']]), 422, '9.9.9.32'],
    ['object in scalar => 422', 'POST', 'application/json', json_encode(['email' => 'n2@example.com', 'companyName' => ['a' => 1]]), 422, '9.9.9.33'],
    // v4 CHANGE (round-2a B12 fix): the multibyte-customField case below LEFT
    // this loop — byte-substr used to split a char and 422 the whole lead;
    // the value is now cut on a char boundary and the lead processes (200).
    // Dedicated assertions follow the loop. v3 original untouched.
];
foreach ($cases as $c) {
    reset_state();
    test_dirs('c');
    putenv("GHL_PRIVATE_TOKEN=$FAKE");
    putenv('GHL_IDEMPOTENCY_TTL=0');
    list($st, $out) = run_request($c[1], $c[2], $c[3], $c[5]);
    check("(c) {$c[0]}", $st === $c[4], "got $st / " . substr($out, 0, 120));
    check("(c) {$c[0]} — generic JSON shape", is_generic_error_shape($out), "got: " . substr($out, 0, 120));
    check("(c) {$c[0]} — no HTTP stub called", count($GLOBALS['__http_calls']) === 0, 'calls=' . count($GLOBALS['__http_calls']));
}

reset_state(); // v4 (round-2a B12 fix): oversized multibyte customField value
test_dirs('c-mb'); // is cut on a char boundary => 200, lead saved, value kept
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('POST', 'application/json', json_encode(['email' => 'u@example.com', 'customFields' => [['id' => 'f1', 'value' => str_repeat("\u{20AC}", 3000)]]]), '9.9.9.34');
check('(c-mb) oversized multibyte customField => 200 (clean char-boundary cut)', $st === 200, "got $st / " . substr($out, 0, 120));
$upsertBody = '';
foreach ($GLOBALS['__http_calls'] as $c) {
    if (strpos($c['url'], '/contacts/upsert') !== false) { $upsertBody = $c['body']; }
}
$upDec = json_decode($upsertBody, true);
$keptVal = (is_array($upDec) && isset($upDec['customFields'][0]['value'])) ? $upDec['customFields'][0]['value'] : null;
check('(c-mb) upserted with truncated value within cap', is_string($keptVal) && strlen($keptVal) <= 8192 && strlen($keptVal) > 8000, 'bytes=' . (is_string($keptVal) ? strlen($keptVal) : 'null'));
check('(c-mb) truncated value is valid UTF-8 on a char boundary', is_string($keptVal) && preg_match('//u', $keptVal) === 1 && (strlen($keptVal) % 3) === 0, 'tail=' . (is_string($keptVal) ? bin2hex(substr($keptVal, -3)) : 'null'));
check('(c-mb) lead still mailed (welcome)', $st === 200 && count($GLOBALS['__mail_calls']) === 1, 'mails=' . count($GLOBALS['__mail_calls']));

reset_state(); // legit formatted phone + phone-only lead still pass (item 3)
test_dirs('cok');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('POST', 'application/json', json_encode(['firstName' => 'Beto', 'email' => 'beto@example.com', 'phone' => '+55 (11) 99999-9999']), '9.9.9.35');
check('(c-ok) formatted BR phone => 200', $st === 200, "got $st / $out");
reset_state();
test_dirs('cok2');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('POST', 'application/json', json_encode(['phone' => '+5511999999999']), '9.9.9.36');
check('(c-ok) phone-only lead => 200, no mail (no e-mail to send to)', $st === 200 && count($GLOBALS['__mail_calls']) === 0, "got $st / $out");
reset_state();
test_dirs('cok3');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('POST', 'application/json', json_encode(['email' => 'utf8@example.com', 'firstName' => 'João çã']), '9.9.9.37');
check('(c-ok) valid multibyte UTF-8 passes', $st === 200, "got $st / $out");

// ================= (d) rate limit: N rapid hits, N+1 blocked =================
reset_state();
test_dirs('d');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
putenv('GHL_RATE_LIMIT_MAX=3');
putenv('GHL_RATE_LIMIT_WINDOW=60');
$ip = '9.9.9.99';
$ok = true;
for ($i = 1; $i <= 3; $i++) {
    list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['email' => "d$i@example.com"]), $ip);
    if ($st !== 200) {
        check("(d) hit $i passes", false, "got $st / $out");
        $ok = false;
    }
}
if ($ok) {
    check('(d) first 3 rapid hits pass', true);
}
$callsBefore = count($GLOBALS['__http_calls']);
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'd4@example.com']), $ip);
check('(d) 4th rapid hit => 429', $st === 429, "got $st / $out");
check('(d) 429 body is generic JSON', is_generic_error_shape($out), "got: $out");
check('(d) blocked hit made no new HTTP call', count($GLOBALS['__http_calls']) === $callsBefore, "before=$callsBefore after=" . count($GLOBALS['__http_calls']));
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'd5@example.com']), '9.9.9.100');
check('(d) other IP still passes => 200', $st === 200, "got $st / $out");

reset_state(); // item 8: unknown abuse backend fails OPEN (never break forms)
test_dirs('d2');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_ABUSE_BACKEND=sentinel-v99');
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'd2@example.com']), '9.9.9.101');
check('(d2) unknown abuse backend => fail-open 200', $st === 200, "got $st / $out");

// ================= (e) generic errors; upstream non-2xx => 500 =================
reset_state();
test_dirs('e1');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
$GLOBALS['__http_handler'] = function ($url, $bodyJson, $headers, $timeout) {
    return ['error' => 'simulated curl failure DETAIL-XYZ', 'http_code' => 0, 'body' => ''];
};
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'e1@example.com']), '9.9.9.40');
check('(e1) curl error => 500', $st === 500, "got $st / $out");
check('(e1) curl detail never reaches client', strpos($out, 'simulated') === false && stripos($out, 'curl') === false, "got: $out");
check('(e1) generic JSON shape', is_generic_error_shape($out), "got: $out");

foreach ([503, 400, 301] as $code) {
    reset_state();
    test_dirs('e' . $code);
    putenv("GHL_PRIVATE_TOKEN=$FAKE");
    putenv('GHL_IDEMPOTENCY_TTL=0');
    $marker = 'UPSTREAM_SECRET_MARKER_' . $code;
    $GLOBALS['__http_handler'] = function ($url, $bodyJson, $headers, $timeout) use ($code, $marker) {
        return ['error' => null, 'http_code' => $code, 'body' => '{"oops":"' . $marker . '"}'];
    };
    list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['email' => "e$code@example.com"]), '9.9.9.41');
    check("(e) upstream $code => 500", $st === 500, "got $st / $out");
    check("(e) upstream $code body never echoed", strpos($out, $marker) === false, "got: $out");
    check("(e) upstream $code generic shape", is_generic_error_shape($out), "got: $out");
}

reset_state(); // success still passes upstream bytes through (item 6/12)
test_dirs('eok');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
$okBody = '{"contact":{"id":"ct_passthrough_7"},"extra":[1,2,3]}';
$GLOBALS['__http_handler'] = function ($url, $bodyJson, $headers, $timeout) use ($okBody) {
    return ['error' => null, 'http_code' => 200, 'body' => $okBody];
};
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'eok@example.com']), '9.9.9.42');
check('(e-ok) 2xx success => 200 + upstream bytes intact', $st === 200 && $out === $okBody, "got $st / $out");

// ================= (f) timeouts on every outbound call =================
reset_state();
test_dirs('f');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'f@example.com']), '9.9.9.50');
$byUrl = [];
foreach ($GLOBALS['__http_calls'] as $c) {
    $byUrl[$c['url']] = $c['timeout'];
}
check('(f) upsert timeout is 10s', ($byUrl['https://services.leadconnectorhq.com/contacts/upsert'] ?? null) === 10, json_encode($byUrl));
check('(f) GCP provision timeout is 5s', ($byUrl['https://revhackers-api-staging-3na73syj5a-rj.a.run.app/v1/clients'] ?? null) === 5, json_encode($byUrl));
check('(f) GHL message timeout is 10s', ($byUrl['https://services.leadconnectorhq.com/conversations/messages'] ?? null) === 10, json_encode($byUrl));

// ================= (g) idempotency: replay without re-calling upstream =================
reset_state();
list($rlDir, $idemDir) = test_dirs('g');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
$lead = valid_lead_raw(['email' => 'idem@example.com']);
list($st1, $out1) = run_request('POST', 'application/json', $lead, '9.9.9.60');
$httpAfterFirst = count($GLOBALS['__http_calls']);
$mailAfterFirst = count($GLOBALS['__mail_calls']);
check('(g) first identical request => 200 + full processing', $st1 === 200 && $httpAfterFirst === 3 && $mailAfterFirst === 1, "got $st1 http=$httpAfterFirst mail=$mailAfterFirst");
list($st2, $out2) = run_request('POST', 'application/json', $lead, '9.9.9.60');
check('(g) replayed request => 200, byte-identical body', $st2 === 200 && $out2 === $out1, "got $st2");
check('(g) replay made zero new upstream calls', count($GLOBALS['__http_calls']) === $httpAfterFirst, 'calls=' . count($GLOBALS['__http_calls']));
check('(g) replay sent zero new e-mails', count($GLOBALS['__mail_calls']) === $mailAfterFirst, 'mails=' . count($GLOBALS['__mail_calls']));
list($st3, $out3) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'idem@example.com', 'firstName' => 'Changed']), '9.9.9.60');
check('(g) different payload => fresh upstream processing', $st3 === 200 && count($GLOBALS['__http_calls']) === $httpAfterFirst + 3, 'calls=' . count($GLOBALS['__http_calls']));
list($st4, $out4) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'idem-other@example.com']), '9.9.9.60');
check('(g) different e-mail => fresh upstream processing', $st4 === 200 && count($GLOBALS['__http_calls']) === $httpAfterFirst + 6, 'calls=' . count($GLOBALS['__http_calls']));
// actionType split: same e-mail, download vs default must NOT share a replay
// (download skips the mail path: upsert + GCP provision only => +2 calls)
list($st5, $out5) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'idem@example.com', 'actionType' => 'download']), '9.9.9.61');
check('(g) same e-mail + download actionType => NOT a replay (fresh processing)', $st5 === 200 && count($GLOBALS['__http_calls']) === $httpAfterFirst + 8, 'calls=' . count($GLOBALS['__http_calls']));

// expiry: backdate the exact stored entry for $lead, identical request must process again
$leadPayload = ghl_build_contact_payload(json_decode($lead, true), 8192);
$leadKey = ghl_idempotency_key('idem@example.com', '', $leadPayload);
$leadFile = $idemDir . '/ghl_v2_idem_' . $leadKey . '.json';
check('(g) cache file was stored for first lead', file_exists($leadFile), $leadFile);
if (file_exists($leadFile)) {
    $dec = json_decode(file_get_contents($leadFile), true);
    $dec['exp'] = time() - 10;
    file_put_contents($leadFile, json_encode($dec));
    $before = count($GLOBALS['__http_calls']);
    list($stE, $outE) = run_request('POST', 'application/json', $lead, '9.9.9.60');
    check('(g) expired entry => fresh upstream processing again', $stE === 200 && count($GLOBALS['__http_calls']) > $before, 'calls=' . count($GLOBALS['__http_calls']));
}

reset_state(); // TTL=0 disables idempotency
test_dirs('gdis');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
$leadDis = valid_lead_raw(['email' => 'noidem@example.com']);
run_request('POST', 'application/json', $leadDis, '9.9.9.62');
run_request('POST', 'application/json', $leadDis, '9.9.9.62');
check('(g-dis) TTL=0 => each request processed upstream', count($GLOBALS['__http_calls']) === 6, 'calls=' . count($GLOBALS['__http_calls']));

reset_state(); // unwritable cache dir fails OPEN
test_dirs('gfo');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_DIR=/proc/ghlv2_nope_xyz');
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['email' => 'fo@example.com']), '9.9.9.63');
check('(g-fo) unwritable idem dir => fail-open 200', $st === 200, "got $st / $out");

// ================= (h) mail header-injection guards =================
reset_state();
test_dirs('h');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
check('(h) strip_crlf helper', ghl_strip_crlf("a\r\nb\rc\nd") === 'abcd', ghl_strip_crlf("a\r\nb\rc\nd"));
$r = dispatchConfirmationEmail("victim@example.com\r\nBcc: evil@example.com", 'Ana', 'Acme', null, $FAKE, []);
check('(h) injected To => mail skipped, returns false', $r === false && count($GLOBALS['__mail_calls']) === 0, "r=" . var_export($r, true));
reset_state();
test_dirs('h2');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
$r = dispatchConfirmationEmail('clean@example.com', 'Ana', 'Acme', null, $FAKE, [
    'actionType' => 'email_material',
    'materialTitle' => "Guia\r\nBcc: evil@example.com",
    'materialLink' => 'https://example.com/guia.pdf',
]);
check('(h2) material mail sent to clean To', $r === true && count($GLOBALS['__mail_calls']) === 1 && $GLOBALS['__mail_calls'][0]['to'] === 'clean@example.com', "r=" . var_export($r, true));
if (count($GLOBALS['__mail_calls']) === 1) {
    $m = $GLOBALS['__mail_calls'][0];
    $inner = preg_replace('/^=\?UTF-8\?B\?(.*)\?=$/', '$1', $m['subject']);
    $decoded = base64_decode($inner);
    check('(h2) decoded subject has no CR/LF', strpos($decoded, "\r") === false && strpos($decoded, "\n") === false, "decoded=$decoded");
    $bcc = false;
    foreach (preg_split("/\r\n/", $m['headers']) as $line) {
        if (stripos(ltrim($line), 'Bcc:') === 0) {
            $bcc = true;
        }
    }
    check('(h2) no smuggled Bcc header line', !$bcc, $m['headers']);
    check('(h2) headers keep legit structure', strpos($m['headers'], 'From: RevHackers') !== false, $m['headers']);
}

// ================= (i) URL validation + GCP payload =================
$urlCases = [
    ['https URL ok', 'https://acme.com/page?utm=x', true],
    ['http URL ok', 'http://acme.com/', true],
    ['javascript: dropped', 'javascript:alert(1)', false],
    ['data: dropped', 'data:text/html,<b>x</b>', false],
    ['ftp: dropped', 'ftp://files/acme.zip', false],
    ['CRLF URL dropped', "https://acme.com\r\nEvil: 1", false],
    ['bare word dropped', 'not a url', false],
];
foreach ($urlCases as $u) {
    reset_state();
    test_dirs('i');
    putenv("GHL_PRIVATE_TOKEN=$FAKE");
    putenv('GHL_IDEMPOTENCY_TTL=0');
    $tag = preg_replace('/[^a-z0-9]+/i', '', $u[0]);
    list($st, $out) = run_request('POST', 'application/json', valid_lead_raw(['email' => "i-$tag@example.com", 'website' => $u[1]]), '9.9.9.70');
    $sentBody = json_decode($GLOBALS['__http_calls'][0]['body'] ?? '{}', true);
    $hasSite = array_key_exists('website', $sentBody);
    check("(i) website {$u[0]} => 200, " . ($u[2] ? 'kept' : 'dropped'), $st === 200 && $hasSite === $u[2], "got $st kept=" . var_export($hasSite, true));
}

reset_state(); // bad materialLink + email_material => lead saved, mail skipped
test_dirs('iml');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw([
    'email' => 'iml@example.com', 'actionType' => 'email_material',
    'materialTitle' => 'Guia', 'materialLink' => 'javascript:steal()',
]), '9.9.9.71');
check('(i-ml) bad materialLink => 200, lead upserted, no mail', $st === 200 && count($GLOBALS['__http_calls']) >= 1 && count($GLOBALS['__mail_calls']) === 0, "got $st http=" . count($GLOBALS['__http_calls']) . ' mail=' . count($GLOBALS['__mail_calls']));

reset_state(); // GCP provision sanitization (direct call)
test_dirs('igcp');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
provisionGcpEulerAccount('lead@example.com', "Nome\r\nX-Inject: 1", "Empresa\r\nY: 2");
$gcpBody = json_decode($GLOBALS['__http_calls'][0]['body'] ?? '{}', true);
check('(i-gcp) provision name/company CR/LF neutralized', strpos($gcpBody['name'] ?? '', "\r") === false && strpos($gcpBody['name'] ?? '', "\n") === false && strpos($gcpBody['companyName'] ?? '', "\r") === false, json_encode($gcpBody));
check('(i-gcp) provision timeout is 5s', ($GLOBALS['__http_calls'][0]['timeout'] ?? null) === 5, json_encode($GLOBALS['__http_calls'][0] ?? null));
reset_state();
test_dirs('igcp2');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
$r = provisionGcpEulerAccount("bad\r\nBcc:x", 'Nome', 'Empresa');
check('(i-gcp) invalid provision e-mail => skipped, no HTTP', $r === false && count($GLOBALS['__http_calls']) === 0, "r=" . var_export($r, true));

// ================= (j) frontend contract matrix (ghlRelay.ts) =================
// sendToGHL: returns true iff response.ok (2xx); any non-2xx + JSON error => false.
reset_state();
test_dirs('j');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('OPTIONS', 'application/json', '', '9.9.9.80');
check('(j) OPTIONS preflight => 200', $st === 200, "got $st");
reset_state();
test_dirs('jmat');
putenv("GHL_PRIVATE_TOKEN=$FAKE");
putenv('GHL_IDEMPOTENCY_TTL=0');
list($st, $out) = run_request('POST', 'application/json', valid_lead_raw([
    'email' => 'jmat@example.com', 'actionType' => 'email_material',
    'materialTitle' => 'Guia', 'materialLink' => 'https://example.com/guia.pdf',
]), '9.9.9.81');
$subj = $GLOBALS['__mail_calls'][0]['subject'] ?? '';
check('(j) email_material => 200 + material mail sent', $st === 200 && count($GLOBALS['__mail_calls']) === 1 && strpos(base64_decode(preg_replace('/^=\?UTF-8\?B\?(.*)\?=$/', '$1', $subj)), 'Material') !== false, "got $st");

// ================= (k) stale-file pruning =================
$pdir = sys_get_temp_dir() . '/ghlv2_prune_' . getmypid();
@mkdir($pdir, 0700, true);
$hex = str_repeat('ab', 32);
file_put_contents($pdir . '/ghl_v2_idem_' . $hex . '_old.json', json_encode(['exp' => time() - 100, 'body' => 'x']));
touch($pdir . '/ghl_v2_idem_' . $hex . '_old.json', time() - 7200);
file_put_contents($pdir . '/ghl_v2_idem_' . $hex . '_fresh.json', json_encode(['exp' => time() + 5000, 'body' => 'y']));
file_put_contents($pdir . '/keep.txt', 'untouched');
$rlOld = $pdir . '/ghl_v2_rl_old.json';
file_put_contents($rlOld, json_encode([microtime(true)]));
touch($rlOld, time() - 7200);
ghl_prune_stale_files($pdir, 600, true);
check('(k) expired idem entry pruned', !file_exists($pdir . '/ghl_v2_idem_' . $hex . '_old.json'), '');
check('(k) live idem entry kept', file_exists($pdir . '/ghl_v2_idem_' . $hex . '_fresh.json'), '');
check('(k) non-v2 files untouched', file_exists($pdir . '/keep.txt'), '');
check('(k) stale rate file pruned', !file_exists($rlOld), '');

echo "\nRESULT: $PASS passed, $FAIL failed\n";
exit($FAIL > 0 ? 1 : 0);
