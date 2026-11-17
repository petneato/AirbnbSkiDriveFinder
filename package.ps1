# Builds a clean ZIP for Chrome Web Store upload: dist\ski-pass-finder-v<version>.zip
# Only files Chrome needs to run the extension are included.

$root = $PSScriptRoot
$version = (Get-Content "$root\manifest.json" -Raw | ConvertFrom-Json).version
$include = @(
  "manifest.json", "background.js", "content.js", "core.js", "extract.js", "hook.js",
  "popup.html", "popup.js", "resorts.js", "search.js",
  "icons/icon16.png", "icons/icon48.png", "icons/icon128.png"
)

New-Item -ItemType Directory -Force "$root\dist" | Out-Null
$zip = "$root\dist\ski-pass-finder-v$version.zip"
if (Test-Path $zip) { Remove-Item $zip }

# Entries are added one by one so their names keep forward slashes; Windows PowerShell's
# own zip tools write backslashes, which the Web Store doesn't accept.
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::Open($zip, "Create")
try {
  foreach ($f in $include) {
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $root $f), $f) | Out-Null
  }
} finally {
  $archive.Dispose()
}
Write-Output "Packaged: $zip ($([math]::Round((Get-Item $zip).Length / 1KB)) KB)"
