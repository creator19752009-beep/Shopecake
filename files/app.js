/* ============================================================
   SHOPCAKE — app.js (Partie 5/11)
   Logique générale partagée par toutes les pages :
   - Accès centralisé au localStorage (clés shopcake_*)
   - Menu mobile (burger)
   - Injection des gâteaux (page d'accueil / commande)
   - Injection des avis clients (lecture seule ici)
   - Couche ambiante (biscuits qui tombent, cupcakes flottants)
   - Petits utilitaires partagés (toast, formatage prix, etc.)

   Ce fichier doit être chargé sur TOUTES les pages, avant les
   scripts spécifiques (commande.js, admin.js, commentaire.js...).
   ============================================================ */

/* ------------------------------------------------------------
   1. CLÉS DE STOCKAGE — un seul endroit à modifier si besoin
   ------------------------------------------------------------ */
const SHOPCAKE_KEYS = {
  USERS: 'shopcake_users',
  SESSION: 'shopcake_session',
  CAKES: 'shopcake_cakes',
  ORDERS: 'shopcake_orders',
  REVIEWS: 'shopcake_reviews',
  THEME: 'shopcake_theme',
  CURSOR: 'shopcake_cursor',
  SHOP_LOCATION: 'shopcake_shop_location'
};

/* Identifiants admin — utilisés par auth.js, rappelés ici pour référence */
const SHOPCAKE_ADMIN = { username: 'maman', password: 'maman gateau' };

/* ------------------------------------------------------------
   2. HELPERS DE STOCKAGE
   ------------------------------------------------------------ */
const Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('Erreur de lecture localStorage', key, e);
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Erreur d\'écriture localStorage', key, e);
      return false;
    }
  }
};

/* ------------------------------------------------------------
   3. DONNÉES PAR DÉFAUT (premier lancement du site)
   ------------------------------------------------------------ */
function seedDefaultData() {
  if (!localStorage.getItem(SHOPCAKE_KEYS.CAKES)) {
    Store.set(SHOPCAKE_KEYS.CAKES, [
      {
        id: 'c1',
        nom: 'Fondant Chocolat',
        description: 'Génoise moelleuse, ganache chocolat noir 70%.',
        prix: 8500,
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600',
        badge: 'Populaire'
      },
      {
        id: 'c2',
        nom: 'Cupcake Vanille',
        description: 'Petit gâteau vanille, glaçage crème au beurre.',
        prix: 2000,
        image: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=600',
        badge: 'Nouveau'
      },
      {
        id: 'c3',
        nom: 'Tarte aux Fraises',
        description: 'Pâte sablée maison, crème pâtissière, fraises fraîches.',
        prix: 9500,
        image: 'https://images.unsplash.com/photo-1464195244916-405fa0a82545?w=600',
        badge: 'Special'
      }
    ]);
  }

  if (!localStorage.getItem(SHOPCAKE_KEYS.REVIEWS)) {
    Store.set(SHOPCAKE_KEYS.REVIEWS, [
      {
        id: 'r1',
        nom: 'Nadia K.',
        note: 5,
        texte: 'Le gâteau était magnifique et délicieux, livré à l\'heure !',
        date: new Date().toISOString()
      },
      {
        id: 'r2',
        nom: 'Emmanuel A.',
        note: 4,
        texte: 'Très bon accueil, le fondant chocolat est un régal.',
        date: new Date().toISOString()
      }
    ]);
  }

  if (!localStorage.getItem(SHOPCAKE_KEYS.SHOP_LOCATION)) {
    Store.set(SHOPCAKE_KEYS.SHOP_LOCATION, {
      lat: 6.4969,
      lng: 2.6289,
      adresse: 'Porto-Novo, Bénin'
    });
  }
}

/* ------------------------------------------------------------
   4. UTILITAIRES
   ------------------------------------------------------------ */
function formaterPrix(valeur) {
  return Number(valeur).toLocaleString('fr-FR') + ' FCFA';
}

function genererId(prefixe) {
  return prefixe + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function afficherToast(message, type) {
  const ancien = document.querySelector('.toast');
  if (ancien) ancien.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  if (type === 'error') toast.style.borderLeft = '4px solid var(--fraise-fonce)';
  if (type === 'success') toast.style.borderLeft = '4px solid #23663A';
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('is-visible'));

  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 350);
  }, 3200);
}

function afficherAlerte(conteneurId, message, type) {
  const conteneur = document.getElementById(conteneurId);
  if (!conteneur) return;
  conteneur.innerHTML =
    '<div class="alert alert-' + (type || 'info') + '">' + message + '</div>';
}

/* ------------------------------------------------------------
   5. MENU MOBILE (burger)
   ------------------------------------------------------------ */
