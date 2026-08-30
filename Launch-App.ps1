# HabitThat Intelligent App Launcher
$appDir = $PSScriptRoot
Set-Location $appDir

$logFile = Join-Path $appDir "launcher.log"
"Launcher started at $(Get-Date)" | Out-File $logFile -Encoding utf8

$url = "http://localhost:3000"

# 1. Test if HabitThat server is already running and responding
$serverReady = $false
try {
    $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($res.StatusCode -eq 200) {
        $serverReady = $true
        "Server already running." | Out-File $logFile -Append -Encoding utf8
    }
} catch {}

# 2. If not running, find Node & start Next.js dev server in background
if (-not $serverReady) {
    "Server not running, attempting startup..." | Out-File $logFile -Append -Encoding utf8
    
    # Check and clean any zombie process blocking port 3000
    $portLine = netstat -ano | Select-String ":3000\s+LISTENING"
    if ($portLine) {
        $zombiePid = ($portLine -split '\s+')[-1]
        if ($zombiePid -match '^\d+$') {
            Stop-Process -Id $zombiePid -Force -ErrorAction SilentlyContinue
            "Killed zombie PID $zombiePid" | Out-File $logFile -Append -Encoding utf8
        }
    }

    # Locate node.exe
    $nodeExe = "C:\nvm4w\nodejs\node.exe"
    if (-not (Test-Path $nodeExe)) {
        $cmdNode = (Get-Command "node" -ErrorAction SilentlyContinue).Source
        if ($cmdNode) { $nodeExe = $cmdNode }
    }
    "Node: $nodeExe" | Out-File $logFile -Append -Encoding utf8

    $nextCli = Join-Path $appDir "node_modules\next\dist\bin\next"
    "Next CLI: $nextCli" | Out-File $logFile -Append -Encoding utf8

    if ((Test-Path $nodeExe) -and (Test-Path $nextCli)) {
        $wsh = New-Object -ComObject WScript.Shell
        $wsh.CurrentDirectory = $appDir
        $wsh.Run("`"$nodeExe`" `"$nextCli`" dev -p 3000", 0, $false)
        "Spawned detached Node Next.js process" | Out-File $logFile -Append -Encoding utf8
    } else {
        "Fallback to npm.cmd" | Out-File $logFile -Append -Encoding utf8
        $wsh = New-Object -ComObject WScript.Shell
        $wsh.CurrentDirectory = $appDir
        $wsh.Run("npm.cmd run dev", 0, $false)
    }

    # 3. Wait until server responds with HTTP 200 (max 20 seconds)
    $maxAttempts = 40
    for ($i = 0; $i -lt $maxAttempts; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($res.StatusCode -eq 200) {
                $serverReady = $true
                "Server responded 200 OK after $($i * 500) ms" | Out-File $logFile -Append -Encoding utf8
                break
            }
        } catch {}
    }
}

# 4. Open app window (prefer Edge App mode, fallback to Chrome, fallback to default browser)
$edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
}
$chromePath = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    $chromePath = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
}

if (Test-Path $edgePath) {
    "Opening Edge app mode at $edgePath" | Out-File $logFile -Append -Encoding utf8
    Start-Process -FilePath $edgePath -ArgumentList "--app=$url"
} elseif (Test-Path $chromePath) {
    "Opening Chrome app mode at $chromePath" | Out-File $logFile -Append -Encoding utf8
    Start-Process -FilePath $chromePath -ArgumentList "--app=$url"
} else {
    "Opening default browser" | Out-File $logFile -Append -Encoding utf8
    Start-Process $url
}
