/* ============================================================
   SHOPCAKE — admin.js (Partie 8/11)
   Tableau de bord de "maman" : commandes reçues, gestion des
   produits (avec upload d'image), modération des avis,
   localisation de la boutique sur la carte (Porto-Novo).

   Nécessite app.js et Leaflet chargés avant ce fichier.
   ============================================================ */

/* ------------------------------------------------------------
   1. PROTECTION D'ACCÈS
   ------------------------------------------------------------ */
function verifierAccesAdmin() {
  const session = Store.get(SHOPCAKE_KEYS.SESSION, null);
  if (!session || session.role !== 'admin') {
    window.location.href = 'connexion.html';
    return false;
  }
  const nomEl = document.getElementById('adminName');
  if (nomEl) nomEl.textContent = '👋 ' + (session.nom || 'Maman');
  return true;
}

function initDeconnexionAdmin() {
  const bouton = document.getElementById('btnLogout');
  if (bouton) bouton.addEventListener('click', seDeconnecter);
}

/* ------------------------------------------------------------
   2. NAVIGATION PAR ONGLETS
   ------------------------------------------------------------ */
function initOngletsAdmin() {
  const liens = document.querySelectorAll('.admin-nav__link');
  const onglets = document.querySelectorAll('.admin-tab');

  liens.forEach(lien => {
    lien.addEventListener('click', () => {
      liens.forEach(l => l.classList.remove('is-active'));
      onglets.forEach(o => o.classList.remove('is-active'));

      lien.classList.add('is-active');
      document.getElementById('tab-' + lien.dataset.tab).classList.add('is-active');

      if (lien.dataset.tab === 'boutique') {
        setTimeout(initCarteAdmin, 150);
      }
    });
  });
}

/* ------------------------------------------------------------
   3. ONGLET COMMANDES
   ------------------------------------------------------------ */
const LIBELLES_STATUT = {
  attente: 'En attente',
  preparation: 'En préparation',
  pret: 'Prêt',
  livre: 'Livré / Récupéré',
  annule: 'Annulé'
};

function creerCarteCommande(commande) {
  const carte = document.createElement('article');
  carte.className = 'order-card glass';

  const modeLabel = commande.mode === 'livraison' ? '🛵 Livraison' : '🏪 Retrait boutique';
  const modeClasse = commande.mode === 'livraison' ? 'order-card__mode--livraison' : 'order-card__mode--retrait';
  const dateCommande = new Date(commande.createdAt).toLocaleString('fr-FR');
  const dateSouhaitee = commande.dateSouhaitee ? new Date(commande.dateSouhaitee).toLocaleString('fr-FR') : '—';

  carte.innerHTML =
    '<img class="order-card__thumb" src="' + (commande.cakeImage || '') + '" alt="' + commande.cakeNom + '">' +
    '<div class="order-card__info">' +
      '<p class="order-card__id">#' + commande.id.slice(-6).toUpperCase() + ' · ' + dateCommande + '</p>' +
      '<h3>' + commande.cakeNom + ' × ' + commande.quantite + '</h3>' +
      '<p class="form-hint">' + commande.clientNom + ' — ' + commande.clientTel + ' — ' + commande.clientEmail + '</p>' +
      (commande.message ? '<p class="form-hint">✏️ "' + commande.message + '"</p>' : '') +
      '<div class="order-card__meta">' +
        '<span class="order-card__mode ' + modeClasse + '">' + modeLabel + '</span>' +
        '<span>📅 Souhaité : ' + dateSouhaitee + '</span>' +
        (commande.mode === 'livraison' ? '<span>📍 ' + commande.adresse + '</span>' : '') +
        '<span>💰 ' + formaterPrix(commande.total) + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="order-card__actions">' +
      '<select class="order-status-select" data-id="' + commande.id + '">' +
        Object.keys(LIBELLES_STATUT).map(cle =>
          '<option value="' + cle + '"' + (commande.statut === cle ? ' selected' : '') + '>' + LIBELLES_STATUT[cle] + '</option>'
        ).join('') +
      '</select>' +
    '</div>';

  return carte;
}

