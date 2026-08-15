/* =========================================================================
   STEEL NC / FNC 3D VIEWER FOR OPENSTEEL
   -------------------------------------------------------------------------
   Two independent parsers (DSTV + FNC) normalize into one PartModel, which
   a set of per-profile-family builders turn into a Three.js scene.
   Real solids for I/T/U/L/RHS/PLATE (holes + AK/IK cut directly into each
   wall's 2D outline before extrusion with winding correction);
   CHS/ROUND/CUSTOM stay outline-only overlays / radial representations.
   ========================================================================= */

(function() {
'use strict';

/* ---------------------------- 1. PARSERS -------------------------------- */

const DSTV_HEADER_FIELDS = [
  'orderNo','drawingNo','assemblyMark','partMark','material','quantity',
  'profileName','profileCode','length','height','flangeWidth','flangeThickness',
  'webThickness', null, 'weight', null,
  'webStartCut','webEndCut','flangeStartCut','flangeEndCut'
];
const DSTV_BLOCKS = ['BO','SI','AK','IK','PU','KO','SC','TO','UE','PR','KA','EN','ST'];

function parseDSTV(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const header = {};
  let li = 0, bodyStart = lines.length;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trimStart();
    const tag2 = line.slice(0, 2).toUpperCase();
    const isTagLine = DSTV_BLOCKS.includes(tag2) && (line.length === 2 || /\s/.test(line[2] || ''));
    if (isTagLine) {
      if (tag2 === 'ST') continue;
      bodyStart = i;
      break;
    }
    if (line.slice(0, 2) === '**') continue;
    line = line.split('**')[0];
    if (li >= 20) continue;
    const key = DSTV_HEADER_FIELDS[li];
    if (key) header[key] = line.trim();
    li++;
  }

  header.length = parseFloat(header.length) || 0;
  header.height = parseFloat(header.height) || 0;
  header.flangeWidth = parseFloat(header.flangeWidth) || 0;
  header.flangeThickness = parseFloat(header.flangeThickness) || 0;
  header.webThickness = parseFloat(header.webThickness) || 0;
  header.weight = parseFloat(header.weight) || 0;
  header.webStartCut = parseFloat(header.webStartCut) || 0;
  header.webEndCut = parseFloat(header.webEndCut) || 0;
  header.flangeStartCut = parseFloat(header.flangeStartCut) || 0;
  header.flangeEndCut = parseFloat(header.flangeEndCut) || 0;
  header.profileFamily = mapDstvProfileCode(header.profileCode || header.profileName);

  let block = null, lastFaceAK = '', lastFaceIK = '', lastFaceBO = 'v', lastFaceMark = '', lastFaceKO = '';
  const holes = [], contours = { v: [], o: [], u: [], h: [] }, openings = { v: [], o: [], u: [], h: [] };
  const scribeLines = { v: [], o: [], u: [], h: [] }, punchMarks = [], markings = [];
  const customProfilePoints = [], unrecognizedBlocks = new Set();
  let curContourPath = null, curOpeningPath = null, curScribePath = null;

  for (const raw of lines.slice(bodyStart)) {
    let line = raw.trim().replace(/\s+/g, ' ');
    if (!line) continue;

    const tagMatch = line.match(/^([A-Za-z][A-Za-z0-9])(?=\s|$)/);
    if (tagMatch) {
      const tag = tagMatch[1].toUpperCase();
      block = tag;
      if (block === 'EN') break;
      curContourPath = null; curOpeningPath = null; curScribePath = null;
      if (!['ST','BO','AK','IK','KO','PU','SI','PR'].includes(block)) unrecognizedBlocks.add(block);
      continue;
    }
    if (block === 'ST') continue;

    if (block === 'BO') {
      const h = parseHoleLine(line, lastFaceBO);
      if (h) { lastFaceBO = h.face; holes.push(h); }
    } else if (block === 'AK') {
      const pt = parseContourLine(line, lastFaceAK);
      if (pt) {
        lastFaceAK = pt.face;
        if (!curContourPath) { curContourPath = []; (contours[pt.face] ||= []).push(curContourPath); }
        curContourPath.push(pt);
      }
    } else if (block === 'IK') {
      const pt = parseContourLine(line, lastFaceIK);
      if (pt) {
        lastFaceIK = pt.face;
        if (!curOpeningPath) { curOpeningPath = []; (openings[pt.face] ||= []).push(curOpeningPath); }
        curOpeningPath.push(pt);
      }
    } else if (block === 'KO') {
      const pt = parseContourLine(line, lastFaceKO);
      if (pt) {
        lastFaceKO = pt.face;
        if (!curScribePath) { curScribePath = []; (scribeLines[pt.face] ||= []).push(curScribePath); }
        curScribePath.push(pt);
      }
    } else if (block === 'PU') {
      const pt = parseContourLine(line, lastFaceKO);
      if (pt) { lastFaceKO = pt.face; punchMarks.push(pt); }
    } else if (block === 'SI') {
      const m = parseMarkLine(line, lastFaceMark);
      if (m) { lastFaceMark = m.face; markings.push(m); }
    } else if (block === 'PR') {
      const t = tokenize(line.replace(/^[+-]\s*/, ''));
      if (t.length >= 2 && t[0].num !== undefined && t[1].num !== undefined) {
        customProfilePoints.push({ x: t[0].num, y: t[1].num });
      }
    }
  }

  if (customProfilePoints.length >= 3) header.profileFamily = 'CUSTOM';

  return {
    format: 'dstv', header, holes, contours, openings, scribeLines, punchMarks, markings,
    customProfilePoints, unrecognizedBlocks: [...unrecognizedBlocks]
  };
}

function mapDstvProfileCode(code) {
  if (!code) return 'PLATE';
  const c = code.trim().toUpperCase();
  if (c.startsWith('RO')) return 'CHS';
  if (c.startsWith('RU')) return 'ROUND';
  if (c.startsWith('I') || c.startsWith('H') || c.startsWith('W') || c.startsWith('IPE') || c.startsWith('HEA') || c.startsWith('HEB') || c.startsWith('HEM')) return 'I';
  if (c.startsWith('U') || c.startsWith('UPN') || c.startsWith('UPE')) return 'U';
  if (c.startsWith('L')) return 'L';
  if (c.startsWith('T')) return 'T';
  if (c.startsWith('M') || c.startsWith('S') || c.startsWith('SHS') || c.startsWith('RHS')) return 'RHS';
  if (c.startsWith('C')) return 'U';
  if (c.startsWith('B') || c.startsWith('P') || c.startsWith('FLAT') || c.startsWith('STRIP')) return 'PLATE';
  return 'PLATE';
}

function stripFaceLetter(line, lastFace) {
  const m = line.match(/^\s*([vouh])(?=[\s\d.])/i);
  if (m) return { face: m[1].toLowerCase(), rest: line.slice(m.index + m[0].length) };
  return { face: lastFace, rest: line };
}

function tokenize(rest) {
  const out = [];
  const s = rest.trim();
  let i = 0;
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    const start = i;
    if (s[i] === '-') i++;
    while (i < s.length && /[\d.]/.test(s[i])) i++;
    if (i === start || (i === start + 1 && s[start] === '-')) {
      let j = i;
      while (j < s.length && !/\s/.test(s[j])) j++;
      out.push({ text: s.slice(start, j) });
      i = j;
      continue;
    }
    const numStr = s.slice(start, i);
    const suffixStart = i;
    while (i < s.length && /[A-Za-z]/.test(s[i])) i++;
    out.push({ num: parseFloat(numStr), suffix: s.slice(suffixStart, i) });
  }
  return out;
}

function parseHoleLine(line, lastFace) {
  const { face, rest } = stripFaceLetter(line, lastFace);
  const t = tokenize(rest);
  if (t.length < 3 || t[0].num === undefined) return null;
  const x = t[0].num, xRef = t[0].suffix || '';
  const y = t[1].num, yFlag = t[1].suffix || '';
  const dia = t[2].num, diaFlag = (t[2].suffix || '').toLowerCase();

  let depth = 0, depthFlag = '';
  if (t[3] !== undefined && t[3].num !== undefined) {
    depth = t[3].num; depthFlag = (t[3].suffix || '').toLowerCase();
  }
  let width = 0, height = 0, angle = 0, isSlot = false;
  if (depthFlag === 'l' && t[4] && t[4].num !== undefined && t[5] && t[5].num !== undefined) {
    width = t[4].num;
    height = t[5].num;
    angle = (t[6] && t[6].num !== undefined) ? t[6].num : 0;
    isSlot = true;
  }
  return { face, x, xRef, y, yFlag, dia, diaFlag, depth, depthFlag, isSlot, width, height, angle };
}

function parseContourLine(line, lastFace) {
  const { face, rest } = stripFaceLetter(line, lastFace);
  const t = tokenize(rest);
  if (t.length < 2 || t[0].num === undefined) return null;
  const x = t[0].num, xRef = t[0].suffix || '';
  const y = t[1].num, yFlag = (t[1].suffix || '').toLowerCase();
  const radius = t[2] !== undefined ? t[2].num : 0;
  const extra = t.slice(3).filter(tk => tk.num !== undefined).map(tk => tk.num);
  return { face, x, xRef, y, yFlag, radius, extra };
}

