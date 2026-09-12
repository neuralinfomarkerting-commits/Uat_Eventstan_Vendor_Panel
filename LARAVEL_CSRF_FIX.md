# Laravel CSRF Fix — Required on Backend

If you still get "CSRF token mismatch" after the frontend fix,
add your vendor API routes to the CSRF exclusion list in Laravel.

## File: `app/Http/Middleware/VerifyCsrfToken.php`

```php
<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * URIs that should be excluded from CSRF verification.
     */
    protected $except = [
        'vendor/login',
        'vendor/logout',
        'api/*',         // exclude all API routes if needed
    ];
}
```

## Why this works
Your Laravel controller uses Sanctum **token-based** auth (`createToken()`),
not cookie/session-based SPA auth. Token-based API routes do NOT need CSRF
verification — the Bearer token itself proves the request is authenticated.

## Also check: `bootstrap/app.php` or `routes/api.php`
Make sure vendor auth routes are in `routes/api.php` (prefixed with `api/`)
OR in `routes/web.php` but excluded from CSRF as shown above.