function afficherCommandesAdmin() {
  const liste = document.getElementById('ordersList');
  const compteur = document.getElementById('ordersCount');
  const messageVide = document.getElementById('noOrders');
  if (!liste) return;

  const commandes = Store.get(SHOPCAKE_KEYS.ORDERS, []).slice().reverse();
  compteur.textContent = commandes.length + ' commande(s)';

  liste.innerHTML = '';
  if (!commandes.length) {
    liste.appendChild(messageVide || document.createTextNode('Aucune commande pour le moment.'));
    return;
  }

  commandes.forEach(cmd => liste.appendChild(creerCarteCommande(cmd)));

  liste.querySelectorAll('.order-status-select').forEach(select => {
    select.addEventListener('change', () => {
      const commandesActuelles = Store.get(SHOPCAKE_KEYS.ORDERS, []);
      const cible = commandesActuelles.find(c => c.id === select.dataset.id);
      if (cible) {
        cible.statut = select.value;
        Store.set(SHOPCAKE_KEYS.ORDERS, commandesActuelles);
        afficherToast('Statut mis à jour : ' + LIBELLES_STATUT[select.value], 'success');
      }
    });
  });
}

/* ------------------------------------------------------------
   4. ONGLET PRODUITS — formulaire + upload d'image
   ------------------------------------------------------------ */
function initFormulaireProduit() {
  const form = document.getElementById('produitForm');
  const inputImage = document.getElementById('produitImage');
  const preview = document.getElementById('produitImagePreview');
  if (!form) return;

  let imageBase64Courante = '';

  inputImage.addEventListener('change', () => {
    const fichier = inputImage.files[0];
    if (!fichier) return;

    const lecteur = new FileReader();
    lecteur.onload = () => {
      imageBase64Courante = lecteur.result;
      preview.src = imageBase64Courante;
      preview.style.display = 'block';
    };
    lecteur.readAsDataURL(fichier);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = document.getElementById('produitId').value;
    const nom = document.getElementById('produitNom').value.trim();
    const description = document.getElementById('produitDesc').value.trim();
    const prix = parseInt(document.getElementById('produitPrix').value, 10);

    if (!nom || !prix) {
      afficherAlerte('produitAlert', 'Merci de renseigner au moins le nom et le prix.', 'error');
      return;
    }

    const gateaux = Store.get(SHOPCAKE_KEYS.CAKES, []);

    if (id) {
      const existant = gateaux.find(g => g.id === id);
      if (existant) {
        existant.nom = nom;
        existant.description = description;
        existant.prix = prix;
        if (imageBase64Courante) existant.image = imageBase64Courante;
      }
    } else {
      if (!imageBase64Courante) {
        afficherAlerte('produitAlert', 'Merci d\'ajouter une photo du gâteau.', 'error');
        return;
      }
      gateaux.push({
        id: genererId('cake'),
        nom, description, prix,
        image: imageBase64Courante,
        badge: ''
      });
    }

    Store.set(SHOPCAKE_KEYS.CAKES, gateaux);
    afficherAlerte('produitAlert', 'Gâteau enregistré avec succès ! 🎂', 'success');

    form.reset();
    document.getElementById('produitId').value = '';
    document.getElementById('produitSubmitBtn').textContent = 'Ajouter le gâteau';
    preview.style.display = 'none';
    imageBase64Courante = '';

    afficherProduitsAdmin();
  });
}

function afficherProduitsAdmin() {
  const grille = document.getElementById('produitsGrid');
  if (!grille) return;

  const gateaux = Store.get(SHOPCAKE_KEYS.CAKES, []);
  grille.innerHTML = '';

  gateaux.forEach(g => {
    const carte = document.createElement('article');
    carte.className = 'cake-card produit-card-admin';
    carte.innerHTML =
      '<div class="produit-card-admin__actions">' +
        '<button type="button" class="btn-edit" data-id="' + g.id + '" title="Modifier">✏️</button>' +
        '<button type="button" class="btn-delete" data-id="' + g.id + '" title="Supprimer">🗑️</button>' +
      '</div>' +
      '<div class="cake-card__image-wrap">' +
        '<img class="cake-card__image" src="' + g.image + '" alt="' + g.nom + '">' +
      '</div>' +
      '<div class="cake-card__body">' +
        '<h3 class="cake-card__title">' + g.nom + '</h3>' +
        '<p class="cake-card__desc">' + (g.description || '') + '</p>' +
        '<span class="cake-card__price">' + formaterPrix(g.prix) + '</span>' +
      '</div>';
    grille.appendChild(carte);
  });

  grille.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => remplirFormulairePourEdition(btn.dataset.id));
  });
  grille.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => supprimerProduit(btn.dataset.id));
  });
}

function remplirFormulairePourEdition(id) {
  const gateaux = Store.get(SHOPCAKE_KEYS.CAKES, []);
  const gateau = gateaux.find(g => g.id === id);
  if (!gateau) return;

  document.getElementById('produitId').value = gateau.id;
  document.getElementById('produitNom').value = gateau.nom;
  document.getElementById('produitDesc').value = gateau.description || '';
  document.getElementById('produitPrix').value = gateau.prix;

  const preview = document.getElementById('produitImagePreview');
  preview.src = gateau.image;
  preview.style.display = 'block';

  document.getElementById('produitSubmitBtn').textContent = 'Mettre à jour le gâteau';
  document.querySelector('[data-tab="produits"]').click();
  document.getElementById('produitForm').scrollIntoView({ behavior: 'smooth' });
}