function parseMarkLine(line, lastFace) {
  const { face, rest } = stripFaceLetter(line, lastFace);
  const t = tokenize(rest);
  if (t.length < 2 || t[0].num === undefined) return null;
  const x = t[0].num, xRef = t[0].suffix || '';
  const y = t[1].num;
  const angle = t[2] !== undefined && t[2].num !== undefined ? t[2].num : 0;
  const height = t[3] !== undefined && t[3].num !== undefined ? t[3].num : 5;
  let text = '';
  for (let i = 4; i < t.length; i++) {
    if (t[i].text !== undefined) { text = t[i].text; break; }
    if (t[i].num !== undefined && i === t.length - 1) text = String(t[i].num);
  }
  return { face, x, xRef, y, angle, height, text };
}

const FNC_FACE_MAP     = { DA: 'u', DB: 'o', DC: 'v', DD: 'h' };
const FNC_FACE_MAP_ANG = { DA: 'u', DB: 'v' };
const FNC_PROFILE_MAP  = { I: 'I', R: 'CHS', U: 'U', L: 'L', P: 'PLATE', T: 'T', C: 'U', Q: 'RHS' };
const FNC_KNOWN_TAGS   = new Set(['[[PRF]]','[PRF]','[[MAT]]','[MAT]','[[PCS]]','[HEAD]','[HOL]','[MARK]']);

function parseFNC(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const header = { profileFamily: 'PLATE' };
  const holes = [], markings = [];
  const unrecognizedBlocks = new Set();
  let profileCodeRaw = '';

  const kv = (line) => { const o = {}; for (const m of line.matchAll(/(\w+):(\S+)/g)) o[m[1]] = m[2]; return o; };
  const num = (line, tag) => { const m = line.match(new RegExp(tag + '(-?[\\d.]+)')); return m ? parseFloat(m[1]) : undefined; };

  for (const line of lines) {
    const tagMatch = line.match(/^(\[\[?[A-Za-z0-9_]+\]?\])/);
    if (tagMatch && !FNC_KNOWN_TAGS.has(tagMatch[1])) unrecognizedBlocks.add(tagMatch[1]);
    if (line.startsWith('[PRF]')) {
      const o = kv(line);
      profileCodeRaw = o.CP || '';
      header.profileFamily = FNC_PROFILE_MAP[profileCodeRaw] || 'PLATE';
      header.profileName = o.P;
      header.height = num(line, 'SA') ?? header.height;
      header.webThickness = num(line, 'TA') ?? header.webThickness;
      header.flangeWidth = num(line, 'SB') ?? header.flangeWidth;
      header.flangeThickness = num(line, 'TB') ?? header.flangeThickness;
      header.weight = num(line, 'WL') ?? header.weight;
    } else if (line.startsWith('[MAT]')) {
      header.material = kv(line).M;
    } else if (line.startsWith('[HEAD]')) {
      const o = kv(line);
      header.orderNo = o.C; header.drawingNo = o.D; header.assemblyMark = o.N; header.partMark = o.POS;
    } else if (/^M:/.test(line) && /CP:/.test(line)) {
      const o = kv(line);
      header.material = header.material || o.M;
      profileCodeRaw = o.CP || profileCodeRaw;
      header.profileFamily = FNC_PROFILE_MAP[profileCodeRaw] || header.profileFamily;
      header.profileName = header.profileName || o.P;
    } else if (/^LP[\d.]/.test(line)) {
      header.length = num(line, 'LP') ?? header.length;
      const sa = num(line, 'SA'); if (sa !== undefined) header.height = sa;
      const ta = num(line, 'TA'); if (ta !== undefined) header.webThickness = ta;
      header.webStartCut = num(line, 'RAI') ?? 0;
      header.webEndCut = num(line, 'RAF') ?? 0;
      header.flangeStartCut = num(line, 'RBI') ?? 0;
      header.flangeEndCut = num(line, 'RBF') ?? 0;
    } else if (/^QI/.test(line)) {
      header.quantity = num(line, 'QI');
    } else if (line.startsWith('[HOL]')) {
      const m = line.match(/\[HOL\]\s+(\S+)\s+(DA|DB|DC|DD)([\d.]+)\s+X(-?[\d.]+)\s+Y(-?[\d.]+)/);
      if (m) {
        const faceMap = profileCodeRaw === 'L' ? FNC_FACE_MAP_ANG : FNC_FACE_MAP;
        holes.push({ face: faceMap[m[2]] || 'v', dia: parseFloat(m[3]), x: parseFloat(m[4]), y: parseFloat(m[5]),
                     depth: 0, holeType: '', drillType: m[1], isSlot: false, width: 0, height: 0, angle: 0 });
      }
    } else if (line.startsWith('[MARK]')) {
      const m = line.match(/\[MARK\]\s+(DA|DB|DC|DD)\s+X(-?[\d.]+)\s+Y(-?[\d.]+)\s+ANG(-?[\d.]+)\s+N:(\S+)/);
      if (m) {
        const faceMap = profileCodeRaw === 'L' ? FNC_FACE_MAP_ANG : FNC_FACE_MAP;
        markings.push({ face: faceMap[m[1]] || 'v', x: parseFloat(m[2]), y: parseFloat(m[3]), angle: parseFloat(m[4]), text: m[5], height: 5 });
      }
    }
  }
  header.length = header.length || 0; header.height = header.height || 0;
  header.flangeWidth = header.flangeWidth || 0; header.flangeThickness = header.flangeThickness || 0;
  header.webThickness = header.webThickness || 0;
  header.webStartCut = header.webStartCut || 0; header.webEndCut = header.webEndCut || 0;
  header.flangeStartCut = header.flangeStartCut || 0; header.flangeEndCut = header.flangeEndCut || 0;

  return {
    format: 'fnc', header, holes, contours: { v: [], o: [], u: [], h: [] },
    openings: { v: [], o: [], u: [], h: [] }, scribeLines: { v: [], o: [], u: [], h: [] },
    punchMarks: [], markings, customProfilePoints: [], unrecognizedBlocks: [...unrecognizedBlocks]
  };
}

function detectAndParse(text) {
  if (!text) return null;
  const head = text.slice(0, 400);
  if (/\[\[PRF\]\]|\[HEAD\]|\[HOL\]/i.test(head) || /\[PRF\]/i.test(head)) return parseFNC(text);
  return parseDSTV(text);
}

/* ------------------------ 2. PROFILE GEOMETRY --------------------------- */

function buildWallGeometry(shape2D, thickness, xAxis, yAxis, zAxis, translate) {
  const geo = new THREE.ExtrudeGeometry(shape2D, { depth: thickness, bevelEnabled: false, curveSegments: 16 });
  const det = xAxis.dot(new THREE.Vector3().crossVectors(yAxis, zAxis));
  if (det < 0) {
    for (const key of Object.keys(geo.attributes)) {
      const attr = geo.attributes[key];
      const size = attr.itemSize;
      const tmp = new Float32Array(size);
      for (let tri = 0; tri < attr.count; tri += 3) {
        const i1 = tri + 1, i2 = tri + 2;
        for (let k = 0; k < size; k++) tmp[k] = attr.array[i1 * size + k];
        for (let k = 0; k < size; k++) attr.array[i1 * size + k] = attr.array[i2 * size + k];
        for (let k = 0; k < size; k++) attr.array[i2 * size + k] = tmp[k];
      }
      attr.needsUpdate = true;
    }
  }
  const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  geo.applyMatrix4(m);
  geo.translate(translate.x, translate.y, translate.z);
  return geo;
}

function circleHolePath(cx, cy, r) {
  const p = new THREE.Path(); p.absarc(cx, cy, Math.max(r, 0.1), 0, Math.PI * 2, false); return p;
}

function roundedRectPath(cx, cy, w, h, r, angleDeg) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const a = THREE.MathUtils.degToRad(angleDeg || 0), cosA = Math.cos(a), sinA = Math.sin(a);
  const toWorld = (lx, ly) => [cx + lx * cosA - ly * sinA, cy + lx * sinA + ly * cosA];
  const hw = w / 2, hh = h / 2, segs = 8;
  const p = new THREE.Path();
  const arcCorner = (ccx, ccy, a0, a1) => {
    for (let i = 0; i <= segs; i++) {
      const ang = a0 + (a1 - a0) * i / segs;
      const wp = toWorld(ccx + rr * Math.cos(ang), ccy + rr * Math.sin(ang));
      p.lineTo(wp[0], wp[1]);
    }
  };
  const start = toWorld(hw, hh - rr);
  p.moveTo(start[0], start[1]);
  arcCorner(hw - rr, hh - rr, 0, Math.PI / 2);
  arcCorner(-hw + rr, hh - rr, Math.PI / 2, Math.PI);
  arcCorner(-hw + rr, -hh + rr, Math.PI, Math.PI * 1.5);
  arcCorner(hw - rr, -hh + rr, Math.PI * 1.5, Math.PI * 2);
  p.closePath();
  return p;
}

function trueHoleCenter(h) { return { x: h.x, y: h.y }; }

function holePathFor(h) {
  return (h.isSlot && h.width > 0 && h.height > 0)
    ? roundedRectPath(h.x, h.y, h.width, h.height, h.dia / 2, h.angle)
    : circleHolePath(h.x, h.y, h.dia / 2);
}

