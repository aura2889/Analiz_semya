// Шифрование данных семьи для публичного репозитория.
// Использование:
//   node tools/crypt.mjs enc  family.json  data.enc.js  <пароль>
//   node tools/crypt.mjs dec  data.enc.js  family.json  <пароль>
//   node tools/crypt.mjs encfile  original.pdf  docs/name.bin  <пароль>   (оригинал: [соль][iv][шифртекст])
//   node tools/crypt.mjs decfile  docs/name.bin  original.pdf  <пароль>
// family.json: {"members":[{"id","name","role"}], "tests":[{"m","d","p","n","v","u","lo","hi","f","lab"}]}
import {webcrypto as w} from 'node:crypto';
import fs from 'node:fs';
const [,, mode, src, dst, pw] = process.argv;
if(!mode||!src||!dst||!pw){console.error('usage: crypt.mjs enc|dec src dst password');process.exit(1)}
const IT=250000, te=new TextEncoder(), b64=u=>Buffer.from(u).toString('base64');
async function key(salt,it,use){
 const base=await w.subtle.importKey('raw',te.encode(pw),'PBKDF2',false,['deriveKey']);
 return w.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,[use]);
}
if(mode==='encfile'){
 const salt=w.getRandomValues(new Uint8Array(16)), iv=w.getRandomValues(new Uint8Array(12));
 const ct=new Uint8Array(await w.subtle.encrypt({name:'AES-GCM',iv},await key(salt,IT,'encrypt'),fs.readFileSync(src)));
 fs.writeFileSync(dst,Buffer.concat([salt,iv,ct]));console.log('ok ->',dst);
}else if(mode==='decfile'){
 const u=new Uint8Array(fs.readFileSync(src));
 const pt=await w.subtle.decrypt({name:'AES-GCM',iv:u.slice(16,28)},await key(u.slice(0,16),IT,'decrypt'),u.slice(28));
 fs.writeFileSync(dst,Buffer.from(pt));console.log('ok ->',dst);
}else if(mode==='enc'){
 const plain=JSON.stringify(JSON.parse(fs.readFileSync(src,'utf8')));
 const salt=w.getRandomValues(new Uint8Array(16)), iv=w.getRandomValues(new Uint8Array(12));
 const ct=await w.subtle.encrypt({name:'AES-GCM',iv},await key(salt,IT,'encrypt'),te.encode(plain));
 fs.writeFileSync(dst,'window.AZ_DATA='+JSON.stringify({v:1,it:IT,salt:b64(salt),iv:b64(iv),ct:b64(new Uint8Array(ct))})+';\n');
 console.log('ok ->',dst);
}else{
 const txt=fs.readFileSync(src,'utf8'), o=JSON.parse(txt.replace(/^window\.AZ_DATA=/,'').replace(/;\s*$/,''));
 const u=s=>new Uint8Array(Buffer.from(s,'base64'));
 const pt=await w.subtle.decrypt({name:'AES-GCM',iv:u(o.iv)},await key(u(o.salt),o.it,'decrypt'),u(o.ct));
 fs.writeFileSync(dst,JSON.stringify(JSON.parse(new TextDecoder().decode(pt)),null,1));
 console.log('ok ->',dst);
}
