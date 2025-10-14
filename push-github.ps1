param(
  [string]$RepoUrl = "https://github.com/danilocardosoweb/PortalTecnoperfil.git",
  [string]$Branch = "main",
  [string]$Message,
  [switch]$ForceSetRemote
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$msg){ Write-Host $msg }
function Now(){ return (Get-Date -Format 'dd/MM/yyyy HH:mm') }

try {
  # 1) Verificações básicas
  Write-Step "Verificando instalação do Git..."
  git --version | Out-Null
} catch {
  Write-Host "❌ Git não encontrado. Instale o Git e tente novamente: https://git-scm.com/downloads" -ForegroundColor Red
  exit 1
}

# 2) Ir para a raiz do projeto (pasta deste script)
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Write-Step "Pasta do projeto: $Root"

# 3) Garantir .gitignore
if (!(Test-Path (Join-Path $Root '.gitignore'))){
  Write-Step "Criando .gitignore padrão..."
  @"
node_modules/
modern/node_modules/
build/
dist/
.vite/
.vscode/
.env
.env.*
modern/.env
modern/.env.*
config/firebase-config.js
config/firebase-config.local.js
.DS_Store
Thumbs.db
"@ | Out-File -Encoding utf8 .gitignore
}

# 4) Inicializar repositório se preciso
if (!(Test-Path (Join-Path $Root '.git'))) {
  Write-Step "Inicializando repositório Git..."
  git init | Out-Null
  git branch -M $Branch
}

# 5) Configurar remote origin
$needsRemote = $true
try{
  $remotes = git remote -v
  if($remotes -match "^origin\s+") { $needsRemote = $false }
} catch {}

if($needsRemote){
  Write-Step "Adicionando remote origin: $RepoUrl"
  git remote add origin $RepoUrl
} elseif ($ForceSetRemote) {
  Write-Step "Atualizando remote origin: $RepoUrl"
  git remote set-url origin $RepoUrl
} else {
  Write-Step "Remote origin já configurado. Use -ForceSetRemote para atualizar."
}

# 6) Adicionar alterações
Write-Step "Adicionando arquivos (respeitando .gitignore)..."
git add -A

# 7) Commit (se houver mudanças)
if([string]::IsNullOrWhiteSpace($Message)){
  $Message = "Atualização do Portal Tecnoperfil - $(Now)"
}

# Verificar se há algo staged para commit
& git diff --cached --quiet
$hasChanges = $LASTEXITCODE -ne 0

if($hasChanges){
  Write-Step "Realizando commit: $Message"
  git commit -m $Message | Out-Null
} else {
  Write-Step "Sem mudanças para commit (working tree limpo)."
}

# 8) Push
Write-Step "Enviando para GitHub: $RepoUrl ($Branch)"
try{
  git push -u origin $Branch
  Write-Step "Push realizado com sucesso!" 
} catch {
  Write-Host "❌ Falha no push. Verifique se você tem permissão no repositório e está autenticado no GitHub (gh auth login ou git credential)." -ForegroundColor Red
  throw
}
