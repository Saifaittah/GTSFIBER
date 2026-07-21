<?php
/**
 * GTS Fiber — contact form handler (GoDaddy / PHP mail).
 * Deploy at site root alongside contact.html.
 *
 * GoDaddy: use a From address on your domain (e.g. website@gtsfiber.com).
 * Ensure info@gtsfiber.com exists and PHP mail() is enabled for the hosting plan.
 */

declare(strict_types=1);

const RECIPIENT_EMAIL = 'info@gtsfiber.com';
const MAIL_FROM = 'website@gtsfiber.com';
const MAIL_FROM_NAME = 'GTS Fiber Website';
const MAIL_SUBJECT = 'New GTS Fiber Website Inquiry';
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 3600;
const RATE_LIMIT_DIR = __DIR__ . '/private/rate-limit';

const MAX_NAME = 120;
const MAX_COMPANY = 160;
const MAX_EMAIL = 254;
const MAX_PHONE = 40;
const MAX_MESSAGE = 5000;

$projectTypeLabels = [
    'industrial-flooring' => 'Industrial Flooring',
    'roads-pavements' => 'Roads & Pavements',
    'airport-runways' => 'Airport Runways',
    'warehouses-logistics' => 'Warehouses & Logistics',
    'precast' => 'Precast Concrete',
    'infrastructure' => 'Infrastructure',
    'shotcrete-repairs' => 'Shotcrete & Repairs',
    'parking-structures' => 'Parking Structures',
    'product-inquiry' => 'Product inquiry',
    'technical-consultation' => 'Technical Consultation',
    'other' => 'Other',
    'pavements' => 'Roads & Pavements',
];

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate');

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        respond(false, 'Invalid request.', 405);
    }

    if (!empty($_POST['website'] ?? '') || !empty($_POST['url'] ?? '')) {
        respond(true, 'Thank you. Your inquiry has been received.');
    }

    $ip = clientIp();
    if (!checkRateLimit($ip)) {
        respond(false, 'Too many submissions. Please wait a while and try again.', 429);
    }

    $name = sanitizeText((string) ($_POST['name'] ?? ''), MAX_NAME);
    $company = sanitizeText((string) ($_POST['company'] ?? ''), MAX_COMPANY);
    $email = sanitizeEmail((string) ($_POST['email'] ?? ''));
    $phone = sanitizeText((string) ($_POST['phone'] ?? ''), MAX_PHONE);
    $projectType = sanitizeProjectType((string) ($_POST['project_type'] ?? ''), $projectTypeLabels);
    $message = sanitizeText((string) ($_POST['message'] ?? ''), MAX_MESSAGE);

    $errors = validateSubmission($name, $email, $message);
    if ($errors !== []) {
        respond(false, implode(' ', $errors), 422);
    }

    $projectLabel = $projectType !== ''
        ? ($projectTypeLabels[$projectType] ?? $projectType)
        : 'Not specified';

    date_default_timezone_set('Asia/Riyadh');
    $timestamp = date('Y-m-d H:i:s T');

    $body = implode("\n", [
        'New inquiry from the GTS Fiber website',
        str_repeat('-', 42),
        'Name: ' . $name,
        'Company: ' . ($company !== '' ? $company : 'N/A'),
        'Email: ' . $email,
        'Phone: ' . ($phone !== '' ? $phone : 'N/A'),
        'Project Type: ' . $projectLabel,
        'Message:',
        $message,
        str_repeat('-', 42),
        'Submitted: ' . $timestamp,
        'IP: ' . $ip,
    ]);

    $headers = [
        'From: ' . formatAddress(MAIL_FROM, MAIL_FROM_NAME),
        'Reply-To: ' . formatAddress($email, $name),
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'X-Mailer: GTS-Fiber-Contact',
    ];

    $sent = @mail(
        RECIPIENT_EMAIL,
        encodeMailSubject(MAIL_SUBJECT),
        $body,
        implode("\r\n", $headers),
        '-f' . MAIL_FROM
    );

    if (!$sent) {
        error_log('GTS Fiber contact: mail() failed for ' . $email);
        respond(false, 'We could not send your message right now. Please email us directly at info@gtsfiber.com.', 500);
    }

    recordRateLimitHit($ip);
    respond(true, 'Thank you. Your inquiry has been sent successfully. Our team will respond shortly.');
} catch (Throwable $e) {
    error_log('GTS Fiber contact error: ' . $e->getMessage());
    respond(false, 'Something went wrong. Please try again later.', 500);
}

