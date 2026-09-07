# HabitThat Intelligent App Launcher
$appDir = $PSScriptRoot
Set-Location $appDir

$logFile = Join-Path $appDir "launcher.log"

"=================================================" | Out-File $logFile -Encoding utf8
"Launcher started at $(Get-Date)" | Out-File $logFile -Append -Encoding utf8

$url = "http://localhost:3000"

function Test-ServerHealthy {
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        return ($res.StatusCode -eq 200)
    } catch {
        return $false
    }
}

# 1. Check if server is already running and healthy
$serverReady = Test-ServerHealthy

if ($serverReady) {
    "Server is already running and healthy." | Out-File $logFile -Append -Encoding utf8
} else {
    "Server not responding. Cleaning port 3000 and starting background process..." | Out-File $logFile -Append -Encoding utf8
    
    # Terminate any dead or listening process on port 3000
    try {
        $listeningPids = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique
        foreach ($pidToKill in $listeningPids) {
            if ($pidToKill -and $pidToKill -gt 0) {
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                "Killed TCP listening PID $pidToKill" | Out-File $logFile -Append -Encoding utf8
            }
        }
    } catch {}

    try {
        $netstatLines = netstat -ano | Select-String ":3000\s+"
        foreach ($line in $netstatLines) {
            $parts = ($line.ToString().Trim() -split '\s+')
            $p = $parts[-1]
            if ($p -match '^\d+$' -and [int]$p -gt 0) {
                Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue
                "Killed netstat PID $p" | Out-File $logFile -Append -Encoding utf8
            }
        }
    } catch {}

    Start-Sleep -Milliseconds 400

    # Locate node.exe
    $nodeExe = "C:\nvm4w\nodejs\node.exe"
    if (-not (Test-Path $nodeExe)) {
        $cmdNode = (Get-Command "node" -ErrorAction SilentlyContinue).Source
        if ($cmdNode) { $nodeExe = $cmdNode }
    }
    if (-not (Test-Path $nodeExe)) {
        $whereNode = (where.exe node 2>$null | Select-Object -First 1)
        if ($whereNode) { $nodeExe = $whereNode }
    }
    "Node binary: $nodeExe" | Out-File $logFile -Append -Encoding utf8

    $nextCli = Join-Path $appDir "node_modules\next\dist\bin\next"
    "Next CLI: $nextCli" | Out-File $logFile -Append -Encoding utf8

    # Start fully detached background process using WMI Win32_Process
    if ((Test-Path $nodeExe) -and (Test-Path $nextCli)) {
        $cmdLine = "`"$nodeExe`" `"$nextCli`" dev -p 3000 -H 127.0.0.1"
        $wmiRes = ([wmiclass]"Win32_Process").Create($cmdLine, $appDir, $null)
        "Spawned WMI detached Node process (PID: $($wmiRes.ProcessId), Return: $($wmiRes.ReturnValue))" | Out-File $logFile -Append -Encoding utf8
    } else {
        "Fallback: using npm.cmd run dev" | Out-File $logFile -Append -Encoding utf8
        $cmdLine = "npm.cmd run dev -- -H 127.0.0.1"
        $wmiRes = ([wmiclass]"Win32_Process").Create($cmdLine, $appDir, $null)
    }

    # Wait for server to become healthy (HTTP 200 OK)
    $maxChecks = 80
    for ($i = 0; $i -lt $maxChecks; $i++) {
        Start-Sleep -Milliseconds 300
        if (Test-ServerHealthy) {
            $serverReady = $true
            "Server ready (200 OK) after $(($i + 1) * 300) ms" | Out-File $logFile -Append -Encoding utf8
            break
        }
    }
}

# 4. Open app in standalone window (Edge App mode -> Chrome App mode -> Default Browser)
$browserExe = $null
$edgeCandidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
)
foreach ($p in $edgeCandidates) {
    if ($p -and (Test-Path $p)) { $browserExe = $p; break }
}

if (-not $browserExe) {
    $chromeCandidates = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    foreach ($p in $chromeCandidates) {
        if ($p -and (Test-Path $p)) { $browserExe = $p; break }
    }
}

if ($browserExe) {
    "Opening App Window using: $browserExe --app=$url" | Out-File $logFile -Append -Encoding utf8
    Start-Process -FilePath $browserExe -ArgumentList "--app=$url"
} else {
    "Opening default browser at $url" | Out-File $logFile -Append -Encoding utf8
    Start-Process $url
}