function arcSamplePoints(p0, p1, radius, segments) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy);
  if (!radius || d < 1e-6) return [{ x: p1.x, y: p1.y }];
  let r = Math.abs(radius);
  if (r < d / 2) r = d / 2;
  const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
  const h = Math.sqrt(Math.max(r * r - (d / 2) * (d / 2), 0));
  const ux = -dy / d, uy = dx / d;
  const sign = -1;
  const cx = mx + ux * h * sign, cy = my + uy * h * sign;
  const a0 = Math.atan2(p0.y - cy, p0.x - cx), a1 = Math.atan2(p1.y - cy, p1.x - cx);
  let delta = a1 - a0;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  const n = Math.max(2, Math.ceil(Math.abs(delta) / (Math.PI / (segments || 8))));
  const pts = [];
  for (let i = 1; i <= n; i++) {
    const a = a0 + delta * (i / n);
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function cornerNotchPoints(prev, cur, next, flag, r) {
  const d1x = prev.x - cur.x, d1y = prev.y - cur.y, len1 = Math.hypot(d1x, d1y);
  const d2x = next.x - cur.x, d2y = next.y - cur.y, len2 = Math.hypot(d2x, d2y);
  if (len1 < 1e-6 || len2 < 1e-6) return null;
  const u1x = d1x / len1, u1y = d1y / len1, u2x = d2x / len2, u2y = d2y / len2;
  const rr = Math.abs(r);
  if (!rr) return null;
  if (flag === 'w') {
    const rc = Math.min(rr, len1, len2);
    const t1 = { x: cur.x + u1x * rc, y: cur.y + u1y * rc };
    const t2 = { x: cur.x + u2x * rc, y: cur.y + u2y * rc };
    return { entry: t1, exit: t2, center: { x: cur.x, y: cur.y }, radius: rc };
  }
  const dot = Math.max(-1, Math.min(1, u1x * u2x + u1y * u2y));
  const theta = Math.acos(dot);
  if (theta < 1e-3 || theta > Math.PI - 1e-3) return null;
  const tdist = Math.min(rr / Math.tan(theta / 2), len1, len2);
  const t1 = { x: cur.x + u1x * tdist, y: cur.y + u1y * tdist };
  const t2 = { x: cur.x + u2x * tdist, y: cur.y + u2y * tdist };
  const bx = u1x + u2x, by = u1y + u2y, blen = Math.hypot(bx, by);
  if (blen < 1e-6) return null;
  const cdist = rr / Math.sin(theta / 2);
  const ccx = cur.x + (bx / blen) * cdist, ccy = cur.y + (by / blen) * cdist;
  return { entry: t1, exit: t2, center: { x: ccx, y: ccy }, radius: rr };
}

function arcBetween(center, r, p0, p1, wantMajor, segments) {
  const a0 = Math.atan2(p0.y - center.y, p0.x - center.x);
  const a1 = Math.atan2(p1.y - center.y, p1.x - center.x);
  let delta = ((a1 - a0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const isMajor = delta > Math.PI;
  if (wantMajor !== isMajor) delta -= Math.PI * 2;
  const n = Math.max(2, Math.ceil(Math.abs(delta) / (Math.PI / (segments || 8))));
  const pts = [];
  for (let i = 1; i <= n; i++) {
    const a = a0 + delta * (i / n);
    pts.push({ x: center.x + r * Math.cos(a), y: center.y + r * Math.sin(a) });
  }
  return pts;
}

function tessellateContour(pts, closeExtra) {
  const n = pts.length;
  if (n === 0) return [];
  const out = [pts[0]];
  let pen = pts[0];
  const step = (cur, next) => {
    const flag = (cur.yFlag || '').toLowerCase();
    if ((flag === 't' || flag === 'w') && cur.radius && next) {
      const c = cornerNotchPoints(pen, cur, next, flag, cur.radius);
      if (c) {
        for (const p of arcSamplePoints(pen, c.entry, pen.radius || 0, 8)) out.push(p);
        for (const p of arcBetween(c.center, c.radius, c.entry, c.exit, flag === 'w', 10)) out.push(p);
        pen = c.exit;
        return;
      }
    }
    for (const p of arcSamplePoints(pen, cur, pen.radius || 0, 8)) out.push(p);
    pen = cur;
  };
  for (let i = 1; i < n; i++) step(pts[i], pts[i + 1]);
  if (closeExtra && n > 2) step(pts[0], null);
  return out;
}

function traceContour(ctor, pts) {
  const flat = tessellateContour(pts, false);
  const s = new ctor();
  s.moveTo(flat[0].x, flat[0].y);
  for (let i = 1; i < flat.length; i++) s.lineTo(flat[i].x, flat[i].y);
  s.closePath();
  return s;
}

function shapeFromContourPath(pts) { return traceContour(THREE.Shape, pts); }
function pathFromContourPath(pts) { return traceContour(THREE.Path, pts); }

const PROFILES = {
  I: {
    buildShape(d) {
      const { height: H, flangeWidth: B, webThickness: tw, flangeThickness: tf } = d;
      const s = new THREE.Shape();
      const pts = [
        [B / 2, -H / 2], [B / 2, -H / 2 + tf], [tw / 2, -H / 2 + tf], [tw / 2, H / 2 - tf], [B / 2, H / 2 - tf], [B / 2, H / 2],
        [-B / 2, H / 2], [-B / 2, H / 2 - tf], [-tw / 2, H / 2 - tf], [-tw / 2, -H / 2 + tf], [-B / 2, -H / 2 + tf], [-B / 2, -H / 2]
      ];
      s.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) s.lineTo(...pts[i]); s.closePath();
      return s;
    },
    faceToLocalXY(face, x, y, d) {
      const { height: H, flangeWidth: B, webThickness: tw } = d;
      if (face === 'o') return { X: y - B / 2, Y: H / 2 };
      if (face === 'u') return { X: y - B / 2, Y: -H / 2 };
      if (face === 'v') return { X: tw / 2, Y: y - H / 2 };
      if (face === 'h') return { X: -tw / 2, Y: y - H / 2 };
      return { X: 0, Y: 0 };
    },
    walls(d) {
      const { length: L, height: H, flangeWidth: B, webThickness: tw, flangeThickness: tf } = d;
      const rect = (w, h) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(L, 0); s.lineTo(L, h); s.lineTo(0, h); s.closePath(); return s; };
      const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
      return [
        { faces: ['o'], thickness: tf, outline: () => rect(L, B), xAxis: Z, yAxis: X, zAxis: Y, translate: { x: -B / 2, y: H / 2 - tf, z: 0 } },
        { faces: ['u'], thickness: tf, outline: () => rect(L, B), xAxis: Z, yAxis: X, zAxis: Y, translate: { x: -B / 2, y: -H / 2, z: 0 } },
        { faces: ['v', 'h'], thickness: tw, outline: () => rect(L, H), xAxis: Z, yAxis: Y, zAxis: X, translate: { x: -tw / 2, y: -H / 2, z: 0 } },
      ];
    }
  },
  T: {
    buildShape(d) {
      const { height: H, flangeWidth: B, webThickness: tw, flangeThickness: tf } = d;
      const s = new THREE.Shape();
      const pts = [
        [tw / 2, -H / 2], [tw / 2, H / 2 - tf], [B / 2, H / 2 - tf], [B / 2, H / 2],
        [-B / 2, H / 2], [-B / 2, H / 2 - tf], [-tw / 2, H / 2 - tf], [-tw / 2, -H / 2]
      ];
      s.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) s.lineTo(...pts[i]); s.closePath();
      return s;
    },
    faceToLocalXY(face, x, y, d) {
      const { height: H, flangeWidth: B, webThickness: tw } = d;
      if (face === 'o') return { X: y - B / 2, Y: H / 2 };
      if (face === 'v') return { X: tw / 2, Y: y - H / 2 };
      if (face === 'h') return { X: -tw / 2, Y: y - H / 2 };
      return { X: 0, Y: 0 };
    },
    walls(d) {
      const { length: L, height: H, flangeWidth: B, webThickness: tw, flangeThickness: tf } = d;
      const rect = (h) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(L, 0); s.lineTo(L, h); s.lineTo(0, h); s.closePath(); return s; };
      const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
      return [
        { faces: ['o'], thickness: tf, outline: () => rect(B), xAxis: Z, yAxis: X, zAxis: Y, translate: { x: -B / 2, y: H / 2 - tf, z: 0 } },
        { faces: ['v', 'h'], thickness: tw, outline: () => rect(H), xAxis: Z, yAxis: Y, zAxis: X, translate: { x: -tw / 2, y: -H / 2, z: 0 } },
      ];
    }
  },
  U: {
    buildShape(d) {
      const { height: H, flangeWidth: B, webThickness: tw, flangeThickness: tf } = d;
      const s = new THREE.Shape();
      const pts = [[0, -H / 2], [B, -H / 2], [B, -H / 2 + tf], [tw, -H / 2 + tf], [tw, H / 2 - tf], [B, H / 2 - tf], [B, H / 2], [0, H / 2]];
      s.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) s.lineTo(...pts[i]); s.closePath();
      return s;
    },
    faceToLocalXY(face, x, y, d) {
      const { height: H, webThickness: tw } = d;
      if (face === 'o') return { X: y, Y: H / 2 };
      if (face === 'u') return { X: y, Y: -H / 2 };
      if (face === 'v') return { X: 0, Y: y - H / 2 };
      if (face === 'h') return { X: tw, Y: y - H / 2 };
      return { X: 0, Y: 0 };
    },
    walls(d) {
      const { length: L, height: H, flangeWidth: B, webThickness: tw, flangeThickness: tf } = d;
      const rect = (w, h) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(L, 0); s.lineTo(L, h); s.lineTo(0, h); s.closePath(); return s; };
      const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
      return [
        { faces: ['o'], thickness: tf, outline: () => rect(L, B), xAxis: Z, yAxis: X, zAxis: Y, translate: { x: 0, y: H / 2 - tf, z: 0 } },
        { faces: ['u'], thickness: tf, outline: () => rect(L, B), xAxis: Z, yAxis: X, zAxis: Y, translate: { x: 0, y: -H / 2, z: 0 } },
        { faces: ['v', 'h'], thickness: tw, outline: () => rect(L, H), xAxis: Z, yAxis: Y, zAxis: X, translate: { x: 0, y: -H / 2, z: 0 } },
      ];
    }
  },
  L: {
    buildShape(d) {
      const { height: H, flangeWidth: B, webThickness: tw } = d;
      const t = tw || d.flangeThickness || 10;
      const s = new THREE.Shape();
      const pts = [[0, 0], [B, 0], [B, t], [t, t], [t, H], [0, H]];
      s.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) s.lineTo(...pts[i]); s.closePath();
      return s;
    },
    faceToLocalXY(face, x, y, d) {
      if (face === 'u') return { X: y, Y: 0 };
      if (face === 'v') return { X: 0, Y: y };
      return { X: 0, Y: 0 };
    },
    walls(d) {
      const { length: L, height: H, flangeWidth: B, webThickness: tw, flangeThickness: tf } = d;
      const t = tw || tf || 10;
      const rect = (h) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(L, 0); s.lineTo(L, h); s.lineTo(0, h); s.closePath(); return s; };
      const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
      return [
        { faces: ['u'], thickness: t, outline: () => rect(B), xAxis: Z, yAxis: X, zAxis: Y, translate: { x: 0, y: 0, z: 0 } },
        { faces: ['v'], thickness: t, outline: () => rect(H), xAxis: Z, yAxis: Y, zAxis: X, translate: { x: 0, y: 0, z: 0 } },
      ];
    }
  },
  RHS: {
    buildShape(d) {
      const { height: H, flangeWidth: B, webThickness: tw } = d;
      const t = tw || 5;
      const outer = new THREE.Shape();
      outer.moveTo(-B / 2, -H / 2); outer.lineTo(B / 2, -H / 2); outer.lineTo(B / 2, H / 2); outer.lineTo(-B / 2, H / 2); outer.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-B / 2 + t, -H / 2 + t); hole.lineTo(B / 2 - t, -H / 2 + t); hole.lineTo(B / 2 - t, H / 2 - t); hole.lineTo(-B / 2 + t, H / 2 - t); hole.closePath();
      outer.holes.push(hole);
      return outer;
    },
    faceToLocalXY(face, x, y, d) {
      const { height: H, flangeWidth: B } = d;
      if (face === 'o') return { X: y - B / 2, Y: H / 2 };
      if (face === 'u') return { X: y - B / 2, Y: -H / 2 };
      if (face === 'v') return { X: B / 2, Y: y - H / 2 };
      if (face === 'h') return { X: -B / 2, Y: y - H / 2 };
      return { X: 0, Y: 0 };
    },
    walls(d) {
      const { length: L, height: H, flangeWidth: B, webThickness: tw } = d;
      const t = tw || 5;
      const rect = (w, h) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(L, 0); s.lineTo(L, h); s.lineTo(0, h); s.closePath(); return s; };
      const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
      return [
        { faces: ['o'], thickness: t, outline: () => rect(L, B), xAxis: Z, yAxis: X, zAxis: Y, translate: { x: -B / 2, y: H / 2 - t, z: 0 } },
        { faces: ['u'], thickness: t, outline: () => rect(L, B), xAxis: Z, yAxis: X, zAxis: Y, translate: { x: -B / 2, y: -H / 2, z: 0 } },
        { faces: ['v'], thickness: t, outline: () => rect(L, H), xAxis: Z, yAxis: Y, zAxis: X, translate: { x: B / 2 - t, y: -H / 2, z: 0 } },
        { faces: ['h'], thickness: t, outline: () => rect(L, H), xAxis: Z, yAxis: Y, zAxis: X, translate: { x: -B / 2, y: -H / 2, z: 0 } },
      ];
    }
  },
  CHS: {
    buildShape(d) {
      const R = (d.height || d.flangeWidth || 50) / 2;
      const t = d.webThickness || Math.max(2, R * 0.1);
      const s = new THREE.Shape();
      s.absarc(0, 0, R, 0, Math.PI * 2, false);
      const hole = new THREE.Path(); hole.absarc(0, 0, Math.max(1, R - t), 0, Math.PI * 2, true);
      s.holes.push(hole);
      return s;
    },
    faceToLocalXY(face, x, y, d) {
      const R = (d.height || d.flangeWidth || 50) / 2;
      const ref = { v: 0, o: Math.PI / 2, h: Math.PI, u: -Math.PI / 2 }[face] ?? 0;
      const ang = ref + (y / R);
      return { X: R * Math.cos(ang), Y: R * Math.sin(ang), angle: ang };
    }
  },
  ROUND: {
    buildShape(d) {
      const R = (d.height || d.flangeWidth || 50) / 2;
      const s = new THREE.Shape(); s.absarc(0, 0, R, 0, Math.PI * 2, false); return s;
    },
    faceToLocalXY(face, x, y, d) {
      const R = (d.height || d.flangeWidth || 50) / 2;
      const ref = { v: 0, o: Math.PI / 2, h: Math.PI, u: -Math.PI / 2 }[face] ?? 0;
      const ang = ref + (y / R);
      return { X: R * Math.cos(ang), Y: R * Math.sin(ang), angle: ang };
    }
  },
  PLATE: {
    buildShape(d) {
      const W = d.height || d.flangeWidth || 100;
      const t = d.webThickness || d.flangeThickness || d.flangeWidth || 10;
      const s = new THREE.Shape();
      s.moveTo(-t / 2, -W / 2); s.lineTo(t / 2, -W / 2); s.lineTo(t / 2, W / 2); s.lineTo(-t / 2, W / 2); s.closePath();
      return s;
    },
    faceToLocalXY(face, x, y, d) {
      const t = d.webThickness || d.flangeThickness || d.flangeWidth || 10;
      const W = d.height || d.flangeWidth || 100;
      return { X: t / 2, Y: y - W / 2 };
    },
    walls(d) {
      const { length: L } = d;
      const W = d.height || d.flangeWidth || 100;
      const t = d.webThickness || d.flangeThickness || d.flangeWidth || 10;
      const rect = () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(L, 0); s.lineTo(L, W); s.lineTo(0, W); s.closePath(); return s; };
      const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
      return [{ faces: ['v', 'o', 'u', 'h'], thickness: t, outline: rect, xAxis: Z, yAxis: Y, zAxis: X, translate: { x: -t / 2, y: -W / 2, z: 0 } }];
    }
  },
  CUSTOM: {
    buildShape(d) {
      const pts = d.customProfilePoints || [];
      const s = new THREE.Shape();
      if (!pts.length) return s;
      s.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) s.lineTo(pts[i].x, pts[i].y);
      s.closePath();
      return s;
    },
    faceToLocalXY(face, x, y, d) {
      const t = d.webThickness || d.flangeThickness || 10;
      const W = d.height || d.flangeWidth || 100;
      return { X: t / 2, Y: y - W / 2 };
    }
  }
};

