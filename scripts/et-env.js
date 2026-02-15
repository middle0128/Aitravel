// scripts/set-env.js
const fs = require('fs');
const path = require('path');

// 1. 確保 environments 資料夾存在 (因為 git 可能沒上傳空資料夾)
const dirPath = path.join(__dirname, '../src/environments');
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// 2. 準備要寫入的內容 (這裡讀取 Vercel 的環境變數)
const envConfigFile = `export const environment = {
  production: true,
  supabaseUrl: '${process.env.SUPABASE_URL}',
  supabaseKey: '${process.env.SUPABASE_KEY}',
  n8nWebhookUrl: '${process.env.N8N_WEBHOOK_URL}'
};
`;

// 3. 寫入檔案 (同時寫入 environment.ts 和 environment.prod.ts 以防萬一)
const targetPath = path.join(dirPath, 'environment.ts');
const targetProdPath = path.join(dirPath, 'environment.prod.ts');

fs.writeFile(targetPath, envConfigFile, (err) => {
  if (err) {
    console.error(err);
    throw err;
  }
  console.log(`Angular environment.ts file generated correctly at ${targetPath} \n`);
});

fs.writeFile(targetProdPath, envConfigFile, (err) => {
    if (err) {
      console.error(err);
      throw err;
    }
    console.log(`Angular environment.prod.ts file generated correctly at ${targetProdPath} \n`);
  });