# ⚠️ COMO EXECUTAR O SCRIPT CORRETAMENTE

## ❌ ERRO: Você está no Git Bash (MINGW64)
O Git Bash não executa arquivos `.ps1` (PowerShell)

## ✅ SOLUÇÃO: Use o PowerShell do Windows

### OPÇÃO 1: Abrir PowerShell (Recomendado)

1. **Pressione:** `Windows + X`
2. **Clique em:** "Windows PowerShell" ou "Terminal"
3. **Execute:**
```powershell
cd C:\Users\pc\Downloads\pratofit---cardápio-digital-premium
.\setup-whatsapp-local.ps1
```

---

### OPÇÃO 2: Pelo Menu Iniciar

1. **Pressione:** `Windows`
2. **Digite:** `PowerShell`
3. **Clique com botão direito** em "Windows PowerShell"
4. **Selecione:** "Executar como Administrador" (opcional, mas recomendado)
5. **Execute:**
```powershell
cd C:\Users\pc\Downloads\pratofit---cardápio-digital-premium
.\setup-whatsapp-local.ps1
```

---

### OPÇÃO 3: Pelo Explorador de Arquivos

1. Abra o Explorador de Arquivos
2. Navegue até: `C:\Users\pc\Downloads\pratofit---cardápio-digital-premium`
3. **Segure Shift** e clique com botão direito na pasta
4. Selecione: **"Abrir janela do PowerShell aqui"** ou **"Abrir no Terminal"**
5. Execute:
```powershell
.\setup-whatsapp-local.ps1
```

---

### OPÇÃO 4: Do Git Bash (Chamar PowerShell)

Se quiser continuar no Git Bash, execute:
```bash
powershell.exe -ExecutionPolicy Bypass -File ./setup-whatsapp-local.ps1
```

---

## 🔒 Se aparecer "Execução de scripts desabilitada"

Execute este comando PRIMEIRO no PowerShell (como Administrador):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Depois execute o script normalmente:
```powershell
.\setup-whatsapp-local.ps1
```

---

## 🚀 Comando Completo (Copie e Cole)

**No PowerShell:**
```powershell
cd C:\Users\pc\Downloads\pratofit---cardápio-digital-premium; .\setup-whatsapp-local.ps1
```

**No Git Bash (se preferir):**
```bash
cd /c/Users/pc/Downloads/pratofit---cardápio-digital-premium
powershell.exe -ExecutionPolicy Bypass -File ./setup-whatsapp-local.ps1
```

---

## ❓ Como Saber se Estou no PowerShell Correto?

**Git Bash mostra:**
```
pc@DESKTOP-VGB5ARH MINGW64
$
```

**PowerShell mostra:**
```
PS C:\Users\pc>
```

---

## 📝 Resumo

| Shell | Funciona? | Como Identificar |
|-------|-----------|------------------|
| Git Bash (MINGW64) | ❌ Não | `$` e `MINGW64` |
| PowerShell | ✅ Sim | `PS C:\>` |
| CMD | ❌ Não | `C:\>` |

---

**Use o PowerShell nativo do Windows!** 🎯
