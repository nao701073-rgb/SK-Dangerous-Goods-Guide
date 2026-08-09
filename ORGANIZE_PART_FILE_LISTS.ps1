# Compatibility wrapper for v1.3.43 and earlier instructions.
& (Join-Path $PSScriptRoot 'ORGANIZE_UPDATE_HISTORY.ps1') @args
exit $LASTEXITCODE