function supprimerProduit(id) {
  if (!confirm('Supprimer ce gâteau de la carte ?')) return;
  let gateaux = Store.get(SHOPCAKE_KEYS.CAKES, []);
  gateaux = gateaux.filter(g => g.id !== id);
  Store.set(SHOPCAKE_KEYS.CAKES, gateaux);
  afficherProduitsAdmin();
  afficherToast('Gâteau supprimé.', 'success');
}

/* ------------------------------------------------------------
   5. ONGLET AVIS — modération
   ------------------------------------------------------------ */
function afficherAvisAdmin() {
  const grille = document.getElementById('avisAdminGrid');
  if (!grille) return;

  const avis = Store.get(SHOPCAKE_KEYS.REVIEWS, []);
  grille.innerHTML = '';

  avis.slice().reverse().forEach(a => {
    const carte = document.createElement('article');
    carte.className = 'review-card review-card-admin glass';
    carte.innerHTML =
      '<button type="button" class="review-card-admin__delete" data-id="' + a.id + '" title="Supprimer">✖</button>' +
      '<p class="review-card__name">' + a.nom + '</p>' +
      creerEtoiles(a.note) +
      '<p class="review-card__text" style="margin-top:.5rem;">' + a.texte + '</p>';
    grille.appendChild(carte);
  });

  grille.querySelectorAll('.review-card-admin__delete').forEach(btn => {
    btn.addEventListener('click', () => {
      let avisActuels = Store.get(SHOPCAKE_KEYS.REVIEWS, []);
      avisActuels = avisActuels.filter(a => a.id !== btn.dataset.id);
      Store.set(SHOPCAKE_KEYS.REVIEWS, avisActuels);
      afficherAvisAdmin();
    });
  });
}

/* ------------------------------------------------------------
   6. ONGLET BOUTIQUE — carte cliquable (Porto-Novo)
   ------------------------------------------------------------ */
let carteAdminInstance = null;
let marqueurAdminInstance = null;

function initCarteAdmin() {
  const conteneur = document.getElementById('mapAdmin');
  if (!conteneur || typeof L === 'undefined' || carteAdminInstance) {
    if (carteAdminInstance) carteAdminInstance.invalidateSize();
    return;
  }

  const position = Store.get(SHOPCAKE_KEYS.SHOP_LOCATION, { lat: 6.4969, lng: 2.6289, adresse: 'Porto-Novo, Bénin' });

  carteAdminInstance = L.map('mapAdmin').setView([position.lat, position.lng], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(carteAdminInstance);

  marqueurAdminInstance = L.marker([position.lat, position.lng], { draggable: true }).addTo(carteAdminInstance);

  document.getElementById('adresseBoutique').value = position.adresse || '';

  carteAdminInstance.on('click', (e) => {
    marqueurAdminInstance.setLatLng(e.latlng);
  });
}

function initSauvegardeBoutique() {
  const bouton = document.getElementById('btnSaveBoutique');
  if (!bouton) return;

  bouton.addEventListener('click', () => {
    if (!marqueurAdminInstance) return;
    const latlng = marqueurAdminInstance.getLatLng();
    const adresse = document.getElementById('adresseBoutique').value.trim();

    Store.set(SHOPCAKE_KEYS.SHOP_LOCATION, {
      lat: latlng.lat,
      lng: latlng.lng,
      adresse: adresse || 'Porto-Novo, Bénin'
    });

    document.getElementById('boutiqueSaved').textContent =
      '✅ Emplacement enregistré. Vos clients le verront sur les pages Commander et Contact.';
    afficherToast('Localisation de la boutique enregistrée.', 'success');
  });
}

/* ------------------------------------------------------------
   7. INITIALISATION
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  if (!verifierAccesAdmin()) return;

  initDeconnexionAdmin();
  initOngletsAdmin();
  afficherCommandesAdmin();
  initFormulaireProduit();
  afficherProduitsAdmin();
  afficherAvisAdmin();
  initSauvegardeBoutique();

  // Rafraîchit automatiquement les commandes toutes les 20s
  // (utile si l'admin garde l'onglet ouvert pendant que des
  // clients commandent depuis d'autres appareils/onglets).
  setInterval(afficherCommandesAdmin, 20000);
});
