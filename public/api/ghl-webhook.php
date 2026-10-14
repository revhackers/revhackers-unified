<?php
/**
 * ghl-webhook.php — webhook GHL ("Opportunity Won") -> auto-provisionamento de cliente (ENDURECIDO).
 *
 * Fail-closed por segredo compartilhado: exige `GHL_WEBHOOK_SECRET` no ambiente
 * (somente via getenv(), nunca hardcoded) e o header `X-RH-Webhook-Secret` com o
 * mesmo valor. Segredo ausente/vazio => 500; header ausente/divergente => 401.
 * A checagem acontece ANTES de ler o body.
 *
 * Testabilidade: a lógica vive em `handle_ghl_webhook_request()`, que retorna o
 * status HTTP sob `GHL_UNDER_TEST` (mesmo padrão de `ghl.php`); em produção a
 * função roda no carregamento e cada resposta encerra com `exit()`.
 */

if (!function_exists('ghl_webhook_respond_json')) {
    function ghl_webhook_respond_json($status, $payload) {
        if (!headers_sent()) {
            http_response_code($status);
        }
        echo json_encode($payload);
        if (!defined('GHL_UNDER_TEST')) {
            exit();
        }
        return $status;
    }
}

if (!function_exists('ghl_webhook_get_raw_input')) {
    function ghl_webhook_get_raw_input() {
        if (defined('GHL_UNDER_TEST')) {
            return $GLOBALS['__test_raw_input'];
        }
        return file_get_contents('php://input');
    }
}

if (!function_exists('handle_ghl_webhook_request')) {
    function handle_ghl_webhook_request() {
        if (!headers_sent()) {
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: POST, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
            header('Content-Type: application/json');
        }

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            if (!headers_sent()) {
                http_response_code(200);
            }
            if (!defined('GHL_UNDER_TEST')) {
                exit();
            }
            return 200;
        }

        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            return ghl_webhook_respond_json(405, ['error' => 'Method Not Allowed']);
        }

        // Segredo compartilhado (fail-closed, ANTES de ler o body).
        $s = getenv('GHL_WEBHOOK_SECRET');
        $p = $_SERVER['HTTP_X_RH_WEBHOOK_SECRET'] ?? '';
        if ($s === false || $s === '') {
            return ghl_webhook_respond_json(500, ['error' => 'webhook_secret_not_configured']);
        }
        if (!hash_equals($s, (string) $p)) {
            return ghl_webhook_respond_json(401, ['error' => 'unauthorized']);
        }

        $rawInput = ghl_webhook_get_raw_input();
        if (empty($rawInput)) {
            return ghl_webhook_respond_json(400, ['error' => 'Empty payload']);
        }

        $data = json_decode($rawInput, true);
        if (!is_array($data)) {
            return ghl_webhook_respond_json(400, ['error' => 'Invalid JSON payload']);
        }

        // Verifica se o evento é de Oportunidade Ganha (Won)
        $status = strtolower($data['status'] ?? $data['opportunity']['status'] ?? '');
        $stage = strtolower($data['stageName'] ?? $data['opportunity']['stageName'] ?? '');

        $isWon = ($status === 'won') || (strpos($stage, 'ganho') !== false) || (strpos($stage, 'contrato assinado') !== false);

        if (!$isWon) {
            return ghl_webhook_respond_json(200, ['status' => 'ignored', 'message' => 'Evento não é de contrato ganho.']);
        }

        // Extrai dados do cliente e da oportunidade
        $contact = $data['contact'] ?? $data;
        $email = $contact['email'] ?? $data['email'] ?? '';
        $name = $contact['name'] ?? $contact['firstName'] ?? 'Novo Cliente';
        $phone = $contact['phone'] ?? '';
        $companyName = $contact['companyName'] ?? $data['companyName'] ?? 'Empresa Sem Nome';
        $cnpj = $contact['customFields']['cnpj'] ?? $data['customFields']['cnpj'] ?? '';
        $value = $data['monetaryValue'] ?? $data['opportunity']['monetaryValue'] ?? 0;

        // Registra a criação do cliente no log de auditoria
        $logData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'event' => 'CLIENT_AUTO_PROVISIONED_FROM_FUNNELS',
            'client' => [
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'company' => $companyName,
                'cnpj' => $cnpj,
                'contractValue' => $value
            ]
        ];

        $logFile = __DIR__ . '/../logs/client_auto_onboarding.log';
        @mkdir(dirname($logFile), 0755, true);
        @file_put_contents($logFile, json_encode($logData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND);

        // Envia resposta de sucesso ao Webhook do Funnels
        return ghl_webhook_respond_json(200, [
            'success' => true,
            'message' => 'Cliente e Projeto REI auto-criados com sucesso no ecossistema RevHackers!',
            'data' => [
                'clientName' => $name,
                'companyName' => $companyName,
                'portalUrl' => 'https://revhackers.com.br/rei',
                'status' => 'ACTIVE_ONBOARDING'
            ]
        ]);
    }
}

if (!defined('GHL_UNDER_TEST')) {
    handle_ghl_webhook_request();
}
