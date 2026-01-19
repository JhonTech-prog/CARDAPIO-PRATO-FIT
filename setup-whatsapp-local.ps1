# =========================================================
# SCRIPT DE SETUP AUTOMÁTICO - WhatsApp Local
# =========================================================
# Este script automatiza o processo de configuração local
# Execute: .\setup-whatsapp-local.ps1
# =========================================================

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   SETUP LOCAL - WhatsApp (Modo Seguro)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está em modo Administrador (opcional)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "⚠️  Aviso: Não está executando como Administrador" -ForegroundColor Yellow
    Write-Host "   Algumas operações podem falhar. Continue? (S/N)" -ForegroundColor Yellow
    $continue = Read-Host
    if ($continue -ne "S" -and $continue -ne "s") {
        exit
    }
}

# =========================================================
# PASSO 1: Criar Estrutura de Pastas
# =========================================================

Write-Host ""
Write-Host "📁 PASSO 1: Criando estrutura de pastas..." -ForegroundColor Green

$baseDir = "C:\Users\pc\Downloads\whatsapp-dev"
$backupDir = "C:\Users\pc\Downloads\whatsapp-backups"

# Criar diretórios
New-Item -ItemType Directory -Path $baseDir -Force | Out-Null
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

Write-Host "✅ Pastas criadas:" -ForegroundColor Green
Write-Host "   - $baseDir" -ForegroundColor Gray
Write-Host "   - $backupDir" -ForegroundColor Gray

# =========================================================
# PASSO 2: Verificar Node.js
# =========================================================

Write-Host ""
Write-Host "🔍 PASSO 2: Verificando Node.js..." -ForegroundColor Green

try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js NÃO encontrado!" -ForegroundColor Red
    Write-Host "   Baixe em: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "   Depois execute este script novamente." -ForegroundColor Yellow
    exit
}

# =========================================================
# PASSO 3: Verificar Git
# =========================================================

Write-Host ""
Write-Host "🔍 PASSO 3: Verificando Git..." -ForegroundColor Green

try {
    $gitVersion = git --version
    Write-Host "✅ Git instalado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git NÃO encontrado!" -ForegroundColor Red
    Write-Host "   Baixe em: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "   Depois execute este script novamente." -ForegroundColor Yellow
    exit
}

# =========================================================
# PASSO 4: Backup do MongoDB
# =========================================================

Write-Host ""
Write-Host "💾 PASSO 4: Backup do MongoDB" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Faça backup manual das conversas!" -ForegroundColor Yellow
Write-Host ""
Write-Host "   OPÇÃO 1 (Recomendado): MongoDB Compass" -ForegroundColor Cyan
Write-Host "   1. Baixe: https://www.mongodb.com/try/download/compass" -ForegroundColor Gray
Write-Host "   2. Conecte: mongodb+srv://Pratofit:002513@cluster0.ebf9rjf.mongodb.net/" -ForegroundColor Gray
Write-Host "   3. Exporte a collection mensagens como JSON" -ForegroundColor Gray
Write-Host "   4. Salve em: $backupDir" -ForegroundColor Gray
Write-Host ""
Write-Host "   OPÇÃO 2: mongodump (se tiver instalado)" -ForegroundColor Cyan
$dateStr = Get-Date -Format "yyyy-MM-dd"
Write-Host "   mongodump --uri=mongodb+srv://Pratofit:002513@cluster0.ebf9rjf.mongodb.net/ --out=$backupDir\$dateStr" -ForegroundColor Gray
Write-Host ""
Write-Host "Pressione ENTER quando o backup estiver concluído..." -ForegroundColor Yellow
Read-Host

# =========================================================
# PASSO 5: Clonar Repositórios
# =========================================================

Write-Host ""
Write-Host "📦 PASSO 5: Clonando repositórios do GitHub..." -ForegroundColor Green

$backendDir = Join-Path $baseDir "backend"
$frontendDir = Join-Path $baseDir "frontend"

# Clonar Backend
if (Test-Path $backendDir) {
    Write-Host "⚠️  Backend já existe. Pulando clone..." -ForegroundColor Yellow
} else {
    Write-Host "   Clonando backend..." -ForegroundColor Cyan
    Set-Location $baseDir
    git clone https://github.com/JhonTech-prog/whatsapp.git backend
    Write-Host "✅ Backend clonado" -ForegroundColor Green
}

# Clonar Frontend
if (Test-Path $frontendDir) {
    Write-Host "⚠️  Frontend já existe. Pulando clone..." -ForegroundColor Yellow
} else {
    Write-Host "   Clonando frontend..." -ForegroundColor Cyan
    Set-Location $baseDir
    git clone https://github.com/JhonTech-prog/whats.git frontend
    Write-Host "✅ Frontend clonado" -ForegroundColor Green
}

