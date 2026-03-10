# PowerShell cleanup script for Windows
# Removes unwanted files before pushing to GitHub

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "PharmaPOS Project Cleanup Script (PowerShell)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot
Write-Host "Root directory: $rootDir" -ForegroundColor Yellow
Write-Host ""

# Function to remove files matching pattern
function Remove-FilesByPattern {
    param([string]$Pattern, [string]$BaseDir)
    $count = 0
    Get-ChildItem -Path $BaseDir -Recurse -Filter $Pattern -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            Remove-Item $_.FullName -Force -ErrorAction Stop
            Write-Host "Removed: $($_.FullName)" -ForegroundColor Green
            $count++
        } catch {
            Write-Host "Error removing $($_.FullName): $_" -ForegroundColor Red
        }
    }
    return $count
}

# Function to remove directories
function Remove-DirectoriesByName {
    param([string]$DirName, [string]$BaseDir)
    $count = 0
    Get-ChildItem -Path $BaseDir -Recurse -Directory -Filter $DirName -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            # Skip node_modules as it's large
            if ($_.FullName -like "*node_modules*") {
                return
            }
            Remove-Item $_.FullName -Recurse -Force -ErrorAction Stop
            Write-Host "Removed directory: $($_.FullName)" -ForegroundColor Green
            $count++
        } catch {
            Write-Host "Error removing $($_.FullName): $_" -ForegroundColor Red
        }
    }
    return $count
}

# Check for sensitive files
Write-Host "Checking for sensitive files..." -ForegroundColor Yellow
$sensitivePatterns = @("*.env", "*.key", "*.pem", "secrets.json", "config.json", "password.txt", "passwords.txt")
$sensitiveFiles = @()
foreach ($pattern in $sensitivePatterns) {
    Get-ChildItem -Path $rootDir -Recurse -Filter $pattern -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.FullName -notlike "*example*") {
            $sensitiveFiles += $_.FullName
        }
    }
}

if ($sensitiveFiles.Count -gt 0) {
    Write-Host "`nWARNING: Found potentially sensitive files:" -ForegroundColor Red
    foreach ($file in $sensitiveFiles) {
        Write-Host "   - $file" -ForegroundColor Yellow
    }
    Write-Host "`nPlease ensure these files are in .gitignore and not committed!" -ForegroundColor Red
    $response = Read-Host "`nContinue with cleanup? (y/n)"
    if ($response -ne "y") {
        Write-Host "Cleanup cancelled." -ForegroundColor Yellow
        exit
    }
} else {
    Write-Host "No sensitive files found." -ForegroundColor Green
}
Write-Host ""

# Remove Python cache files
Write-Host "Removing Python cache files..." -ForegroundColor Yellow
$pycCount = Remove-FilesByPattern -Pattern "*.pyc" -BaseDir $rootDir
$pyoCount = Remove-FilesByPattern -Pattern "*.pyo" -BaseDir $rootDir
$pydCount = Remove-FilesByPattern -Pattern "*.pyd" -BaseDir $rootDir
Write-Host "Removed $($pycCount + $pyoCount + $pydCount) Python cache files." -ForegroundColor Green
Write-Host ""

# Remove __pycache__ directories
Write-Host "Removing __pycache__ directories..." -ForegroundColor Yellow
$pycacheCount = Remove-DirectoriesByName -DirName "__pycache__" -BaseDir $rootDir
Write-Host "Removed $pycacheCount __pycache__ directories." -ForegroundColor Green
Write-Host ""

# Remove OS files
Write-Host "Removing OS-specific files..." -ForegroundColor Yellow
$dsStoreCount = Remove-FilesByPattern -Pattern ".DS_Store" -BaseDir $rootDir
$thumbsCount = Remove-FilesByPattern -Pattern "Thumbs.db" -BaseDir $rootDir
$desktopIniCount = Remove-FilesByPattern -Pattern "desktop.ini" -BaseDir $rootDir
Write-Host "Removed $($dsStoreCount + $thumbsCount + $desktopIniCount) OS files." -ForegroundColor Green
Write-Host ""

# Remove log files
Write-Host "Removing log files..." -ForegroundColor Yellow
$logCount = Remove-FilesByPattern -Pattern "*.log" -BaseDir $rootDir
Write-Host "Removed $logCount log files." -ForegroundColor Green
Write-Host ""

# Remove temporary files
Write-Host "Removing temporary files..." -ForegroundColor Yellow
$tmpCount = Remove-FilesByPattern -Pattern "*.tmp" -BaseDir $rootDir
$tempCount = Remove-FilesByPattern -Pattern "*.temp" -BaseDir $rootDir
$bakCount = Remove-FilesByPattern -Pattern "*.bak" -BaseDir $rootDir
Write-Host "Removed $($tmpCount + $tempCount + $bakCount) temporary files." -ForegroundColor Green
Write-Host ""

# Remove other unwanted directories
Write-Host "Removing other unwanted directories..." -ForegroundColor Yellow
$dirsToRemove = @(".pytest_cache", ".coverage", "htmlcov", ".vite", "dist", "build", ".cache", "logs")
$totalDirCount = 0
foreach ($dirName in $dirsToRemove) {
    $count = Remove-DirectoriesByName -DirName $dirName -BaseDir $rootDir
    $totalDirCount += $count
}
Write-Host "Removed $totalDirCount directories." -ForegroundColor Green
Write-Host ""

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Cleanup completed!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review .gitignore to ensure all unwanted files are excluded"
Write-Host "2. Run: git init (if not already initialized)"
Write-Host "3. Run: git add ."
Write-Host "4. Run: git commit -m 'Initial commit'"
Write-Host "5. Create repository on GitHub and push"
Write-Host ""
