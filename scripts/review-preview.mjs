import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
const preview = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>LIRANKO — סקירת מחשב ונייד</title><style>
body{margin:0;padding:24px;font:18px/1.6 Arial;background:#080c14;color:#fff}h1{font-size:28px}a{color:#8ed1ff}a:focus-visible{outline:3px solid #8ed1ff}section{margin-block:32px}iframe{border:1px solid #6c8aa7;border-radius:12px;background:#080c14;display:block}.desktop{width:1440px;height:900px}.mobile{width:390px;height:844px}.narrow{width:320px;height:740px}.preview-scroll{overflow:auto;padding:8px;max-width:100%}p{max-width:900px}</style></head><body>
<h1>LIRANKO — תצוגה מקומית לסקירה</h1><p>תצוגות אינטראקטיביות של אותו קוד ברוחבי מחשב ונייד. אלו אינן תמונות מסך או תוצאות בדיקה אוטומטית. כפתור נגישות פותח את התפריט בכל תצוגה. העדפות נשמרות באותו דפדפן; רענון תצוגה מחיל העדפות שנשמרו בתצוגה אחרת.</p><p><a href="/" target="_blank" rel="noopener">פתיחת האתר בחלון מלא</a> · <a href="/portfolio/" target="_blank" rel="noopener">תיק העבודות</a></p>
<section><h2>מחשב — 1440 × 900</h2><div class="preview-scroll"><iframe class="desktop" src="/" title="תצוגת האתר ברוחב מחשב"></iframe></div></section>
<section><h2>נייד — 390 × 844</h2><div class="preview-scroll"><iframe class="mobile" src="/" title="תצוגת האתר ברוחב נייד"></iframe></div></section>
<section><h2>מסך צר — 320 × 740</h2><div class="preview-scroll"><iframe class="narrow" src="/" title="תצוגת האתר במסך צר"></iframe></div></section></body></html>`;
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpeg':'image/jpeg','.xml':'application/xml','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  const url = new URL(req.url,'http://127.0.0.1');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(url.pathname === '/__review') {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(preview);return;}
  let file;
  try { file=path.resolve(root,'.'+decodeURIComponent(url.pathname)); } catch {res.writeHead(400);res.end();return;}
  if(file!==root && !file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try {if(fs.statSync(file).isDirectory())file=path.join(file,'index.html'); const data=fs.readFileSync(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);}
  catch{res.writeHead(404);res.end('Not found');}
}).listen(4322,'127.0.0.1',()=>console.log('Review preview: http://127.0.0.1:4322/__review'));
