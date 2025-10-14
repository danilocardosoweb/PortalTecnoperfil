# 🚀 Como executar o seed agora

O arquivo `.env` já foi criado com suas credenciais do Firebase!

## Passo a passo

### 1️⃣ Abra o terminal na pasta `modern/`

```bash
cd c:\Users\pcp\Desktop\Portal_TecnoPerfil\modern
```

### 2️⃣ Instale as dependências (se ainda não instalou)

```bash
npm install
```

### 3️⃣ Execute o seed

```bash
npm run seed
```

**OU** execute diretamente com npx (sem instalar):

```bash
npx tsx seed-data.ts
```

## 📊 O que vai acontecer

O script vai:
1. ✅ Conectar no Firebase
2. ✅ Verificar se já existem categorias/links
3. ✅ Adicionar apenas os que faltam (não duplica)
4. ✅ Mostrar feedback detalhado

## 🎯 Resultado esperado

```
🌱 Iniciando seed do banco de dados...

📁 Adicionando categorias...
   ✅ Comercial
   ✅ Produção
   ✅ Logística
   ✅ Manutenção
   ✅ Ferramentaria
   ✅ Qualidade
   ✅ Usinagem

🔗 Adicionando links...
   ✅ [Comercial] Resumo
   ✅ [Comercial] Carteira Encomendas
   ✅ [Comercial] Revenda de Estoque
   ... (e mais 11 links)

✨ Seed concluído!
   - 7 categorias adicionadas
   - 14 links adicionados

🌐 Acesse http://localhost:5173 para ver os dados no app!
```

## ⚠️ Importante

- O arquivo `.env` já está configurado com suas credenciais
- Certifique-se de que o Firebase está com as regras abertas para desenvolvimento
- Se der erro de permissão, vá ao Firebase Console > Firestore > Regras e use:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if true; }
  }
}
```

## 🔄 Executar novamente

Pode executar o seed quantas vezes quiser - ele não vai duplicar dados!

---

**Pronto para executar?** Abra o terminal e rode `npm run seed` 🚀