function faceToWorld(profile, face, x, y, dims) {
  const local = PROFILES[profile].faceToLocalXY(face, x, y, dims);
  return { x: local.X, y: local.Y, z: x, angle: local.angle };
}

function faceBasis(profile, face, x, y, dims) {
  const eps = 1;
  const c   = faceToWorld(profile, face, x, y, dims);
  const dxp = faceToWorld(profile, face, x + eps, y, dims);
  const dxm = faceToWorld(profile, face, x - eps, y, dims);
  const dyp = faceToWorld(profile, face, x, y + eps, dims);
  const dym = faceToWorld(profile, face, x, y - eps, dims);
  const along = new THREE.Vector3(dxp.x - dxm.x, dxp.y - dxm.y, dxp.z - dxm.z);
  if (along.lengthSq() < 1e-8) along.set(0, 0, 1);
  along.normalize();
  const across = new THREE.Vector3(dyp.x - dym.x, dyp.y - dym.y, dyp.z - dym.z);
  if (across.lengthSq() < 1e-8) across.set(0, 1, 0);
  across.normalize();
  const normal = new THREE.Vector3().crossVectors(along, across).normalize();
  const centerDir = new THREE.Vector3(c.x, c.y, 0);
  if (centerDir.lengthSq() > 1e-6 && normal.dot(centerDir) < 0) normal.negate();
  return { position: new THREE.Vector3(c.x, c.y, c.z), along, across, normal };
}

function textPlane(msg, color, face, worldSize) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0, 0, 256, 64);
  ctx.font = 'bold 40px monospace'; ctx.fillStyle = color || '#ffb454';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(msg, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, side: THREE.DoubleSide,
    depthTest: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4
  });
  const geo = new THREE.PlaneGeometry(worldSize, worldSize * 0.25);
  const mesh = new THREE.Mesh(geo, mat);
  const basis = new THREE.Matrix4().makeBasis(face.along, face.across, face.normal);
  mesh.quaternion.setFromRotationMatrix(basis);
  const off = face.normal.clone().multiplyScalar(worldSize * 0.02);
  mesh.position.copy(face.position).add(off);
  return mesh;
}

/* --------------------------- 3. SCENE BUILD ------------------------------ */
let scene, camera, renderer, group;
let currentPart = null;
let selectedHoles = new Set();
let cameraNeedsFraming = true;
let isInitialized = false;
let camTarget = null, camDist = 2000, camTheta = 0.9, camPhi = 1.1;
let camAnimation = null;
let hoveredHole = null;

