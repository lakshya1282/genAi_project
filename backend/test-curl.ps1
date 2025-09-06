# Test registration API with curl-like request
Write-Host "🧪 Testing Customer Registration API..." -ForegroundColor Yellow

$body = @{
    name = "Test Customer"
    email = "testuser@gmail.com"  # Use a different email
    password = "password123"
    phone = "+91-9876543210"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "📤 Sending registration request..." -ForegroundColor Cyan
Write-Host "Email: testuser@gmail.com" -ForegroundColor Gray
Write-Host "Server: http://localhost:5000/api/users/register" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/users/register" -Method Post -Body $body -Headers $headers
    
    Write-Host "✅ Registration Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5 | Write-Host
    
    if ($response.success -and $response.requiresVerification) {
        Write-Host ""
        Write-Host "🎉 OTP Registration Working!" -ForegroundColor Green
        Write-Host "📧 OTP should be sent to: $($response.email)" -ForegroundColor Yellow
        Write-Host "📮 Email sender: lakshyapratap5911@gmail.com" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "❌ OTP registration not working correctly" -ForegroundColor Red
    }
} catch {
    Write-Host "Request failed: $($_.Exception.Message)" -ForegroundColor Red
}