function respond(bool $ok, string $message, int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function clientIp(): string
{
    $keys = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];
    foreach ($keys as $key) {
        if (empty($_SERVER[$key])) {
            continue;
        }
        $value = (string) $_SERVER[$key];
        if ($key === 'HTTP_X_FORWARDED_FOR') {
            $value = trim(explode(',', $value)[0]);
        }
        if (filter_var($value, FILTER_VALIDATE_IP)) {
            return $value;
        }
    }
    return '0.0.0.0';
}

function checkRateLimit(string $ip): bool
{
    if (!is_dir(RATE_LIMIT_DIR) && !@mkdir(RATE_LIMIT_DIR, 0755, true)) {
        return true;
    }

    $file = RATE_LIMIT_DIR . '/' . hash('sha256', $ip) . '.json';
    $now = time();
    $hits = [];

    if (is_file($file)) {
        $raw = @file_get_contents($file);
        if ($raw !== false) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $hits = $decoded;
            }
        }
    }

    $hits = array_values(array_filter(
        $hits,
        static fn ($t) => is_int($t) && ($now - $t) < RATE_LIMIT_WINDOW
    ));

    if (count($hits) >= RATE_LIMIT_MAX) {
        return false;
    }

    return true;
}

function recordRateLimitHit(string $ip): void
{
    if (!is_dir(RATE_LIMIT_DIR)) {
        @mkdir(RATE_LIMIT_DIR, 0755, true);
    }

    $file = RATE_LIMIT_DIR . '/' . hash('sha256', $ip) . '.json';
    $now = time();
    $hits = [];

    if (is_file($file)) {
        $raw = @file_get_contents($file);
        if ($raw !== false) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $hits = array_values(array_filter(
                    $decoded,
                    static fn ($t) => is_int($t) && ($now - $t) < RATE_LIMIT_WINDOW
                ));
            }
        }
    }

    $hits[] = $now;
    @file_put_contents($file, json_encode($hits), LOCK_EX);
}

function sanitizeText(string $value, int $max): string
{
    $value = trim(strip_tags($value));
    $value = preg_replace('/\r\n|\r/', "\n", $value) ?? $value;
    if (strLen($value) > $max) {
        $value = strSub($value, 0, $max);
    }
    return $value;
}

function strLen(string $value): int
{
    return function_exists('mb_strlen') ? (int) mb_strlen($value) : strlen($value);
}

function strSub(string $value, int $start, int $length): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($value, $start, $length);
    }
    return substr($value, $start, $length);
}

function sanitizeEmail(string $value): string
{
    return trim(strtolower($value));
}

function sanitizeProjectType(string $value, array $allowed): string
{
    $value = trim($value);
    return array_key_exists($value, $allowed) ? $value : '';
}

function validateSubmission(string $name, string $email, string $message): array
{
    $errors = [];

    if ($name === '' || strLen($name) < 2) {
        $errors[] = 'Please enter your full name.';
    }

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please enter a valid email address.';
    }

    if ($message === '' || strLen($message) < 10) {
        $errors[] = 'Please enter a message (at least 10 characters).';
    }

    return $errors;
}

function formatAddress(string $email, string $name): string
{
    $name = trim(preg_replace('/[\r\n"]/', '', $name) ?? '');
    $email = trim($email);
    if ($name === '') {
        return $email;
    }
    return sprintf('"%s" <%s>', $name, $email);
}

function encodeMailSubject(string $subject): string
{
    return '=?UTF-8?B?' . base64_encode($subject) . '?=';
}
