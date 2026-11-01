$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:4173/")
$listener.Start()
Write-Host "Aurelia static server on http://localhost:4173/"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".webp" = "image/webp"
  ".woff2"= "font/woff2"
  ".woff" = "font/woff"
  ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
    if ([string]::IsNullOrWhiteSpace($path) -or $path -eq "/") { $path = "/index.html" }
    $relative = $path.TrimStart("/") -replace "/", [System.IO.Path]::DirectorySeparatorChar
    $file = Join-Path $root $relative

    if (Test-Path -LiteralPath $file -PathType Leaf) {
      $extension = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
      $contentType = $mime[$extension]
      if (-not $contentType) { $contentType = "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $response.ContentType = $contentType
      $response.ContentLength64 = $bytes.Length
      $response.Headers.Add("Cache-Control", "no-cache")
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $response.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
      $response.ContentType = "text/plain"
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    $response.OutputStream.Close()
  } catch {
    Write-Host $_.Exception.Message
  }
}