# =========================================================
# PASSO 6: Instalar Dependências do Backend
# =========================================================

Write-Host ""
Write-Host "📦 PASSO 6: Instalando dependências do backend..." -ForegroundColor Green

Set-Location $backendDir

if (Test-Path "package.json") {
    Write-Host "   Executando npm install..." -ForegroundColor Cyan
    npm install
    Write-Host "✅ Dependências do backend instaladas" -ForegroundColor Green
} else {
    Write-Host "❌ package.json não encontrado no backend!" -ForegroundColor Red
}

# =========================================================
# PASSO 7: Configurar .env do Backend
# =========================================================

Write-Host ""
Write-Host "⚙️  PASSO 7: Configurando variáveis de ambiente..." -ForegroundColor Green

$envFile = Join-Path $backendDir ".env"

if (Test-Path $envFile) {
    Write-Host "⚠️  Arquivo .env já existe. Deseja sobrescrever? (S/N)" -ForegroundColor Yellow
    $overwrite = Read-Host
    if ($overwrite -ne "S" -and $overwrite -ne "s") {
        Write-Host "   Pulando configuração do .env" -ForegroundColor Gray
    } else {
        Remove-Item $envFile
    }
}

if (-not (Test-Path $envFile)) {
    Write-Host ""
    Write-Host "Digite suas credenciais:" -ForegroundColor Cyan
    Write-Host ""
    
    $metaToken = Read-Host "META_ACCESS_TOKEN (token da Meta)"
    
    Write-Host ""
    Write-Host "Escolha o MongoDB:" -ForegroundColor Cyan
    Write-Host "1 - MongoDB Local (mongodb://localhost:27017/whatsapp_local)" -ForegroundColor Gray
    Write-Host "2 - MongoDB Atlas SEPARADO (novo cluster de testes)" -ForegroundColor Gray
    $mongoOption = Read-Host "Opção (1 ou 2)"
    
    if ($mongoOption -eq "2") {
        $mongoUri = Read-Host "MONGO_URI (string de conexão do Atlas)"
    } else {
        $mongoUri = "mongodb://localhost:27017/whatsapp_local"
    }
    
    $envContent = @"
# ========================================
# CONFIGURAÇÃO LOCAL DE DESENVOLVIMENTO
# ========================================

META_ACCESS_TOKEN=$metaToken
MONGO_URI=$mongoUri
PORT=3000
"@
    
    Set-Content -Path $envFile -Value $envContent
    Write-Host "✅ Arquivo .env criado" -ForegroundColor Green
}

# =========================================================
# PASSO 8: Aplicar Correções no Backend
# =========================================================

Write-Host ""
Write-Host "🔧 PASSO 8: Aplicando correções no backend..." -ForegroundColor Green

$corrigidoFile = "C:\Users\pc\Downloads\pratofit---cardápio-digital-premium\backend-corrigido-app.js"
$targetFile = Join-Path $backendDir "app.js"

if (Test-Path $corrigidoFile) {
    Write-Host "   Copiando código corrigido..." -ForegroundColor Cyan
    Copy-Item -Path $corrigidoFile -Destination $targetFile -Force
    Write-Host "✅ Correções aplicadas no backend" -ForegroundColor Green
} else {
    Write-Host "⚠️  Arquivo backend-corrigido-app.js não encontrado" -ForegroundColor Yellow
    Write-Host "   Você precisará copiar manualmente depois" -ForegroundColor Yellow
}

# =========================================================
# PASSO 9: Instalar Dependências do Frontend
# =========================================================

Write-Host ""
Write-Host "📦 PASSO 9: Instalando dependências do frontend..." -ForegroundColor Green

Set-Location $frontendDir

if (Test-Path "package.json") {
    Write-Host "   Executando npm install (pode demorar)..." -ForegroundColor Cyan
    npm install
    Write-Host "✅ Dependências do frontend instaladas" -ForegroundColor Green
} else {
    Write-Host "❌ package.json não encontrado no frontend!" -ForegroundColor Red
}

# =========================================================
# PASSO 10: Aplicar Correções no Frontend
# =========================================================

Write-Host ""
Write-Host "🔧 PASSO 10: Aplicando correções no frontend..." -ForegroundColor Green

$corrigidoInboxFile = "C:\Users\pc\Downloads\pratofit---cardápio-digital-premium\frontend-corrigido-Inbox.tsx"
$targetInboxFile = Join-Path $frontendDir "pages\Inbox.tsx"

