param(
    [Parameter(Position=0,Mandatory=$true)][string]$Id,
    [Parameter(Position=1,Mandatory=$true)][string]$Role
)

$scriptPath = Join-Path $PSScriptRoot "generate_portrait.js"

$envPath = "OPENAI_API_KEY"
if (-not $env:OPENAI_API_KEY) {
  Write-Error "OPENAI_API_KEY not set"
  exit 1
}

$node = "node"
& $node $scriptPath $Id $Role
if ($LASTEXITCODE -ne 0) {
  throw "Portrait generation failed with exit code $LASTEXITCODE"
}
