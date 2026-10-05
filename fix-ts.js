const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src', function(filePath) {
  if (!filePath.endsWith('.tsx')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix MOCK_EVENTS in page.tsx
  if (filePath.replace(/\\/g, '/').endsWith('src/app/page.tsx')) {
    if (content.includes('const MOCK_EVENTS = [')) {
      content = content.replace('const MOCK_EVENTS = [', 'const MOCK_EVENTS: Array<{ id: string; title: string; date: string; location: string; type: string; description?: string; speaker?: string }> = [');
      changed = true;
    }
  }

  // Fix form in mentorship/session/[id]/page.tsx
  if (filePath.replace(/\\/g, '/').includes('mentorship/session/')) {
    if (content.includes('useForm<ScoreFormValues>({')) {
      content = content.replace('useForm<ScoreFormValues>({', 'useForm({');
      changed = true;
    }
    if (content.includes('onSubmit={form.handleSubmit(onScoreSubmit)}')) {
        content = content.replace('onSubmit={form.handleSubmit(onScoreSubmit)}', 'onSubmit={form.handleSubmit(onScoreSubmit as any)}');
        changed = true;
    }
  }

  // simpler replace for val === 'all' ? '' : val
  if (content.includes("val === 'all' ? '' : val")) {
      content = content.replaceAll("val === 'all' ? '' : val", "val === 'all' || !val ? '' : val");
      changed = true;
  }
  
  // replace onValueChange={setCategory} with onValueChange={(val) => setCategory(val || '')}
  const setRegex = /onValueChange=\{set([A-Za-z0-9_]+)\}/g;
  if (setRegex.test(content)) {
      content = content.replace(setRegex, 'onValueChange={(val) => set$1(val || "")}');
      changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed ' + filePath);
  }
});
