/* ============================================================
   SHOPCAKE — souris.js (Partie 9/11)
   Curseur personnalisé "gâteau" avec plusieurs styles au choix
   (point + halo, emoji gourmand, bulle transparente) et un
   mode "curseur normal" (natif du système). Sur mobile/tactile,
   le curseur personnalisé reste invisible et n'apparaît qu'au
   point de contact, brièvement.

   Nécessite app.js chargé avant (Store, SHOPCAKE_KEYS).
   ============================================================ */

const CURSEUR_PAR_DEFAUT = 'normal'; // 'gateau' | 'fraise' | 'bulle' | 'normal'

let curseurPoint, curseurRing;
let posSourisX = 0, posSourisY = 0;
let posRingX = 0, posRingY = 0;

/* ------------------------------------------------------------
   1. DÉTECTION DE L'APPAREIL
   ------------------------------------------------------------ */
function estAppareilTactile() {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

/* ------------------------------------------------------------
   2. CRÉATION DES ÉLÉMENTS DU CURSEUR
   ------------------------------------------------------------ */
function creerElementsCurseur() {
  if (document.getElementById('cursorMain')) return;

  curseurPoint = document.createElement('div');
  curseurPoint.className = 'shopcake-cursor';
  curseurPoint.id = 'cursorMain';

  curseurRing = document.createElement('div');
  curseurRing.className = 'shopcake-cursor shopcake-cursor--ring';
  curseurRing.id = 'cursorRing';

  document.body.appendChild(curseurRing);
  document.body.appendChild(curseurPoint);
}

/* ------------------------------------------------------------
   3. APPLICATION D'UN STYLE DE CURSEUR
   ------------------------------------------------------------ */
function appliquerStyleCurseur(style) {
  document.body.classList.remove('cursor-normal', 'has-custom-cursor');
  curseurPoint.className = 'shopcake-cursor';
  curseurRing.style.display = '';

  if (style === 'normal') {
    document.body.classList.add('cursor-normal');
    return;
  }

  document.body.classList.add('has-custom-cursor');

  if (style === 'bulle') {
    curseurPoint.classList.add('shopcake-cursor--bulle');
    curseurRing.style.display = 'none';
  } else if (style === 'fraise') {
    curseurPoint.classList.add('shopcake-cursor--emoji');
    curseurPoint.textContent = '🍓';
    curseurRing.style.display = 'none';
  } else {
    // style "gateau" par défaut : point + halo
    curseurPoint.classList.add('shopcake-cursor--point');
  }
}

/* ------------------------------------------------------------
   4. SUIVI DE LA SOURIS (avec effet de traînée léger sur l'anneau)
   ------------------------------------------------------------ */
function suivreLaSouris() {
  if (curseurPoint) {
    curseurPoint.style.transform = 'translate3d(' + posSourisX + 'px,' + posSourisY + 'px, 0)';
  }
  if (curseurRing) {
    posRingX += (posSourisX - posRingX) * 0.18;
    posRingY += (posSourisY - posRingY) * 0.18;
    curseurRing.style.transform = 'translate3d(' + posRingX + 'px,' + posRingY + 'px, 0)';
  }
  requestAnimationFrame(suivreLaSouris);
}

function initSuiviSouris() {
  document.addEventListener('mousemove', (e) => {
    posSourisX = e.clientX;
    posSourisY = e.clientY;
  });

  document.addEventListener('mousedown', () => document.body.classList.add('cursor-click'));
  document.addEventListener('mouseup', () => document.body.classList.remove('cursor-click'));

  // Grossit le curseur au survol des éléments interactifs
  document.querySelectorAll('a, button, input, textarea, select, .cake-card, .choice-card').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });

  requestAnimationFrame(suivreLaSouris);
}

/* ------------------------------------------------------------
   5. ADAPTATION TACTILE — le curseur n'apparaît qu'au toucher
   ------------------------------------------------------------ */
function initSuiviTactile() {
  let minuteurDisparition;

  function positionnerEtAfficher(x, y) {
    posSourisX = x; posSourisY = y;
    posRingX = x; posRingY = y;
    if (curseurPoint) curseurPoint.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    if (curseurRing) curseurRing.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';

    document.body.classList.add('cursor-touch-active');
    clearTimeout(minuteurDisparition);
    minuteurDisparition = setTimeout(() => {
      document.body.classList.remove('cursor-touch-active');
    }, 500);
  }

  document.addEventListener('touchstart', (e) => {
    if (e.touches[0]) positionnerEtAfficher(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (e.touches[0]) positionnerEtAfficher(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
}

/* ------------------------------------------------------------
   6. SÉLECTEUR DE CURSEUR (injecté dans la navbar)
   ------------------------------------------------------------ */
function injecterSelecteurCurseur() {
  const navLinks = document.getElementById('navLinks');
  if (!navLinks || document.getElementById('cursorSelect')) return;

  const select = document.createElement('select');
  select.id = 'cursorSelect';
  select.className = 'form-control';
  select.style.width = 'auto';
  select.setAttribute('aria-label', 'Choisir un curseur');
  select.innerHTML =
    '<option value="gateau">🖱️ Curseur gâteau</option>' +
    '<option value="fraise">🍓 Curseur fraise</option>' +
    '<option value="bulle">⚪ Bulle transparente</option>' +
    '<option value="normal">➡️ Curseur normal</option>';

  navLinks.appendChild(select);

  select.addEventListener('change', () => {
    appliquerStyleCurseur(select.value);
    Store.set(SHOPCAKE_KEYS.CURSOR, select.value);
  });

  const styleActuel = Store.get(SHOPCAKE_KEYS.CURSOR, CURSEUR_PAR_DEFAUT);
  select.value = styleActuel;
}

/* ------------------------------------------------------------
   7. INITIALISATION
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  const styleChoisi = (typeof Store !== 'undefined')
    ? Store.get(SHOPCAKE_KEYS.CURSOR, CURSEUR_PAR_DEFAUT)
    : CURSEUR_PAR_DEFAUT;

  creerElementsCurseur();
  appliquerStyleCurseur(styleChoisi);
  injecterSelecteurCurseur();

  if (estAppareilTactile()) {
    initSuiviTactile();
  } else {
    initSuiviSouris();
  }

  // Si l'utilisateur bascule entre souris et tactile (ex: PC hybride)
  window.addEventListener('resize', () => {
    document.body.classList.toggle('cursor-touch-active', false);
  });
});
