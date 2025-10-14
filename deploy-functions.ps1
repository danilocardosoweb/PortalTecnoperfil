# Script para deploy das Cloud Functions

$ErrorActionPreference = 'Stop'

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Deploy Cloud Functions - API LME" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Firebase CLI está instalado
Write-Host "1. Verificando Firebase CLI..." -ForegroundColor Yellow
try {
    firebase --version | Out-Null
    Write-Host "   Firebase CLI encontrado!" -ForegroundColor Green
} catch {
    Write-Host "   Firebase CLI não encontrado!" -ForegroundColor Red
    Write-Host "   Instale com: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Ir para a pasta functions
Write-Host ""
Write-Host "2. Entrando na pasta functions..." -ForegroundColor Yellow
Set-Location functions

# Instalar dependências
Write-Host ""
Write-Host "3. Instalando dependências..." -ForegroundColor Yellow
npm install

# Compilar TypeScript
Write-Host ""
Write-Host "4. Compilando TypeScript..." -ForegroundColor Yellow
npm run build

# Voltar para raiz
Set-Location ..

# Deploy
Write-Host ""
Write-Host "5. Fazendo deploy das functions..." -ForegroundColor Yellow
Write-Host "   Isso pode levar alguns minutos..." -ForegroundColor Gray
firebase deploy --only functions

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Deploy concluído com sucesso!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "URLs das Functions:" -ForegroundColor Cyan
Write-Host "  getLMEPrices:" -ForegroundColor White
Write-Host "  https://us-central1-portaltecnoperfil-6440c.cloudfunctions.net/getLMEPrices" -ForegroundColor Gray
Write-Host ""
Write-Host "  scheduledLMEUpdate:" -ForegroundColor White
Write-Host "  Roda automaticamente segunda a sexta às 20h" -ForegroundColor Gray
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Teste a URL acima no navegador" -ForegroundColor White
Write-Host "  2. Abra o dashboard LME no app" -ForegroundColor White
Write-Host "  3. Clique em 'Atualizar' para buscar dados reais" -ForegroundColor White
Write-Host ""