const STEEL_FINISHES = {
  steel: {
    name: 'Structural Steel',
    color: 0x546e7a,
    metalness: 0.35,
    roughness: 0.45,
    edgeColor: 0x1a2634,
    wireColor: 0x4fc3f7
  },
  galv: {
    name: 'Galvanized Zinc',
    color: 0xb0bec5,
    metalness: 0.70,
    roughness: 0.30,
    edgeColor: 0x37474f,
    wireColor: 0x79c0ff
  },
  primer: {
    name: 'Red Oxide Primer',
    color: 0x8d382d,
    metalness: 0.08,
    roughness: 0.82,
    edgeColor: 0x3e1510,
    wireColor: 0xffab91
  },
  cad: {
    name: 'High-Contrast CAD',
    color: 0x1f2630,
    metalness: 0.50,
    roughness: 0.40,
    edgeColor: 0x00e5ff,
    wireColor: 0x00e5ff
  }
};
let currentFinish = 'steel';

function changeSteelFinish(finishKey) {
  if (STEEL_FINISHES[finishKey]) {
    currentFinish = finishKey;
    render();
  }
}

function initThree() {
  const holder = document.getElementById('canvasHolder3D') || document.getElementById('3d-view');
  if (!holder || typeof THREE === 'undefined') return;

  holder.innerHTML = '';
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090614);

  const w = holder.clientWidth || 800;
  const h = holder.clientHeight || 450;

  camera = new THREE.PerspectiveCamera(45, w / h, 1, 100000);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h);
  holder.appendChild(renderer.domElement);

  // 3-Point Studio Lighting
  scene.add(new THREE.HemisphereLight(0xdde8f0, 0x140d2b, 0.95));
  const dl1 = new THREE.DirectionalLight(0xffffff, 0.85); dl1.position.set(400, 800, 500); scene.add(dl1);
  const dl2 = new THREE.DirectionalLight(0x90caf9, 0.45); dl2.position.set(-400, -300, -500); scene.add(dl2);
  const dl3 = new THREE.DirectionalLight(0xffffff, 0.35); dl3.position.set(0, 500, -600); scene.add(dl3);

  group = new THREE.Group(); scene.add(group);
  if (!camTarget) camTarget = new THREE.Vector3(0, 0, 0);
  setupOrbit(renderer.domElement);
  setupHoleHover(renderer.domElement);
  window.addEventListener('resize', onResize);
  isInitialized = true;
  animate();
}

function onResize() {
  const holder = document.getElementById('canvasHolder3D') || document.getElementById('3d-view');
  if (!holder || !camera || !renderer) return;
  const vp = document.getElementById('viewport3D');
  const w = holder.clientWidth || (vp && vp.clientWidth) || holder.offsetWidth || (window.innerWidth * 0.94);
  const h = holder.clientHeight || (vp && vp.clientHeight) || holder.offsetHeight || 500;
  if (w <= 10 || h <= 10) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function updateCamFromSpherical() {
  if (!camera) return;
  if (!camTarget) camTarget = new THREE.Vector3(0, 0, 0);
  const x = camTarget.x + camDist * Math.sin(camPhi) * Math.sin(camTheta);
  const y = camTarget.y + camDist * Math.cos(camPhi);
  const z = camTarget.z + camDist * Math.sin(camPhi) * Math.cos(camTheta);
  camera.position.set(x, y, z);
  camera.lookAt(camTarget);
  updateViewCube();
}

function updateViewCube() {
  const cubeInner = document.getElementById('cubeInner3D');
  if (!cubeInner) return;
  const degX = Math.round(THREE.MathUtils.radToDeg(camPhi - Math.PI / 2));
  const degY = Math.round(THREE.MathUtils.radToDeg(-camTheta));
  cubeInner.style.transform = `rotateX(${degX}deg) rotateY(${degY}deg)`;
}

function animateCameraTo(targetSpherical, targetLookAt, duration = 380) {
  const startTheta = camTheta;
  const startPhi = camPhi;
  const startDist = camDist;
  const startLookAt = camTarget ? camTarget.clone() : new THREE.Vector3(0, 0, 0);
  const endLookAt = targetLookAt ? targetLookAt.clone() : startLookAt.clone();
  
  let dTheta = targetSpherical.theta - startTheta;
  while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
  while (dTheta < -Math.PI) dTheta += 2 * Math.PI;
  const endTheta = startTheta + dTheta;
  const endPhi = targetSpherical.phi;
  const endDist = targetSpherical.dist;
  
  const startTime = performance.now();
  if (camAnimation) cancelAnimationFrame(camAnimation);
  
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    camTheta = startTheta + (endTheta - startTheta) * ease;
    camPhi = startPhi + (endPhi - startPhi) * ease;
    camDist = startDist + (endDist - startDist) * ease;
    if (!camTarget) camTarget = new THREE.Vector3(0, 0, 0);
    camTarget.copy(startLookAt).lerp(endLookAt, ease);
    
    updateCamFromSpherical();
    if (progress < 1) {
      camAnimation = requestAnimationFrame(step);
    } else {
      camAnimation = null;
    }
  }
  camAnimation = requestAnimationFrame(step);
}

function setupOrbit(dom) {
  let dragging = false, panning = false, lastX = 0, lastY = 0, downX = 0, downY = 0, moved = false;
  dom.addEventListener('mousedown', e => {
    if (camAnimation) cancelAnimationFrame(camAnimation);
    if (e.button === 2) panning = true; else dragging = true;
    lastX = e.clientX; lastY = e.clientY; downX = e.clientX; downY = e.clientY; moved = false;
  });
  window.addEventListener('mouseup', e => {
    if (dragging && e.button === 0 && !moved) handleCanvasClick(e);
    dragging = false; panning = false;
  });
  window.addEventListener('mousemove', e => {
    const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
    if (Math.abs(e.clientX - downX) > 3 || Math.abs(e.clientY - downY) > 3) moved = true;
    if (dragging) {
      camTheta -= dx * 0.006; camPhi = Math.min(Math.max(camPhi - dy * 0.006, 0.05), Math.PI - 0.05);
      updateCamFromSpherical();
    } else if (panning) {
      if (!camTarget) camTarget = new THREE.Vector3(0, 0, 0);
      const right = new THREE.Vector3(); camera.getWorldDirection(right);
      const worldUp = new THREE.Vector3(0, 1, 0);
      const camRight = new THREE.Vector3().crossVectors(right, worldUp).normalize();
      const camUp = new THREE.Vector3().crossVectors(camRight, right).normalize();
      camTarget.addScaledVector(camRight, -dx * camDist * 0.0012);
      camTarget.addScaledVector(camUp, dy * camDist * 0.0012);
      updateCamFromSpherical();
    }
  });
  dom.addEventListener('contextmenu', e => e.preventDefault());
  dom.addEventListener('wheel', e => {
    e.preventDefault();
    if (camAnimation) cancelAnimationFrame(camAnimation);
    camDist *= (1 + Math.sign(e.deltaY) * 0.1);
    camDist = Math.min(Math.max(camDist, 50), 200000);
    updateCamFromSpherical();
  }, { passive: false });

  // Touch event support for Mobile UI & UX
  let touchStartDist = 0;
  let lastTouchX = 0, lastTouchY = 0;
  let isTouchDragging = false, isTouchPanning = false, isTouchZooming = false;

  dom.addEventListener('touchstart', e => {
    if (camAnimation) cancelAnimationFrame(camAnimation);
    if (e.touches.length === 1) {
      isTouchDragging = true;
      isTouchPanning = false;
      isTouchZooming = false;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      isTouchDragging = false;
      isTouchPanning = true;
      isTouchZooming = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist = Math.hypot(dx, dy);
      lastTouchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      lastTouchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
  }, { passive: true });

  dom.addEventListener('touchmove', e => {
    if (isTouchDragging && e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastTouchX;
      const dy = e.touches[0].clientY - lastTouchY;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
      camTheta -= dx * 0.008;
      camPhi = Math.min(Math.max(camPhi - dy * 0.008, 0.05), Math.PI - 0.05);
      updateCamFromSpherical();
      if (e.cancelable) e.preventDefault();
    } else if (isTouchZooming && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (touchStartDist > 0) {
        const factor = touchStartDist / dist;
        camDist *= factor;
        camDist = Math.min(Math.max(camDist, 50), 200000);
        touchStartDist = dist;
      }
      
      const currentMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const currentMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const panDX = currentMidX - lastTouchX;
      const panDY = currentMidY - lastTouchY;
      lastTouchX = currentMidX;
      lastTouchY = currentMidY;
      
      if (!camTarget) camTarget = new THREE.Vector3(0, 0, 0);
      const right = new THREE.Vector3(); camera.getWorldDirection(right);
      const worldUp = new THREE.Vector3(0, 1, 0);
      const camRight = new THREE.Vector3().crossVectors(right, worldUp).normalize();
      const camUp = new THREE.Vector3().crossVectors(camRight, right).normalize();
      camTarget.addScaledVector(camRight, -panDX * camDist * 0.0015);
      camTarget.addScaledVector(camUp, panDY * camDist * 0.0015);
      
      updateCamFromSpherical();
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });

  dom.addEventListener('touchend', e => {
    if (e.touches.length === 0) {
      isTouchDragging = false;
      isTouchPanning = false;
      isTouchZooming = false;
    } else if (e.touches.length === 1) {
      isTouchDragging = true;
      isTouchPanning = false;
      isTouchZooming = false;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    }
  });
}

function setupHoleHover(dom) {
  dom.addEventListener('pointermove', e => {
    if (!currentPart || !group) return;
    const h = raycastHoles(e.clientX, e.clientY);
    const tooltip = document.getElementById('holeHoverTooltip3D');
    if (h) {
      hoveredHole = h;
      dom.style.cursor = 'pointer';
      if (tooltip) {
        const rect = dom.getBoundingClientRect();
        const faceNames = { v: 'Web (V)', o: 'Top Flange (O)', u: 'Bottom Flange (U)', h: 'Back (H)' };
        const faceStr = faceNames[h.face] || (h.face || '').toUpperCase();
        tooltip.innerHTML = `<strong>Hole &Oslash;${h.dia || 0}mm</strong> &bull; Face: ${faceStr} &bull; X: ${Math.round(h.x)}mm, Y: ${Math.round(h.y)}mm${h.depth ? ` &bull; Depth: ${h.depth}mm` : ''}`;
        tooltip.style.left = `${Math.min(e.clientX - rect.left + 15, rect.width - 250)}px`;
        tooltip.style.top = `${Math.max(e.clientY - rect.top - 38, 10)}px`;
        tooltip.style.display = 'block';
      }
    } else {
      hoveredHole = null;
      dom.style.cursor = 'default';
      if (tooltip) tooltip.style.display = 'none';
    }
  });
  
  dom.addEventListener('pointerleave', () => {
    const tooltip = document.getElementById('holeHoverTooltip3D');
    if (tooltip) tooltip.style.display = 'none';
  });
}

function raycastHoles(clientX, clientY) {
  if (!renderer || !camera || !group) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  const pickables = group.children.filter(o => o.userData && o.userData.holeMarker);
  const hits = ray.intersectObjects(pickables, false);
  return hits.length ? hits[0].object.userData.holeMarker : null;
}

function handleCanvasClick(e) {
  if (!currentPart) return;
  const h = raycastHoles(e.clientX, e.clientY);
  const multi = e.shiftKey || e.ctrlKey || e.metaKey;
  if (h) {
    if (multi) { if (selectedHoles.has(h)) selectedHoles.delete(h); else selectedHoles.add(h); }
    else selectedHoles = new Set([h]);
  } else if (!multi) {
    selectedHoles.clear();
  }
  renderHoleList();
  render();
}

function animate() {
  requestAnimationFrame(animate);
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function addHoleMarker(h, profile, d, length) {
  const selected = selectedHoles.has(h);
  const path = holePathFor(h);
  const worldPts = path.getPoints(28).map(p => {
    const w = faceToWorld(profile, h.face, p.x, p.y, d);
    return new THREE.Vector3(w.x, w.y, w.z);
  });
  const col = selected ? 0xffea00 : 0x4fc3f7;
  const outline = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(worldPts),
    new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: selected ? 1 : 0.65, linewidth: selected ? 2 : 1 })
  );
  outline.userData.holeMarker = h;
  group.add(outline);

  const c = trueHoleCenter(h);
  const fb = faceBasis(profile, h.face, c.x, c.y, d);
  const prSize = h.isSlot ? Math.max(h.dia, h.width, h.height) : h.dia;
  const pr = Math.max(prSize * 0.22, length * 0.0035, 3);
  const sph = new THREE.Mesh(
    new THREE.SphereGeometry(pr, 10, 8),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: selected ? 0.95 : 0.18 })
  );
  sph.position.copy(fb.position);
  sph.userData.holeMarker = h;
  group.add(sph);
}

