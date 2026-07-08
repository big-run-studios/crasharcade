#!/usr/bin/env node
/* Spy Dash env-asset generator — Recraft pipeline (provider isolated for easy pivot).
   Usage:  node gen.mjs            → generate every asset in manifest.json
           node gen.mjs data-chip  → generate specific asset key(s)
   Needs:  spy-dash/tools/.env with RECRAFT_API_KEY=... (gitignored)
   Output: spy-dash/art/env/incoming/<out>.png  (review, then promote to art/env/) */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(ROOT, '..', 'art', 'env', 'incoming');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

/* ---- env ---- */
const envFile = path.join(ROOT, '.env');
const fileEnv = fs.existsSync(envFile)
  ? Object.fromEntries(fs.readFileSync(envFile, 'utf8').split('\n')
      .filter(l => l.includes('=') && !l.trim().startsWith('#'))
      .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
  : {};
const KEY = process.env.RECRAFT_API_KEY || fileEnv.RECRAFT_API_KEY;
const MODEL = process.env.RECRAFT_MODEL || fileEnv.RECRAFT_MODEL || 'recraftv3';
if (!KEY) {
  console.error('No RECRAFT_API_KEY. Put it in spy-dash/tools/.env  (RECRAFT_API_KEY=...)');
  process.exit(1);
}

const BASE = 'https://external.api.recraft.ai/v1';
const AUTH = { Authorization: `Bearer ${KEY}` };

async function jsonPost(p, body) {
  const r = await fetch(BASE + p, {
    method: 'POST',
    headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${p} → ${r.status}\n${text}`);
  return JSON.parse(text);
}
async function download(url, dest) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status} ${url}`);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
}

/* ---- custom style: create once from the character sheets, cache the id ---- */
const STYLE_CACHE = path.join(ROOT, '.style_id');
async function getStyleId() {
  if (fs.existsSync(STYLE_CACHE)) return fs.readFileSync(STYLE_CACHE, 'utf8').trim();
  console.log('Creating custom style from character reference sheets…');
  const fd = new FormData();
  fd.append('style', MANIFEST.styleBase);
  MANIFEST.styleRefs.forEach((rel, i) => {
    const p = path.join(ROOT, rel);
    fd.append(`file${i + 1}`, new Blob([fs.readFileSync(p)], { type: 'image/png' }), path.basename(p));
  });
  const r = await fetch(BASE + '/styles', { method: 'POST', headers: AUTH, body: fd });
  const text = await r.text();
  if (!r.ok) throw new Error(`/styles → ${r.status}\n${text}`);
  const id = JSON.parse(text).id;
  fs.writeFileSync(STYLE_CACHE, id);
  console.log('  style id:', id);
  return id;
}

/* ---- background removal (Recraft utility endpoint) ---- */
async function removeBg(file) {
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(file)], { type: 'image/png' }), path.basename(file));
  fd.append('response_format', 'url');
  const r = await fetch(BASE + '/images/removeBackground', { method: 'POST', headers: AUTH, body: fd });
  const text = await r.text();
  if (!r.ok) throw new Error(`/images/removeBackground → ${r.status}\n${text}`);
  const j = JSON.parse(text);
  const url = j.image?.url || j.data?.[0]?.url || j.url;
  if (!url) throw new Error('removeBackground: no url in response: ' + text.slice(0, 300));
  await download(url, file);
}

/* ---- PROVIDER CALL (swap this one function to pivot to Replicate/fal/etc.) ---- */
async function generate(asset, styleId) {
  if (asset.base) {
    // image-to-image: our guide locks framing/composition; the model re-skins it
    const fd = new FormData();
    const basePath = path.join(ROOT, asset.base);
    fd.append('image', new Blob([fs.readFileSync(basePath)], { type: 'image/png' }), path.basename(basePath));
    fd.append('prompt', `${asset.prompt} ${MANIFEST.promptSuffix}`);
    fd.append('strength', String(asset.strength ?? 0.4));
    if (styleId && !asset.noStyle) fd.append('style_id', styleId);
    else fd.append('style', MANIFEST.styleBase);
    fd.append('response_format', 'url');
    const r = await fetch(BASE + '/images/imageToImage', { method: 'POST', headers: AUTH, body: fd });
    const text = await r.text();
    if (!r.ok) throw new Error(`/images/imageToImage → ${r.status}\n${text}`);
    const j = JSON.parse(text);
    return j.data?.[0]?.url || j.image?.url;
  }
  const body = {
    prompt: `${asset.prompt} ${MANIFEST.promptSuffix}`,
    model: MODEL,
    n: 1,
    size: asset.genSize,
    response_format: 'url',
  };
  if (styleId) body.style_id = styleId;
  else body.style = MANIFEST.styleBase;
  const j = await jsonPost('/images/generations', body);
  return j.data[0].url;
}

/* ---- main ---- */
const only = process.argv.slice(2);
const list = MANIFEST.assets.filter(a => !only.length || only.includes(a.key));
if (!list.length) { console.error('No matching asset keys. Available: ' + MANIFEST.assets.map(a => a.key).join(', ')); process.exit(1); }
fs.mkdirSync(OUT_DIR, { recursive: true });

const styleId = await getStyleId().catch(e => { console.warn('Custom style failed — falling back to base style.\n' + e.message); return null; });

for (const asset of list) {
  const dest = path.join(OUT_DIR, asset.out);
  try {
    console.log(`\n[${asset.key}] generating ${asset.genSize}…`);
    const url = await generate(asset, styleId);
    await download(url, dest);
    if (asset.base) {
      // guide-derived alpha (and optional inner crop) — exact, no API guessing
      const args = [path.join(ROOT, 'post.py'), dest, path.join(ROOT, asset.base)];
      if (asset.cropInner) args.push(String(asset.cropInner));
      const p = spawnSync('python3', args, { encoding: 'utf8' });
      if (p.status !== 0) throw new Error('post.py failed: ' + p.stderr);
      console.log(`[${asset.key}] ${p.stdout.trim()}`);
    } else if (asset.removeBg) {
      console.log(`[${asset.key}] removing background…`);
      await removeBg(dest);
    }
    console.log(`[${asset.key}] ✓ ${path.relative(process.cwd(), dest)}`);
  } catch (e) {
    console.error(`[${asset.key}] ✗ ${e.message}`);
  }
}
console.log('\nDone. Review art/env/incoming/, then promote keepers to art/env/.');
