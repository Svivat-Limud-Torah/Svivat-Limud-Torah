// frontend/src/components/ColorPicker.jsx
import React, { useState, useRef, useEffect } from 'react';
import './ColorPicker.css';

// ── Color math ──────────────────────────────────────────────────────────────
function clamp(v, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, v));
}

function hexToRgb(hex) {
  const s = hex.replace('#', '');
  if (s.length !== 6) return [0, 0, 0];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
    .join('');
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d % 6 + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, max ? (d / max) * 100 : 0, max * 100];
}

function hsvToRgb(h, s, v) {
  s /= 100; v /= 100;
  const f = n => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
}

function hsvToHex(h, s, v) { return rgbToHex(...hsvToRgb(h, s, v)); }
function hexToHsv(hex)      { return rgbToHsv(...hexToRgb(hex)); }

// ── Preset palette ───────────────────────────────────────────────────────────
const PRESETS = [
  // Near-black / dark backgrounds
  '#000000', '#0d1117', '#18181b', '#1e1e1e', '#27272a',
  // Dark blues
  '#0f172a', '#1e293b', '#1a1a2e', '#0a192f', '#112240',
  // Blue accents
  '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
  // Purples
  '#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa',
  // Greens
  '#14532d', '#15803d', '#16a34a', '#22c55e', '#4ade80',
  // Teal/Cyan
  '#134e4a', '#0f766e', '#14b8a6', '#2dd4bf', '#67e8f9',
  // Red / Orange
  '#7f1d1d', '#b91c1c', '#ef4444', '#f97316', '#fb923c',
  // Gold / Torah
  '#78350f', '#92400e', '#b45309', '#d97706', '#f59e0b',
  '#d4af37', '#c9a96e', '#8b6914', '#4a3728', '#2c1810',
  // Whites / Light
  '#f8fafc', '#f1f5f9', '#e2e8f0', '#d1d5db', '#ffffff',
];