function add3DDimensions(d, length) {
  const showDims = getToggleState('tgDims', false);
  if (!showDims) return;
  
  const h = d.height || 100;
  const b = d.flangeWidth || 100;
  const off = Math.max(h, b, 50) * 0.25 + 25;
  
  // Length dimension line (along Z: 0 to length)
  const lY = -h / 2 - off;
  const lX = b / 2 + off;
  createDimLine(new THREE.Vector3(lX, lY, 0), new THREE.Vector3(lX, lY, length), `L: ${Math.round(length)} mm`, new THREE.Vector3(0, 1, 0));
  
  // Height dimension line (along Y: -h/2 to h/2)
  const hZ = -off;
  const hX = -b / 2 - off;
  createDimLine(new THREE.Vector3(hX, -h / 2, hZ), new THREE.Vector3(hX, h / 2, hZ), `H: ${Math.round(h)} mm`, new THREE.Vector3(0, 0, 1));
  
  // Flange width dimension line (along X: -b/2 to b/2)
  const bZ = -off;
  const bY = h / 2 + off;
  createDimLine(new THREE.Vector3(-b / 2, bY, bZ), new THREE.Vector3(b / 2, bY, bZ), `B: ${Math.round(b)} mm`, new THREE.Vector3(0, 0, 1));
}

function createDimLine(p1, p2, text, normalHint) {
  const pts = [p1, p2];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: 0xea80fc, transparent: true, opacity: 0.85 });
  group.add(new THREE.Line(geo, mat));
  
  const tickLen = 14;
  const dir = normalHint.clone().normalize().multiplyScalar(tickLen / 2);
  const t1Geo = new THREE.BufferGeometry().setFromPoints([p1.clone().sub(dir), p1.clone().add(dir)]);
  const t2Geo = new THREE.BufferGeometry().setFromPoints([p2.clone().sub(dir), p2.clone().add(dir)]);
  group.add(new THREE.Line(t1Geo, mat));
  group.add(new THREE.Line(t2Geo, mat));
  
  const mid = p1.clone().lerp(p2, 0.5).add(dir.clone().multiplyScalar(1.2));
  const tag = makeTextTag(text, '#ea80fc');
  tag.position.copy(mid);
  group.add(tag);
}

function makeTextTag(text, color) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(20, 15, 45, 0.88)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(8, 8, 240, 48, 8); else ctx.rect(8, 8, 240, 48);
  ctx.fill();
  ctx.strokeStyle = color || '#b388ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = 'bold 24px "JetBrains Mono", Consolas, monospace';
  ctx.fillStyle = color || '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(70, 18, 1);
  return sprite;
}

function addFloorGrid(length, d) {
  const showGrid = getToggleState('tgGrid', false);
  if (!showGrid) return;
  const h = d.height || 100;
  const b = d.flangeWidth || 100;
  const groundY = -h / 2 - 25;
  const gridSize = Math.max(length, b, h) * 1.6 + 400;
  
  const grid = new THREE.GridHelper(gridSize, 20, 0x5e35b1, 0x1a123a);
  grid.position.set(0, groundY, length / 2);
  group.add(grid);
}

