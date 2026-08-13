const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    const dirent = fs.statSync(dirFile);
    if (dirent.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (dirFile.endsWith('.jsx')) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
};

const files = walkSync(path.join(__dirname, 'frontend/src'));
let modifiedFilesCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Fix large un-prefixed widths
  // Matches w-[400px], min-w-[500px] etc. ONLY if not preceded by md:, sm:, lg:, xl:
  content = content.replace(/(?<!md:|sm:|lg:|xl:)\bw-\[([3-9]\d{2})px\]/g, 'w-full md:w-[$1px]');
  content = content.replace(/(?<!md:|sm:|lg:|xl:)\bmin-w-\[([3-9]\d{2})px\]/g, 'w-full md:w-auto md:min-w-[$1px]');

  // 2. Fix large paddings
  content = content.replace(/(?<!md:|sm:|lg:|xl:)\bp-12\b/g, 'p-6 md:p-12');
  content = content.replace(/(?<!md:|sm:|lg:|xl:)\bp-10\b/g, 'p-5 md:p-10');
  content = content.replace(/(?<!md:|sm:|lg:|xl:)\bp-8\b/g, 'p-4 md:p-8');
  
  content = content.replace(/(?<!md:|sm:|lg:|xl:)\bpx-12\b/g, 'px-6 md:px-12');
  content = content.replace(/(?<!md:|sm:|lg:|xl:)\bpx-10\b/g, 'px-5 md:px-10');
  content = content.replace(/(?<!md:|sm:|lg:|xl:)\bpx-8\b/g, 'px-4 md:px-8');

  content = content.replace(/(?<!md:|sm:|lg:|xl:)\bpy-12\b/g, 'py-6 md:py-12');
  content = content.replace(/(?<!md:|sm:|lg:|xl:)\bpy-10\b/g, 'py-5 md:py-10');
  content = content.replace(/(?<!md:|sm:|lg:|xl:)\bpy-8\b/g, 'py-4 md:py-8');

  // 3. Prevent text-5xl, text-4xl from being too large on mobile
  content = content.replace(/(?<!md:|sm:|lg:|xl:)\btext-5xl\b/g, 'text-3xl md:text-5xl');
  content = content.replace(/(?<!md:|sm:|lg:|xl:)\btext-4xl\b/g, 'text-2xl md:text-4xl');

  // We are not blindly replacing flex to flex-col as it breaks horizontal icon-text alignments.
  // We rely on padding fixes and width fixes to solve 90% of overflow issues.

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedFilesCount++;
    console.log(`Updated: ${file.replace(__dirname, '')}`);
  }
}

console.log(`\nAudit and Fix Complete! Modified ${modifiedFilesCount} files.`);