// ── Component ────────────────────────────────────────────────────────────────
export default function ColorPicker({ color, originalColor, onApply, onCancel }) {
  const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : '#000000';
  const [initH, initS, initV] = hexToHsv(safeColor);

  const [hue, setHue]         = useState(initH);
  const [sat, setSat]         = useState(initS);
  const [bri, setBri]         = useState(initV);
  const [hexInput, setHexInput] = useState(safeColor.toUpperCase());

  const svEl      = useRef(null);
  const hueEl     = useRef(null);
  const dragging  = useRef(null); // 'sv' | 'hue' | null
  const liveRef   = useRef({ hue: initH, sat: initS, bri: initV });
  const applyRef  = useRef(null);

  liveRef.current = { hue, sat, bri };

  applyRef.current = (h, s, v) => {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 100);
    v = clamp(v, 0, 100);
    setHue(h); setSat(s); setBri(v);
    setHexInput(hsvToHex(h, s, v).toUpperCase());
  };

  // ── Global drag listeners (set up once) ──────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      if (dragging.current === 'sv' && svEl.current) {
        const rect = svEl.current.getBoundingClientRect();
        const s = clamp((e.clientX - rect.left) / rect.width) * 100;
        const v = (1 - clamp((e.clientY - rect.top) / rect.height)) * 100;
        applyRef.current(liveRef.current.hue, s, v);
      }
      if (dragging.current === 'hue' && hueEl.current) {
        const rect = hueEl.current.getBoundingClientRect();
        const h = clamp((e.clientX - rect.left) / rect.width) * 360;
        applyRef.current(h, liveRef.current.sat, liveRef.current.bri);
      }
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []); // runs once — liveRef / applyRef always hold latest values

  const currentHex = hsvToHex(hue, sat, bri);
  const [r, g, b]  = hsvToRgb(hue, sat, bri);

  // ── Hex input ─────────────────────────────────────────────────────────────
  const handleHexChange = (e) => {
    let raw = e.target.value.replace(/[^0-9a-fA-F#]/g, '');
    if (raw.length > 7) raw = raw.slice(0, 7);
    setHexInput(raw.toUpperCase());
    const clean = raw.startsWith('#') ? raw : '#' + raw;
    if (/^#[0-9a-f]{6}$/i.test(clean)) {
      const [h, s, v] = hexToHsv(clean);
      applyRef.current(h, s, v);
    }
  };

  // ── RGB inputs ────────────────────────────────────────────────────────────
  const handleRgb = (ch, raw) => {
    const num = clamp(parseInt(raw) || 0, 0, 255);
    const nr = ch === 'r' ? num : r;
    const ng = ch === 'g' ? num : g;
    const nb = ch === 'b' ? num : b;
    const [h, s, v] = rgbToHsv(nr, ng, nb);
    applyRef.current(h, s, v);
  };

  const startSvDrag = (e) => {
    e.preventDefault();
    dragging.current = 'sv';
    const rect = svEl.current.getBoundingClientRect();
    const s = clamp((e.clientX - rect.left) / rect.width) * 100;
    const v = (1 - clamp((e.clientY - rect.top) / rect.height)) * 100;
    applyRef.current(hue, s, v);
  };

  const startHueDrag = (e) => {
    e.preventDefault();
    dragging.current = 'hue';
    const rect = hueEl.current.getBoundingClientRect();
    const h = clamp((e.clientX - rect.left) / rect.width) * 360;
    applyRef.current(h, sat, bri);
  };

  return (
    <div className="cp-root" onMouseDown={e => e.stopPropagation()}>

      {/* ── SV Square ─────────────────────────────────────────────────────── */}
      <div
        ref={svEl}
        className="cp-sv"
        style={{ background: `hsl(${hue}, 100%, 50%)` }}
        onMouseDown={startSvDrag}
      >
        <div className="cp-sv-white" />
        <div className="cp-sv-black" />
        <div
          className="cp-cursor"
          style={{
            left: `${sat}%`,
            top: `${100 - bri}%`,
            background: currentHex,
          }}
        />
      </div>

      {/* ── Hue Slider ────────────────────────────────────────────────────── */}
      <div ref={hueEl} className="cp-hue-track" onMouseDown={startHueDrag}>
        <div
          className="cp-hue-thumb"
          style={{
            left: `${(hue / 360) * 100}%`,
            background: `hsl(${hue}, 100%, 50%)`,
          }}
        />
      </div>

      {/* ── Color Preview (before → after) ────────────────────────────────── */}
      <div className="cp-preview">
        <div className="cp-chip-wrap">
          <div className="cp-chip" style={{ background: originalColor }} />
          <span className="cp-chip-label">לפני</span>
        </div>
        <span className="cp-arrow">→</span>
        <div className="cp-chip-wrap">
          <div className="cp-chip" style={{ background: currentHex }} />
          <span className="cp-chip-label">אחרי</span>
        </div>
        <span className="cp-current-hex">{currentHex.toUpperCase()}</span>
      </div>

      {/* ── Inputs (HEX + RGB) ────────────────────────────────────────────── */}
      <div className="cp-inputs">
        <div className="cp-field cp-field-hex">
          <input
            className="cp-inp"
            value={hexInput}
            onChange={handleHexChange}
            maxLength={7}
            spellCheck={false}
            dir="ltr"
          />
          <span className="cp-field-label">HEX</span>
        </div>
        {[['R', 'r', r], ['G', 'g', g], ['B', 'b', b]].map(([lbl, ch, val]) => (
          <div key={ch} className="cp-field cp-field-rgb">
            <input
              className="cp-inp"
              type="number"
              min="0"
              max="255"
              value={val}
              onChange={e => handleRgb(ch, e.target.value)}
              dir="ltr"
            />
            <span className="cp-field-label">{lbl}</span>
          </div>
        ))}
      </div>

      {/* ── HSL display (read-only info) ──────────────────────────────────── */}
      <div className="cp-hsl-row">
        <span className="cp-hsl-item">H: {Math.round(hue)}°</span>
        <span className="cp-hsl-item">S: {Math.round(sat)}%</span>
        <span className="cp-hsl-item">B: {Math.round(bri)}%</span>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="cp-actions">
        <button className="cp-btn cp-btn-cancel" onClick={onCancel}>ביטול</button>
        <button className="cp-btn cp-btn-apply" onClick={() => onApply(currentHex)}>החל צבע</button>
      </div>
    </div>
  );
}