function buildScene(part) {
  if (!isInitialized) initThree();
  if (!group) return;
  group.clear();

  const d = part.header;
  d.customProfilePoints = part.customProfilePoints || [];
  let profile = PROFILES[d.profileFamily] ? d.profileFamily : 'PLATE';
  if (profile === 'CUSTOM' && d.customProfilePoints.length < 3) profile = 'PLATE';
  const P = PROFILES[profile];
  const length = d.length || 1000;

  const finish = STEEL_FINISHES[currentFinish] || STEEL_FINISHES.steel;
  const solidMat = new THREE.MeshStandardMaterial({
    color: finish.color,
    metalness: finish.metalness,
    roughness: finish.roughness,
    flatShading: false
  });
  const wireMat = new THREE.MeshBasicMaterial({
    color: finish.wireColor,
    wireframe: true,
    transparent: true,
    opacity: 0.4
  });

  const showSolid = getToggleState('tgSolid', true);
  const showEdges = getToggleState('tgEdges', true);
  const showWire = getToggleState('tgWire', false);
  const showHoles = getToggleState('tgHoles', true);
  const showMarks = getToggleState('tgMarks', true);
  const showNotches = getToggleState('tgNotch', true);
  const showAxes = getToggleState('tgAxes', false);

  const consumedAK = new Set(), consumedIK = new Set();

  if (P.walls) {
    for (const wall of P.walls(d)) {
      const akFace = wall.faces.find(f => part.contours[f] && part.contours[f].some(p => p.length >= 3));
      let shape;
      if (akFace) {
        const loops = part.contours[akFace].filter(p => p.length >= 3).slice().sort((a, b) => b.length - a.length);
        shape = shapeFromContourPath(loops[0]);
        for (let i = 1; i < loops.length; i++) shape.holes.push(pathFromContourPath(loops[i]));
        for (const f of wall.faces) consumedAK.add(f);
      } else {
        shape = wall.outline();
      }

      const blindCaps = [];
      if (showHoles) {
        for (const h of part.holes) {
          if (!h.dia || !wall.faces.includes(h.face)) continue;
          shape.holes.push(holePathFor(h));
          if (h.depth > 0 && h.depth < wall.thickness - Math.max(wall.thickness * 0.05, 0.5)) {
            const c = trueHoleCenter(h);
            blindCaps.push({ face: h.face, x: c.x, y: c.y, r: h.dia / 2, depth: h.depth });
          }
        }
      }

      for (const f of wall.faces) {
        for (const openPath of (part.openings[f] || [])) {
          if (openPath.length >= 3) { shape.holes.push(pathFromContourPath(openPath)); consumedIK.add(f); }
        }
      }

      const geo = buildWallGeometry(shape, wall.thickness, wall.xAxis, wall.yAxis, wall.zAxis, wall.translate);
      if (showSolid) {
        const mesh = new THREE.Mesh(geo, solidMat);
        group.add(mesh);
        if (showEdges) {
          const edgesGeo = new THREE.EdgesGeometry(geo, 18);
          const edgesMat = new THREE.LineBasicMaterial({ color: finish.edgeColor, linewidth: 1 });
          group.add(new THREE.LineSegments(edgesGeo, edgesMat));
        }
      }
      if (showWire) {
        const wire = new THREE.Mesh(geo, wireMat);
        group.add(wire);
      }

      for (const cap of blindCaps) {
        const fb = faceBasis(profile, cap.face, cap.x, cap.y, d);
        const capThickness = Math.max(wall.thickness * 0.06, 0.5);
        const discShape = new THREE.Shape();
        discShape.absarc(0, 0, Math.max(cap.r, 0.1), 0, Math.PI * 2, false);
        const capGeo = new THREE.ExtrudeGeometry(discShape, { depth: capThickness, bevelEnabled: false, curveSegments: 16 });
        capGeo.applyMatrix4(new THREE.Matrix4().makeBasis(fb.along, fb.across, fb.normal));
        const centerWorld = fb.position.clone().add(fb.normal.clone().multiplyScalar(-(cap.depth + capThickness / 2)));
        capGeo.translate(centerWorld.x, centerWorld.y, centerWorld.z);
        if (showSolid) {
          const capMesh = new THREE.Mesh(capGeo, solidMat);
          group.add(capMesh);
        }
      }
    }

    if (showHoles) {
      for (const h of part.holes) {
        if (!h.dia) continue;
        addHoleMarker(h, profile, d, length);
      }
    }
  } else {
    const shape = P.buildShape(d);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, curveSegments: 24 });
    if (showSolid) {
      const mesh = new THREE.Mesh(geo, solidMat);
      group.add(mesh);
      if (showEdges) {
        const edgesGeo = new THREE.EdgesGeometry(geo, 18);
        const edgesMat = new THREE.LineBasicMaterial({ color: finish.edgeColor, linewidth: 1 });
        group.add(new THREE.LineSegments(edgesGeo, edgesMat));
      }
    }
    if (showWire) {
      const wire = new THREE.Mesh(geo, wireMat);
      group.add(wire);
    }

    if (showHoles) {
      for (const h of part.holes) {
        if (!h.dia) continue;
        const w = faceToWorld(profile, h.face, h.x, h.y, d);
        const r = h.dia / 2;
        const ang = w.angle || 0;
        const radial = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0);
        const tangent = new THREE.Vector3(-Math.sin(ang), Math.cos(ang), 0);
        const along = new THREE.Vector3(0, 0, 1);
        const wallLen = Math.max(d.flangeThickness || 0, d.webThickness || 0, 5);
        const through = h.depth <= 0 || h.depth >= wallLen;
        const len = through ? wallLen * 2.2 : Math.max(h.depth, 1) * 1.15;
        const cyl = new THREE.CylinderGeometry(r, r, len, 24, 1, true);
        const selected = selectedHoles.has(h);
        const col = selected ? 0xffea00 : 0x0d1115;
        const mat = new THREE.MeshStandardMaterial({ color: col, side: THREE.BackSide, metalness: 0.1, roughness: 0.9, emissive: selected ? 0x332800 : 0x000000 });
        const cm = new THREE.Mesh(cyl, mat);
        const basis = new THREE.Matrix4().makeBasis(tangent, radial, along);
        cm.quaternion.setFromRotationMatrix(basis);
        const centerOffset = through ? 0 : len / 2;
        cm.position.set(w.x - radial.x * centerOffset, w.y - radial.y * centerOffset, w.z);
        cm.userData.holeMarker = h;
        group.add(cm);
        const rim = new THREE.Mesh(new THREE.RingGeometry(r * 0.92, r * 1.05, 24), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
        rim.position.set(w.x, w.y, w.z);
        rim.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent, along, radial));
        rim.userData.holeMarker = h;
        group.add(rim);
      }
    }
  }

  if (showMarks) {
    const labelSize = Math.max(length * 0.02, 12);
    for (const m of part.markings) {
      const fb = faceBasis(profile, m.face, m.x, m.y, d);
      group.add(textPlane(m.text || '?', '#ffb454', fb, labelSize));
    }
  }

  if (showNotches) {
    const drawPolyline = (pathsByFace, color, close, dashed, skipFaces) => {
      for (const face of Object.keys(pathsByFace)) {
        if (skipFaces && skipFaces.has(face)) continue;
        for (const pts of (pathsByFace[face] || [])) {
          if (!pts || pts.length < 2) continue;
          const localPts = tessellateContour(pts, close && pts.length > 2);
          const worldPts = localPts.map(p => { const w = faceToWorld(profile, face, p.x, p.y, d); return new THREE.Vector3(w.x, w.y, w.z); });
          if (close && !(pts.length > 2)) worldPts.push(worldPts[0]);
          const geo = new THREE.BufferGeometry().setFromPoints(worldPts);
          const mat = dashed
            ? new THREE.LineDashedMaterial({ color, dashSize: length * 0.01, gapSize: length * 0.006, linewidth: 1 })
            : new THREE.LineBasicMaterial({ color });
          const line = new THREE.Line(geo, mat);
          if (dashed) line.computeLineDistances();
          group.add(line);
        }
      }
    };
    drawPolyline(part.contours, 0x00e5ff, true, false, consumedAK);
    drawPolyline(part.openings, 0xffb74d, true, true, consumedIK);
    drawPolyline(part.scribeLines, 0x80d8ff, false, false);
    for (const p of (part.punchMarks || [])) {
      const w = faceToWorld(profile, p.face, p.x, p.y, d);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(Math.max(length * 0.0025, 1.5), 8, 8),
                                  new THREE.MeshBasicMaterial({ color: 0xffffff }));
      dot.position.set(w.x, w.y, w.z);
      group.add(dot);
    }
  }

  addBevelIndicator(d.webStartCut, 0, d);
  addBevelIndicator(d.webEndCut, length, d);

  if (showAxes) {
    group.add(new THREE.AxesHelper(Math.max(length * 0.15, 100)));
  }

  add3DDimensions(d, length);
  addFloorGrid(length, d);
  updatePartSpecsBar(part);

  if (cameraNeedsFraming) {
    frameCameraIso();
    cameraNeedsFraming = false;
  }
}

function getToggleState(id, defaultVal) {
  const el = document.getElementById(id);
  return el ? el.checked : defaultVal;
}

function frameCameraIso() {
  if (!group) return;
  const bbox = new THREE.Box3().setFromObject(group);
  if (bbox.isEmpty()) return;
  const size = bbox.getSize(new THREE.Vector3());
  const center = bbox.getCenter(new THREE.Vector3());
  const dist = Math.max(size.x, size.y, size.z) * 1.8 + 200;
  
  setActiveViewBtn('iso');
  animateCameraTo({ theta: 0.9, phi: 1.15, dist }, center, 400);
}

function resetIsoView() { frameCameraIso(); }

function goToFlatView(faceCode) {
  if (!currentPart || !group || !group.children.length) return;
  const bbox = new THREE.Box3().setFromObject(group);
  if (bbox.isEmpty()) return;
  const center = bbox.getCenter(new THREE.Vector3());
  const size = bbox.getSize(new THREE.Vector3());
  const dist = Math.max(size.x, size.y, size.z) * 1.6 + 200;
  
  setActiveViewBtn(faceCode);
  
  let targetTheta = 0, targetPhi = Math.PI / 2;
  if (faceCode === 'o') { // Top
    targetPhi = 0.05; targetTheta = 0;
  } else if (faceCode === 'v') { // Front
    targetPhi = Math.PI / 2; targetTheta = Math.PI / 2;
  } else if (faceCode === 'u') { // Bottom
    targetPhi = Math.PI - 0.05; targetTheta = 0;
  } else if (faceCode === 'h') { // Back
    targetPhi = Math.PI / 2; targetTheta = -Math.PI / 2;
  } else if (faceCode === 'endL') { // Left end
    targetPhi = Math.PI / 2; targetTheta = Math.PI;
  } else if (faceCode === 'endR') { // Right end
    targetPhi = Math.PI / 2; targetTheta = 0;
  }
  
  animateCameraTo({ theta: targetTheta, phi: targetPhi, dist }, center, 380);
}

