const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) results = results.concat(walk(full));
    else results.push(full);
  });
  return results;
}

const files = walk('frontend/src').filter(f => f.endsWith('.jsx'));
files.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  const matches = [];
  if (c.includes('SearchBar')) matches.push('SearchBar');
  if (c.includes('<select')) matches.push('<select');
  if (c.includes('className="input"')) matches.push('.input');
  if (c.includes('className="mentor-search-input"')) matches.push('mentor-search-input');
  if (c.includes('placeholder=') && c.toLowerCase().includes('search')) matches.push('search-placeholder');
  if (matches.length) console.log(f, matches);
});