function initMenuMobile() {
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');
  if (!burger || !navLinks) return;

  burger.addEventListener('click', () => {
    const estOuvert = navLinks.classList.toggle('is-open');
    burger.classList.toggle('is-open', estOuvert);
    burger.setAttribute('aria-expanded', String(estOuvert));
  });

  navLinks.querySelectorAll('a').forEach(lien => {
    lien.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ------------------------------------------------------------
   6. ÉTAT DE CONNEXION DANS LA NAVBAR
   ------------------------------------------------------------ */
function initEtatNavbar() {
  const session = Store.get(SHOPCAKE_KEYS.SESSION, null);
  const navAuthLink = document.getElementById('navAuthLink');
  const navAdminLink = document.getElementById('navAdminLink');

  if (!session) return;

  if (navAuthLink) {
    navAuthLink.textContent = 'Mon compte (' + (session.nom || session.username) + ')';
    navAuthLink.href = session.role === 'admin' ? 'admin.html' : 'index.html';
  }
  if (navAdminLink && session.role === 'admin') {
    navAdminLink.style.display = '';
  }
}

/* ------------------------------------------------------------
   7. AFFICHAGE DES GÂTEAUX (page d'accueil + sélecteur commande)
   ------------------------------------------------------------ */
function creerCarteGateau(gateau) {
  const article = document.createElement('article');
  article.className = 'cake-card slide-up';
  article.innerHTML =
    '<div class="cake-card__image-wrap">' +
      (gateau.badge ? '<span class="cake-card__badge">' + gateau.badge + '</span>' : '') +
      '<img class="cake-card__image" src="' + gateau.image + '" alt="' + gateau.nom + '" loading="lazy">' +
    '</div>' +
    '<div class="cake-card__body">' +
      '<h3 class="cake-card__title">' + gateau.nom + '</h3>' +
      '<p class="cake-card__desc">' + (gateau.description || '') + '</p>' +
      '<div class="cake-card__footer">' +
        '<span class="cake-card__price">' + formaterPrix(gateau.prix) + '</span>' +
        '<a href="commande.html?cake=' + gateau.id + '" class="btn btn-chocolat">Commander</a>' +
      '</div>' +
    '</div>';
  return article;
}

function afficherGateaux() {
  const grille = document.getElementById('cakeGrid');
  if (!grille) return;

  const gateaux = Store.get(SHOPCAKE_KEYS.CAKES, []);
  if (!gateaux.length) return; // on laisse le contenu de secours du HTML

  grille.innerHTML = '';
  gateaux.forEach(g => grille.appendChild(creerCarteGateau(g)));
}

/* ------------------------------------------------------------
   8. AFFICHAGE DES AVIS (lecture seule — la publication est
      gérée par commentaire.js)
   ------------------------------------------------------------ */
function creerEtoiles(note) {
  let html = '<span class="stars">';
  for (let i = 1; i <= 5; i++) {
    html += '<span class="star' + (i <= note ? ' is-filled' : '') + '">★</span>';
  }
  html += '</span>';
  return html;
}

function afficherAvis() {
  const grille = document.getElementById('reviewGrid');
  if (!grille) return;

  const avis = Store.get(SHOPCAKE_KEYS.REVIEWS, []);
  grille.innerHTML = '';

  avis.slice().reverse().forEach(a => {
    const carte = document.createElement('article');
    carte.className = 'review-card glass slide-up';
    const date = new Date(a.date).toLocaleDateString('fr-FR');
    carte.innerHTML =
      '<div class="review-card__header">' +
        '<div class="review-card__avatar"></div>' +
        '<div>' +
          '<p class="review-card__name">' + a.nom + '</p>' +
          '<p class="review-card__date">' + date + '</p>' +
        '</div>' +
      '</div>' +
      creerEtoiles(a.note) +
      '<p class="review-card__text" style="margin-top:.6rem;">' + a.texte + '</p>';
    grille.appendChild(carte);
  });
}

/* ------------------------------------------------------------
   9. COUCHE AMBIANTE — biscuits qui tombent, cupcakes flottants
   ------------------------------------------------------------ */
function initAmbiance() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const couche = document.createElement('div');
  couche.className = 'ambient-layer';
  couche.id = 'ambientLayer';
  document.body.prepend(couche);

  const biscuits = ['🍪', '🧁', '🍩'];
  const nombreElements = window.innerWidth < 680 ? 6 : 12;

  for (let i = 0; i < nombreElements; i++) {
    const el = document.createElement('span');
    const estCupcake = i % 3 === 0;
    el.className = estCupcake ? 'floating-cupcake' : 'falling-cookie';
    el.textContent = estCupcake ? '🧁' : biscuits[i % biscuits.length];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.animationDuration = (10 + Math.random() * 12) + 's';
    el.style.animationDelay = (Math.random() * 10) + 's';
    couche.appendChild(el);
  }
}

/* ------------------------------------------------------------
   10. INITIALISATION GLOBALE
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  seedDefaultData();
  initMenuMobile();
  initEtatNavbar();
  afficherGateaux();
  afficherAvis();
  initAmbiance();
});
