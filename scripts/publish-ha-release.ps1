param(
    [string]$Version
)

$ErrorActionPreference = 'Stop'
trap {
    Write-Host "Publicatie gestopt: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $projectRoot
$repository = 'Allardo24/binga'
$image = 'ghcr.io/allardo24/binga'

function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command $($Arguments -join ' ') mislukte met exitcode $LASTEXITCODE."
    }
}

function Get-GitValue {
    param([string[]]$Arguments)
    $result = & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') mislukte."
    }
    return ($result | Out-String).Trim()
}

function Invoke-Npm {
    param([string[]]$Arguments)
    $localNpm = Join-Path $projectRoot '.tools/package/bin/npm-cli.js'
    if (Test-Path -LiteralPath $localNpm) {
        Invoke-Checked -Command 'node' -Arguments (@($localNpm) + $Arguments)
    } elseif (Get-Command npm.cmd -ErrorAction SilentlyContinue) {
        Invoke-Checked -Command 'npm.cmd' -Arguments $Arguments
    } else {
        throw 'npm ontbreekt. Installeer Node.js inclusief npm.'
    }
}

function Wait-Workflow {
    param([string]$Workflow, [string]$Commit, [string]$Branch)
    $uri = "https://api.github.com/repos/$repository/actions/workflows/$Workflow/runs?head_sha=$Commit&per_page=20"
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        $runs = Invoke-RestMethod -Uri $uri -Headers @{ 'User-Agent' = 'Binga-release-check' }
        $run = $runs.workflow_runs | Where-Object {
            $_.head_sha -eq $Commit -and $_.head_branch -eq $Branch -and $_.event -eq 'push'
        } | Select-Object -First 1
        if ($run -and $run.status -eq 'completed') {
            Write-Host "Workflow: $($run.html_url)"
            if ($run.conclusion -ne 'success') {
                throw "$Workflow is $($run.conclusion). Publicatie stopt hier."
            }
            return $run.html_url
        }
        Write-Host "Wachten op $Workflow voor $Commit ($($attempt + 1)/30)..."
        Start-Sleep -Seconds 60
    }
    throw "Geen bevestigde groene $Workflow-run gevonden. Controleer GitHub Actions voor commit $Commit."
}

function Test-PublicImage {
    param([string]$ReleaseVersion)
    $scope = [uri]::EscapeDataString('repository:allardo24/binga:pull')
    $tokenResponse = Invoke-RestMethod -Uri "https://ghcr.io/token?service=ghcr.io&scope=$scope" -Headers @{ 'User-Agent' = 'Binga-release-check' }
    if (-not $tokenResponse.token) {
        throw 'Het GHCR-image is niet anoniem leesbaar.'
    }
    $headers = @{
        Authorization = "Bearer $($tokenResponse.token)"
        Accept = 'application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.index.v1+json'
        'User-Agent' = 'Binga-release-check'
    }
    try {
        Invoke-WebRequest -Uri "https://ghcr.io/v2/allardo24/binga/manifests/$ReleaseVersion" -Headers $headers -Method Head -UseBasicParsing | Out-Null
    } catch {
        throw "Het image $image`:$ReleaseVersion is nog niet publiek op te halen. Maak het package in je eigen GitHub-sessie publiek en start deze helper daarna opnieuw."
    }
}

foreach ($command in @('git', 'node')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "$command ontbreekt."
    }
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.git'))) {
    throw 'Deze map is geen Git-repository.'
}
if ((Get-GitValue -Arguments @('symbolic-ref', '--short', 'HEAD')) -ne 'main') {
    throw 'Schakel eerst naar de main-branch.'
}
$remote = Get-GitValue -Arguments @('remote', 'get-url', 'origin')
if ($remote -notmatch '^(https://github\.com/|git@github\.com:)(?i:Allardo24/binga)(\.git)?$') {
    throw "Onverwachte origin: $remote"
}
if (Get-GitValue -Arguments @('status', '--porcelain')) {
    throw 'De werkmap bevat ongecommitte wijzigingen. Controleer git status, commit deze update en start publiceer-ha.bat opnieuw.'
}
if (-not (Get-GitValue -Arguments @('config', 'user.name')) -or -not (Get-GitValue -Arguments @('config', 'user.email'))) {
    throw 'Stel eerst git user.name en user.email voor deze repository in.'
}

$currentVersion = (Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json).version
if (-not $Version) { $Version = $currentVersion }
if ($Version -ne $currentVersion) {
    throw "De gevraagde versie $Version verschilt van package.json ($currentVersion). Werk eerst alle manifesten en de changelog bij."
}
Invoke-Checked -Command 'node' -Arguments @('scripts/check-release-version.mjs', $Version)

