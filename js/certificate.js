import { CONFIG } from './config.js';
import { titleCase } from './match.js';

const FONT = (s) => `700 ${s}px Alegreya, Georgia, "Times New Roman", serif`;

export async function loadAssets() {
  await document.fonts.load('700 40px Alegreya');
  const tpl = await new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Missing certificate template'));
    i.src = CONFIG.template;
  });
  return { tpl };
}

/** Draws the template, then the student's name in the blank space. Output is 2x the template for crisp text. */
export function drawCertificate(canvas, { name }, { tpl }) {
  const k = Math.max(2, Math.ceil(2560 / tpl.width));
  const W = (canvas.width = tpl.width * k), H = (canvas.height = tpl.height * k);
  const g = canvas.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(tpl, 0, 0, W, H);

  const c = CONFIG.name, text = titleCase(name);
  let size = c.sizePct * H;
  g.font = FONT(size);
  const maxW = c.maxWidthPct * W, w = g.measureText(text).width;
  if (w > maxW) { size = Math.max(size * 0.45, size * maxW / w); g.font = FONT(size); }
  g.fillStyle = c.color; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillText(text, c.xPct * W, c.yPct * H);
  return canvas;
}

export function canvasToBlob(canvas, type = 'image/jpeg', q = 0.93) {
  return new Promise((res) => canvas.toBlob(res, type, q));
}

export function makePdf(canvas, title) {
  const { jsPDF } = window.jspdf;
  const h = 297 * canvas.height / canvas.width;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [297, h], compress: true });
  pdf.setProperties({ title });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 297, h, undefined, 'FAST');
  return pdf.output('blob');
}
