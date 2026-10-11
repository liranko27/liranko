import fs from 'node:fs';
const source = fs.readFileSync('src/data/business.ts', 'utf8');
const issues = [];
if (!/phone:\s*'\+972[1-9]\d{7,8}'/.test(source)) issues.push('Configure a valid Israeli international phone number.');
if (!/domain:\s*'https:\/\/[^\s\x27]+\.[^\s\x27]+'/.test(source)) issues.push('Configure the real HTTPS domain.');
if (!/servicesApproved:\s*true/.test(source)) issues.push('Confirm services match the owner qualification, then set servicesApproved: true.');
if (issues.length) { console.error('Launch blocked:\n' + issues.map(x => '- ' + x).join('\n')); process.exitCode = 1; } else console.log('Required launch configuration is present.');
