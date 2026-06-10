<?php
// ═══════════════════════════════════════════════════════════
//  PILOT CRM — Proxy de integración
//  Subir este archivo al mismo directorio que index.html
// ═══════════════════════════════════════════════════════════

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// ── CONFIGURACIÓN ─────────────────────────────────────────
$PILOT_URL   = "https://api.pilotsolution.net/webhooks/welcome.php";
$APP_KEY     = "TU_APP_KEY_AQUI";          // ← reemplazar con tu appkey de Pilot
$SUBORIGIN   = "1";                        // ← reemplazar con el ID de suborigen "Landing"
$LANDING_URL = "https://fiatrotter.com.ar";
// ──────────────────────────────────────────────────────────

// Leer JSON del body (viene desde el fetch() del formulario)
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

$nombre      = isset($input['nombre'])      ? trim($input['nombre'])      : 'n/a';
$telefono    = isset($input['telefono'])    ? trim($input['telefono'])    : '';
$email       = isset($input['email'])       ? trim($input['email'])       : '';
$modelo      = isset($input['modelo'])      ? trim($input['modelo'])      : '';
$financiacion= isset($input['financiacion'])? trim($input['financiacion']): '';

// Notas combinadas para el vendedor
$notes = "Modelo: $modelo | Financiación: $financiacion";

// Construir el payload para Pilot
$params = [
    'action'                  => 'create',
    'appkey'                  => $APP_KEY,
    'debug'                   => '0',
    'pilot_firstname'         => $nombre,
    'pilot_cellphone'         => $telefono,
    'pilot_phone'             => $telefono,
    'pilot_email'             => $email,
    'pilot_contact_type_id'   => '1',        // Electrónico
    'pilot_business_type_id'  => '1',        // 0km / Nuevo
    'pilot_car_brand'         => 'Fiat',
    'pilot_car_modelo'        => $modelo,
    'pilot_notes'             => $notes,
    'pilot_suborigin_id'      => $SUBORIGIN,
    'pilot_provider_service'  => 'Landing fiatrotter.com.ar',
    'pilot_provider_url'      => $LANDING_URL,
    'pilot_notificacions_opt_in_consent_flag' => '1',
];

// Enviar a Pilot via cURL
$ch = curl_init($PILOT_URL);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Devolver la respuesta de Pilot al frontend
echo $response ?: json_encode(['success' => false, 'message' => 'Sin respuesta del servidor']);
die();