if (Test-Path $corrigidoInboxFile) {
    # Criar pasta pages se não existir
    $pagesDir = Join-Path $frontendDir "pages"
    New-Item -ItemType Directory -Path $pagesDir -Force | Out-Null
    
    Write-Host "   Copiando código corrigido..." -ForegroundColor Cyan
    Copy-Item -Path $corrigidoInboxFile -Destination $targetInboxFile -Force
    Write-Host "✅ Correções aplicadas no frontend" -ForegroundColor Green
} else {
    Write-Host "⚠️  Arquivo frontend-corrigido-Inbox.tsx não encontrado" -ForegroundColor Yellow
    Write-Host "   Você precisará copiar manualmente depois" -ForegroundColor Yellow
}

# =========================================================
# PASSO 11: Criar Scripts de Inicialização
# =========================================================

Write-Host ""
Write-Host "📝 PASSO 11: Criando scripts de inicialização..." -ForegroundColor Green

# Script para iniciar backend
$startBackendScript = @"
Write-Host "🚀 Iniciando Backend Local..." -ForegroundColor Green
Write-Host ""
Set-Location "$backendDir"
node app.js
"@

$startBackendFile = Join-Path $baseDir "start-backend.ps1"
Set-Content -Path $startBackendFile -Value $startBackendScript

# Script para iniciar frontend
$startFrontendScript = @"
Write-Host "🎨 Iniciando Frontend Local..." -ForegroundColor Green
Write-Host ""
Set-Location "$frontendDir"
npm run dev
"@

$startFrontendFile = Join-Path $baseDir "start-frontend.ps1"
Set-Content -Path $startFrontendFile -Value $startFrontendScript

# Script para iniciar ambos
$startAllScript = @"
Write-Host "🚀 Iniciando Backend e Frontend..." -ForegroundColor Green
Write-Host ""
Write-Host "Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""

# Iniciar backend em nova janela
Start-Process powershell -ArgumentList "-NoExit", "-File", "$startBackendFile"

# Aguardar 3 segundos
Start-Sleep -Seconds 3

# Iniciar frontend em nova janela
Start-Process powershell -ArgumentList "-NoExit", "-File", "$startFrontendFile"

Write-Host ""
Write-Host "✅ Servidores iniciados!" -ForegroundColor Green
Write-Host "   Aguarde alguns segundos e acesse: http://localhost:5173" -ForegroundColor Yellow
"@

$startAllFile = Join-Path $baseDir "INICIAR-SERVIDORES.ps1"
Set-Content -Path $startAllFile -Value $startAllScript

Write-Host "✅ Scripts criados:" -ForegroundColor Green
Write-Host "   - start-backend.ps1" -ForegroundColor Gray
Write-Host "   - start-frontend.ps1" -ForegroundColor Gray
Write-Host "   - INICIAR-SERVIDORES.ps1" -ForegroundColor Gray

# =========================================================
# FINALIZAÇÃO
# =========================================================

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "   ✅ SETUP CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

Write-Host "📁 Arquivos criados em:" -ForegroundColor Cyan
Write-Host "   $baseDir" -ForegroundColor Gray
Write-Host ""

Write-Host "🚀 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Verifique se o MongoDB local está rodando" -ForegroundColor White
Write-Host "      (ou configure Atlas separado)" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Execute o script de inicialização:" -ForegroundColor White
Write-Host "      cd $baseDir" -ForegroundColor Cyan
Write-Host "      .\INICIAR-SERVIDORES.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "   3. Acesse no navegador:" -ForegroundColor White
Write-Host "      http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "   4. Configure no frontend:" -ForegroundColor White
Write-Host "      - Vá em Settings/Ajustes" -ForegroundColor Gray
Write-Host "      - Bridge URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host "      - Salve as configurações" -ForegroundColor Gray
Write-Host ""
Write-Host "   5. Teste as funcionalidades" -ForegroundColor White
Write-Host ""

Write-Host "📚 Documentação completa:" -ForegroundColor Yellow
Write-Host "   C:\Users\pc\Downloads\pratofit---cardápio-digital-premium\SETUP-LOCAL-WHATSAPP.md" -ForegroundColor Gray
Write-Host ""

Write-Host "⚠️  LEMBRE-SE: Isso é LOCAL - não afeta produção!" -ForegroundColor Yellow
Write-Host ""

# Perguntar se quer iniciar agora
Write-Host "Deseja iniciar os servidores agora? (S/N)" -ForegroundColor Yellow
$startNow = Read-Host

if ($startNow -eq "S" -or $startNow -eq "s") {
    Write-Host ""
    Write-Host "🚀 Iniciando servidores..." -ForegroundColor Green
    & $startAllFile
} else {
    Write-Host ""
    Write-Host "Ok! Execute manualmente quando quiser:" -ForegroundColor Cyan
    Write-Host "   .\INICIAR-SERVIDORES.ps1" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Pressione ENTER para sair..." -ForegroundColor Gray
Read-Host