Invoke-Checked -Command 'git' -Arguments @('fetch', 'origin', 'main', '--tags')
$remoteMain = Get-GitValue -Arguments @('rev-parse', 'origin/main')
$mergeBase = Get-GitValue -Arguments @('merge-base', 'HEAD', 'origin/main')
if ($mergeBase -ne $remoteMain) {
    throw 'origin/main heeft wijzigingen die lokaal ontbreken. Haal die eerst binnen.'
}
$commit = Get-GitValue -Arguments @('rev-parse', 'HEAD')
$remoteTag = & git ls-remote --tags origin "refs/tags/v$Version"
if ($LASTEXITCODE -ne 0) { throw 'Remote tags controleren mislukte.' }
if ($remoteTag) {
    $tagCommit = Get-GitValue -Arguments @('rev-list', '-n', '1', "v$Version")
    if ($tagCommit -ne $commit) {
        throw "v$Version bestaat al voor een andere commit. Verhoog de versie voor nieuwe broncode."
    }
}

Write-Host "Repository: $repository"
Write-Host "Versie: v$Version"
Write-Host "Broncommit: $commit"
Write-Host 'Er worden tests uitgevoerd, daarna broncode/tag en uiteindelijk de HA-catalogus gepubliceerd.'
if ((Read-Host 'Typ PUBLICEREN om te beginnen') -cne 'PUBLICEREN') {
    throw 'Afgebroken zonder wijzigingen.'
}

Invoke-Npm -Arguments @('test')
Invoke-Npm -Arguments @('run', 'web:build')
Invoke-Npm -Arguments @('run', 'test:server')
Invoke-Npm -Arguments @('run', 'ha:package')
Invoke-Npm -Arguments @('run', 'ha:check')
Invoke-Npm -Arguments @('run', 'test:e2e')

if ($commit -ne $remoteMain) {
    Invoke-Checked -Command 'git' -Arguments @('push', 'origin', 'main')
}
$ciUrl = Wait-Workflow -Workflow 'ci.yml' -Commit $commit -Branch 'main'

if (-not $remoteTag) {
    Invoke-Checked -Command 'git' -Arguments @('tag', "v$Version", $commit)
    Invoke-Checked -Command 'git' -Arguments @('push', 'origin', "v$Version")
}
$imageUrl = Wait-Workflow -Workflow 'release.yml' -Commit $commit -Branch "v$Version"
Test-PublicImage -ReleaseVersion $Version

Invoke-Checked -Command 'node' -Arguments @('scripts/package-ha-catalog.mjs', $image)
$catalog = Join-Path $projectRoot 'build-artifacts/ha-catalog'
$current = Get-GitValue -Arguments @('rev-parse', 'HEAD')
if ($current -ne $commit) { throw 'De lokale broncommit veranderde tijdens de release.' }
Invoke-Checked -Command 'git' -Arguments @('fetch', 'origin', 'main')
$latestMain = Get-GitValue -Arguments @('rev-parse', 'origin/main')
if ($latestMain -ne $commit) {
    throw 'main is intussen veranderd. Controleer de nieuwe bron voordat je de catalogus publiceert.'
}
Copy-Item -LiteralPath (Join-Path $catalog 'repository.yaml') -Destination (Join-Path $projectRoot 'repository.yaml') -Force
$targetAddon = Join-Path $projectRoot 'binga'
if (-not (Test-Path -LiteralPath $targetAddon)) {
    New-Item -ItemType Directory -Path $targetAddon | Out-Null
}
Copy-Item -Path (Join-Path $catalog 'binga/*') -Destination $targetAddon -Force
Invoke-Checked -Command 'git' -Arguments @('add', 'repository.yaml', 'binga/config.yaml', 'binga/DOCS.md', 'binga/CHANGELOG.md')
Invoke-Checked -Command 'git' -Arguments @('diff', '--cached', '--check')
$staged = Get-GitValue -Arguments @('diff', '--cached', '--name-only')
if ($staged) {
    Invoke-Checked -Command 'git' -Arguments @('diff', '--cached', '--stat')
    Invoke-Checked -Command 'git' -Arguments @('diff', '--cached')
    if ((Read-Host 'Typ CATALOGUS om deze versie zichtbaar te maken in Home Assistant') -cne 'CATALOGUS') {
        throw 'Image gepubliceerd; cataloguswijzigingen staan lokaal klaar maar zijn niet gepusht.'
    }
    Invoke-Checked -Command 'git' -Arguments @('commit', '-m', "Publish HA catalog v$Version")
    Invoke-Checked -Command 'git' -Arguments @('push', 'origin', 'main')
}

Write-Host "Bron: https://github.com/$repository/commit/$commit"
Write-Host "CI: $ciUrl"
Write-Host "Image: $image`:$Version"
Write-Host "Image-workflow: $imageUrl"
Write-Host "HA-repository: https://github.com/$repository"
Write-Host 'Controleer de zichtbaarheid in Home Assistant en test installatie/herstart op de Pi apart.'
