import { CONFIG } from './config.js';
import { loadDb, isRegistered, normSap, titleCase } from './match.js';
import { loadAssets, drawCertificate, makePdf, canvasToBlob } from './certificate.js';

const $ = (id) => document.getElementById(id);
const form = $('form'), go = $('go'), err = $('error');
let db = null, assets = null, current = null;

$('help').textContent = CONFIG.helpText;
const showError = (m) => { err.textContent = m; err.hidden = !m; };

Promise.all([loadDb(), loadAssets()])
  .then(([d, a]) => { db = d; assets = a; go.disabled = false; go.textContent = 'Get my certificate'; })
  .catch(() => { go.textContent = 'Unavailable'; showError('The certificate service could not load. Please refresh the page or try again in a minute.'); });

form.addEventListener('submit', async (e) => {
  e.preventDefault(); showError('');
  if (!db) return;
  const name = $('name').value.trim(), sap = normSap($('sap').value);
  if (!name || !sap) return showError('Please enter both your full name and SAP ID.');
  if (!/^\d{9}$/.test(sap)) return showError('SAP ID should be 9 digits, e.g. 590012345.');
  go.disabled = true; go.textContent = 'Checking…';
  try {
    if (!(await isRegistered(sap, name, db))) {
      showError('We could not find a registration matching that name and SAP ID. Check your spelling and try again.');
      return;
    }
    current = { name: titleCase(name), sapId: sap };
    drawCertificate($('cert'), current, assets);
    $('formView').hidden = true; $('resultView').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (x) {
    console.error(x); showError('Something went wrong while creating your certificate. Please try again.');
  } finally { go.disabled = false; go.textContent = 'Get my certificate'; }
});

const save = (blob, filename) => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
const fileBase = () => `SIH2026_Certificate_${current.name.replace(/\s+/g, '_')}`;

$('pdf').addEventListener('click', () => save(makePdf($('cert'), `${CONFIG.eventName} – Certificate – ${current.name}`), fileBase() + '.pdf'));
$('png').addEventListener('click', async () => save(await canvasToBlob($('cert'), 'image/png'), fileBase() + '.png'));
$('back').addEventListener('click', () => {
  current = null; form.reset(); showError('');
  $('resultView').hidden = true; $('formView').hidden = false; window.scrollTo({ top: 0 });
});