function setActiveViewBtn(viewKey) {
  document.querySelectorAll('.v3d-view-btn').forEach(btn => {
    if (btn.dataset.view === viewKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function addBevelIndicator(angleDeg, zPos, d) {
  if (!angleDeg) return;
  const w = Math.max(d.flangeWidth || 100, d.height || 100) * 1.3;
  const geo = new THREE.PlaneGeometry(w, w);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffb454, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(geo, mat);
  plane.position.set(0, 0, zPos);
  plane.rotation.y = THREE.MathUtils.degToRad(angleDeg);
  group.add(plane);
}

function render() {
  if (currentPart) buildScene(currentPart);
}

/* ----------------------------- 4. UI GLUE -------------------------------- */
let loadedFiles = [];
let activeFileIndex = -1;

function addFileFromText(name, text) {
  let part;
  try {
    part = detectAndParse(text);
  } catch (err) {
    if (typeof M !== 'undefined' && M.toast) {
      M.toast({ html: 'Could not parse 3D model for "' + name + '": ' + err.message, classes: 'rounded toast-error', displayLength: 3000 });
    }
    console.error(err);
    return;
  }
  if (!part) return;

  const existingIdx = loadedFiles.findIndex(f => f.name === name);
  if (existingIdx >= 0) {
    loadedFiles[existingIdx] = { name, text, part };
    switchToFile(existingIdx);
  } else {
    loadedFiles.push({ name, text, part });
    switchToFile(loadedFiles.length - 1);
  }
}

function switchToFile(index) {
  if (index < 0 || index >= loadedFiles.length) return;
  activeFileIndex = index;
  currentPart = loadedFiles[index].part;
  selectedHoles.clear();
  cameraNeedsFraming = true;

  const emptyEl = document.getElementById('empty3D');
  if (emptyEl) emptyEl.style.display = 'none';

  update3DBadges(currentPart, loadedFiles[index].name);
  renderHoleList();
  render();
}

function clear3DViewer() {
  loadedFiles = [];
  activeFileIndex = -1;
  currentPart = null;
  selectedHoles.clear();
  if (group) group.clear();
  const emptyEl = document.getElementById('empty3D');
  if (emptyEl) emptyEl.style.display = 'flex';
  const badgeEl = document.getElementById('partBadge3D');
  if (badgeEl) badgeEl.style.display = 'none';
  const holeEdit = document.getElementById('holeEditPanel3D');
  if (holeEdit) holeEdit.style.display = 'none';
  update3DFileCounter();
  updatePartSpecsBar({});
}

function update3DFileCounter() {
  const counterEl = document.getElementById('fileCounter3D');
  if (!counterEl) return;
  if (typeof filePairs !== 'undefined' && filePairs.size > 0) {
    const keys = Array.from(filePairs.keys());
    const idx = keys.indexOf(selectedFile);
    if (idx !== -1) {
      counterEl.textContent = `${idx + 1} / ${keys.length}`;
    } else {
      counterEl.textContent = `0 / ${keys.length}`;
    }
  } else {
    counterEl.textContent = `0 / 0`;
  }
}

function update3DBadges(part, fileName) {
  const d = part.header || {};
  const fmtEl = document.getElementById('formatPill3D');
  if (fmtEl) fmtEl.textContent = (part.format || 'DSTV').toUpperCase();
  const nameEl = document.getElementById('partName3D');
  if (nameEl) nameEl.textContent = fileName || d.partMark || d.profileName || 'Part';
  const profEl = document.getElementById('profileDesc3D');
  if (profEl) profEl.textContent = `${d.profileName || d.profileFamily || ''} · L:${d.length || 0}mm · H:${d.height || 0}mm`;
  update3DFileCounter();
  updatePartSpecsBar(part);
}

function updatePartSpecsBar(part) {
  const d = (part && part.header) || {};
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '-';
  };
  setTxt('specProfile3D', d.profileName || d.profileCode || d.profileFamily || 'PLATE');
  setTxt('specLength3D', d.length ? `${d.length} mm` : '-');
  setTxt('specHeight3D', d.height ? `${d.height} mm` : '-');
  setTxt('specFlange3D', d.flangeWidth ? `${d.flangeWidth} mm (tf: ${d.flangeThickness || 0}mm)` : '-');
  setTxt('specWeight3D', d.weight ? `${d.weight} kg/m` : '-');
  setTxt('specHolesCount3D', `${(part && part.holes && part.holes.length) || 0}`);
  setTxt('specGrade3D', d.material || '-');
}

function nav3DFile(delta) {
  if (typeof filePairs === 'undefined' || filePairs.size === 0) return;
  const keys = Array.from(filePairs.keys());
  if (keys.length === 0) return;
  
  let currentIdx = keys.indexOf(selectedFile);
  if (currentIdx === -1) currentIdx = 0;
  
  let newIdx = (currentIdx + delta + keys.length) % keys.length;
  const newFileName = keys[newIdx];
  if (typeof selectFile === 'function') {
    selectFile(newFileName);
  }
  if (typeof draw3DModel === 'function') {
    draw3DModel();
  }
}

function open3DModal() {
  const modalEl = document.getElementById('threeDModal');
  if (!modalEl) return;
  if (typeof M !== 'undefined' && M.Modal) {
    const instance = M.Modal.getInstance(modalEl) || M.Modal.init(modalEl, {
      startingTop: '3%',
      endingTop: '3%',
      onOpenEnd: function() {
        if (!isInitialized) initThree();
        onResize();
        if (typeof draw3DModel === 'function') draw3DModel();
      }
    });
    instance.open();
  }
  const resizeTimes = [20, 80, 180, 350, 500];
  resizeTimes.forEach(delay => {
    setTimeout(() => {
      if (!isInitialized) initThree();
      onResize();
      if (delay === 80 || delay === 350) draw3DModel();
      update3DFileCounter();
    }, delay);
  });
}

function renderHoleList() {
  const holeEditPanel = document.getElementById('holeEditPanel3D');
  const selCount = document.getElementById('holeSelCount3D');
  if (holeEditPanel) {
    holeEditPanel.style.display = selectedHoles.size ? 'flex' : 'none';
  }
  if (selCount) {
    selCount.textContent = selectedHoles.size;
  }
}

function onHoleRowClick(e, idx) {
  if (!currentPart) return;
  const h = currentPart.holes[idx];
  if (!h) return;
  const multi = e.shiftKey || e.ctrlKey || e.metaKey;
  if (multi) {
    if (selectedHoles.has(h)) selectedHoles.delete(h); else selectedHoles.add(h);
  } else {
    selectedHoles = new Set([h]);
  }
  renderHoleList();
  render();
}

function applyHoleMove() {
  if (!currentPart || selectedHoles.size === 0) return;
  const dxEl = document.getElementById('moveDX3D');
  const dyEl = document.getElementById('moveDY3D');
  const dx = parseFloat(dxEl ? dxEl.value : 0) || 0;
  const dy = parseFloat(dyEl ? dyEl.value : 0) || 0;
  if (!dx && !dy) return;
  for (const h of selectedHoles) { h.x += dx; h.y += dy; }
  if (dxEl) dxEl.value = '';
  if (dyEl) dyEl.value = '';
  renderHoleList();
  render();
}

function deleteSelectedHoles() {
  if (!currentPart || selectedHoles.size === 0) return;
  currentPart.holes = currentPart.holes.filter(h => !selectedHoles.has(h));
  selectedHoles.clear();
  renderHoleList();
  render();
}

window.addEventListener('keydown', e => {
  const activeTag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
  if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;
  
  const modalEl = document.getElementById('threeDModal');
  const isModalOpen = modalEl && (modalEl.classList.contains('open') || modalEl.style.display === 'block');

  if (isModalOpen) {
    if (e.key === 'ArrowUp' || e.key === 'Up') {
      e.preventDefault();
      nav3DFile(-1);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'Down') {
      e.preventDefault();
      nav3DFile(1);
      return;
    }
  }

  if (e.key === 'Escape' && selectedHoles.size) {
    selectedHoles.clear(); renderHoleList(); render(); return;
  }
  const arrow = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key);
  if (!arrow && e.key !== 'Delete' && e.key !== 'Backspace') return;
  if (selectedHoles.size > 0) {
    e.preventDefault();
    if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelectedHoles(); return; }
    const step = e.shiftKey ? 10 : 1;
    let dx = 0, dy = 0;
    if (e.key === 'ArrowUp') dy = step; else if (e.key === 'ArrowDown') dy = -step;
    else if (e.key === 'ArrowLeft') dx = -step; else dx = step;
    for (const h of selectedHoles) { h.x += dx; h.y += dy; }
    renderHoleList();
    render();
  }
});

function toggle3DFullscreen() {
  const container = document.getElementById('threeDModal') || document.getElementById('threeDViewerContainer');
  if (!container) return;
  container.classList.toggle('viewer-fullscreen');
  setTimeout(onResize, 50);
}

/* ----------------- 5. EXPORT & OPENSTEEL INTEGRATION --------------------- */
window.draw3DModel = function() {
  if (!isInitialized) initThree();
  if (typeof selectedFile !== 'undefined' && selectedFile && typeof filePairs !== 'undefined' && filePairs.has(selectedFile)) {
    const emptyEl = document.getElementById('empty3D');
    if (emptyEl) emptyEl.style.display = 'none';
    addFileFromText(selectedFile, filePairs.get(selectedFile));
    update3DFileCounter();
    return;
  }
  if (window.partData && window.partData.length) {
    const d = window.partData;
    const fallbackPart = {
      format: 'dstv',
      header: {
        profileFamily: d.profileCode || 'PLATE',
        profileName: d.profileName || '',
        length: d.length || 1000,
        height: d.height || 100,
        flangeWidth: d.flangeWidth || 100,
        flangeThickness: d.flangeThickness || 10,
        webThickness: d.webThickness || 6,
        webStartCut: d.webStartCut || 0,
        webEndCut: d.webEndCut || 0
      },
      holes: [],
      contours: { v: [], o: [], u: [], h: [] },
      openings: { v: [], o: [], u: [], h: [] },
      scribeLines: { v: [], o: [], u: [], h: [] },
      punchMarks: [],
      markings: [],
      customProfilePoints: []
    };
    currentPart = fallbackPart;
    cameraNeedsFraming = true;
    update3DBadges(fallbackPart, d.piece || 'Part');
    const emptyEl = document.getElementById('empty3D');
    if (emptyEl) emptyEl.style.display = 'none';
    buildScene(fallbackPart);
    update3DFileCounter();
  } else {
    clear3DViewer();
  }
};

window.load3DPartFromText = addFileFromText;
window.clear3DViewer = clear3DViewer;
window.resetIsoView = resetIsoView;
window.goToFlatView = goToFlatView;
window.render3D = render;
window.applyHoleMove3D = applyHoleMove;
window.deleteSelectedHoles3D = deleteSelectedHoles;
window.toggle3DFullscreen = toggle3DFullscreen;
window.onHoleRowClick3D = onHoleRowClick;
window.open3DModal = open3DModal;
window.nav3DFile = nav3DFile;
window.update3DFileCounter = update3DFileCounter;
window.changeSteelFinish = changeSteelFinish;
window.onResize3D = onResize;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThree);
} else {
  initThree();
}

})();
