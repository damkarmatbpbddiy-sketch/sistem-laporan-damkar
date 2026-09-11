param(
  [string]$Host = "http://localhost:5000",
  [string]$Email = "admin@example.com",
  [string]$Password = "password123"
)

Write-Host "Host: $Host"

$body = @{ email = $Email; password = $Password } | ConvertTo-Json
Write-Host "Logging in..."
try {
  $resp = Invoke-RestMethod -Method Post -Uri "$Host/auth/login" -ContentType 'application/json' -Body $body -ErrorAction Stop
} catch {
  Write-Error "Login request failed: $_"
  exit 2
}

Write-Host "Login response: $($resp | ConvertTo-Json -Depth 3)"

$token = $resp.token
if (-not $token) {
  Write-Error "Token not found in login response"
  exit 2
}

Write-Host "Calling /admin/stats..."
try {
  $headers = @{ Authorization = "Bearer $token" }
  $stats = Invoke-RestMethod -Uri "$Host/admin/stats" -Headers $headers -ErrorAction Stop
  Write-Host "Admin stats response: $($stats | ConvertTo-Json -Depth 5)"
} catch {
  Write-Error "Admin stats request failed: $_"
  exit 3
}

exit 0
