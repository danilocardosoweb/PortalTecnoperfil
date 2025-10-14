param(
  [switch]$Legacy,
  [switch]$Modern
)

# Diretorios
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ModernDir = Join-Path $Root 'modern'

# Função: iniciar servidor estático do app atual (legacy)
function Start-LegacyServer {
  Write-Host 'Iniciando servidor do app atual (legacy) na porta 52635...' -ForegroundColor Cyan
  $port = 52635
  $cmd = $null
  if (Get-Command python -ErrorAction SilentlyContinue) {
    $cmd = "python -m http.server $port"
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command","$cmd" -WorkingDirectory $Root | Out-Null
  } elseif (Get-Command npx -ErrorAction SilentlyContinue) {
    $cmd = "npx serve -l $port ."
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command","$cmd" -WorkingDirectory $Root | Out-Null
  } else {
    Write-Warning 'Nem Python nem Node (npx) encontrados. Instale um deles para servir o app legacy.'
  }
}

# Função: iniciar Vite (modern)
function Start-ModernDev {
  Write-Host 'Iniciando Vite (modern) na porta padrão 5173...' -ForegroundColor Cyan
  if (!(Test-Path (Join-Path $ModernDir 'package.json'))) {
    Write-Warning "O diretório 'modern' não foi encontrado ou não contém package.json."
    return
  }
  if (!(Test-Path (Join-Path $ModernDir 'node_modules'))) {
    if (Get-Command npm -ErrorAction SilentlyContinue) {
      Write-Host 'Instalando dependências do modern (npm install)...' -ForegroundColor Yellow
      Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command","npm install" -WorkingDirectory $ModernDir | Out-Null
      Start-Sleep -Seconds 2
    } else {
      Write-Warning 'npm não encontrado. Instale Node.js para rodar o projeto modern.'
      return
    }
  }
  # Iniciar o dev server
  Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command","npm run dev" -WorkingDirectory $ModernDir | Out-Null
}

# Controle do que iniciar
$startLegacy = $true
$startModern = $true
if ($Legacy -and -not $Modern) { $startModern = $false }
if ($Modern -and -not $Legacy) { $startLegacy = $false }

if ($startLegacy) { Start-LegacyServer }
if ($startModern) { Start-ModernDev }

Start-Sleep -Seconds 2
# Abrir navegador
if ($startLegacy) { Start-Process 'http://127.0.0.1:52635' }
if ($startModern) { Start-Process 'http://127.0.0.1:5173' }

Write-Host 'Pronto! Janelas de terminal foram abertas para cada servidor.' -ForegroundColor Green
Write-Host 'Use CTRL+C nas janelas correspondentes para encerrar quando desejar.' -ForegroundColor DarkGray
