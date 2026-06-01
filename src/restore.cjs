const { execSync } = require('child_process');

try {
  console.log('--- Git Status ---');
  console.log(execSync('git status').toString());
  
  console.log('--- Git Diff server.ts ---');
  try {
    console.log(execSync('git diff server.ts').toString());
  } catch (e) {
    console.log('No diff or git diff failed:', e.message);
  }

} catch (err) {
  console.error('Git execution failed:', err);
}
