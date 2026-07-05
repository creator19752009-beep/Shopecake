/* ============================================================
   SHOPCAKE — commande.js (Partie 7/11)
   Formulaire de commande : sélection du gâteau, choix
   Livraison / Retrait en boutique (avec carte), enregistrement
   de la commande pour l'admin, notification par e-mail.

   Nécessite app.js (Store, SHOPCAKE_KEYS...) chargé avant, ainsi
   que Leaflet et le SDK EmailJS (voir commande.html).
   ============================================================ */

/* ------------------------------------------------------------
   1. CONFIGURATION E-MAIL (EmailJS)
   ⚠️ Pour activer l'envoi réel d'e-mail à l'admin, créez un
   compte gratuit sur https://www.emailjs.com, un service, un
   template, puis remplacez les 3 valeurs ci-dessous. Sans ça,
   le système bascule automatiquement sur un lien "mailto"
   (le client ouvre son application mail avec le message pré-
   rempli) — la commande reste de toute façon visible dans le
   tableau de bord admin.
   ------------------------------------------------------------ */
const EMAILJS_CONFIG = {
  publicKey: 'VOTRE_PUBLIC_KEY',
  serviceId: 'VOTRE_SERVICE_ID',
  templateId: 'VOTRE_TEMPLATE_ID'
};

function emailjsEstConfigure() {
  return typeof emailjs !== 'undefined' &&
    EMAILJS_CONFIG.publicKey !== 'VOTRE_PUBLIC_KEY';
}

if (typeof emailjs !== 'undefined' && emailjsEstConfigure()) {
  emailjs.init(EMAILJS_CONFIG.publicKey);
}

/* ------------------------------------------------------------
   2. REMPLISSAGE DU SÉLECTEUR DE GÂTEAUX
   ------------------------------------------------------------ */
function remplirSelecteurGateaux() {
  const select = document.getElementById('cakeSelect');
  if (!select) return;

  const gateaux = Store.get(SHOPCAKE_KEYS.CAKES, []);
  const params = new URLSearchParams(window.location.search);
  const cakeIdPresetionne = params.get('cake');

  select.innerHTML = '';
  gateaux.forEach(g => {
    const option = document.createElement('option');
    option.value = g.id;
    option.textContent = g.nom + ' — ' + formaterPrix(g.prix);
    if (g.id === cakeIdPresetionne) option.selected = true;
    select.appendChild(option);
  });
}

/* ------------------------------------------------------------
   3. BASCULE LIVRAISON / RETRAIT + CARTE BOUTIQUE
   ------------------------------------------------------------ */
let carteCommandeInstance = null;

function initChoixMode() {
  const radioLivraison = document.getElementById('modeLivraison');
  const radioRetrait = document.getElementById('modeRetrait');
  const blocLivraison = document.getElementById('blocLivraison');
  const blocRetrait = document.getElementById('blocRetrait');
  const champAdresse = document.getElementById('adresse');

  if (!radioLivraison || !radioRetrait) return;

  function appliquerMode() {
    const estRetrait = radioRetrait.checked;
    blocLivraison.style.display = estRetrait ? 'none' : '';
    blocRetrait.style.display = estRetrait ? '' : 'none';
    champAdresse.required = !estRetrait;

    if (estRetrait && !carteCommandeInstance) {
      carteCommandeInstance = afficherCarteBoutique('mapCommande', 'adresseBoutiqueTexte');
      // Leaflet a besoin d'un recalcul de taille une fois le conteneur visible
      setTimeout(() => { if (carteCommandeInstance) carteCommandeInstance.invalidateSize(); }, 200);
    }
  }

  radioLivraison.addEventListener('change', appliquerMode);
  radioRetrait.addEventListener('change', appliquerMode);
  appliquerMode();
}

/* ------------------------------------------------------------
   4. ENVOI DE L'E-MAIL DE NOTIFICATION À L'ADMIN
   ------------------------------------------------------------ */
function notifierAdminParEmail(commande) {
  const adminEmail = Store.get(SHOPCAKE_KEYS.ADMIN_EMAIL, 'contact@shopcake.bj');

  const resume =
    'Nouvelle commande ShopCake\n\n' +
    'Gâteau : ' + commande.cakeNom + ' x' + commande.quantite + '\n' +
    'Total : ' + formaterPrix(commande.total) + '\n' +
    'Mode : ' + (commande.mode === 'livraison' ? 'Livraison' : 'Retrait en boutique') + '\n' +
    (commande.mode === 'livraison' ? 'Adresse : ' + commande.adresse + '\n' : '') +
    'Date souhaitée : ' + commande.dateSouhaitee + '\n' +
    'Client : ' + commande.clientNom + ' — ' + commande.clientTel + ' — ' + commande.clientEmail +
    (commande.message ? '\nMessage sur le gâteau : ' + commande.message : '');

  if (emailjsEstConfigure()) {
    emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
      to_email: adminEmail,
      order_summary: resume,
      client_nom: commande.clientNom
    }).catch(err => console.error('Échec envoi EmailJS, secours mailto', err));
  } else {
    // Solution de secours sans backend : ouvre le client mail de l'utilisateur.
    const lien = document.createElement('a');
    lien.href = 'mailto:' + adminEmail +
      '?subject=' + encodeURIComponent('Nouvelle commande ShopCake — ' + commande.clientNom) +
      '&body=' + encodeURIComponent(resume);
    lien.target = '_blank';
    lien.rel = 'noopener';
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
  }
}

/* ------------------------------------------------------------
   5. ANIMATION DE CONFIRMATION (overlay gâteau)
   ------------------------------------------------------------ */
function afficherConfirmationCommande() {
  let overlay = document.getElementById('cakeSuccess');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'cake-success';
    overlay.id = 'cakeSuccess';
    overlay.innerHTML =
      '<div class="cake-success__emoji">🎂</div>' +
      '<p class="cake-success__text">Commande envoyée avec succès !</p>';
    document.body.appendChild(overlay);
  }
  overlay.classList.add('is-visible');
  setTimeout(() => overlay.classList.remove('is-visible'), 2600);
}

/* ------------------------------------------------------------
   6. SOUMISSION DU FORMULAIRE
   ------------------------------------------------------------ */
function initFormulaireCommande() {
  const form = document.getElementById('commandeForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const gateaux = Store.get(SHOPCAKE_KEYS.CAKES, []);
    const cakeId = document.getElementById('cakeSelect').value;
    const gateau = gateaux.find(g => g.id === cakeId);
    if (!gateau) {
      afficherAlerte('formAlert', 'Veuillez choisir un gâteau.', 'error');
      return;
    }

    const mode = document.querySelector('input[name="mode"]:checked').value;
    const adresse = document.getElementById('adresse').value.trim();

    if (mode === 'livraison' && !adresse) {
      afficherAlerte('formAlert', 'Merci de renseigner une adresse de livraison.', 'error');
      return;
    }

    const quantite = Math.max(1, parseInt(document.getElementById('quantite').value, 10) || 1);
    const shopLocation = Store.get(SHOPCAKE_KEYS.SHOP_LOCATION, {});

    const commande = {
      id: genererId('cmd'),
      cakeId: gateau.id,
      cakeNom: gateau.nom,
      cakeImage: gateau.image,
      prixUnitaire: gateau.prix,
      quantite: quantite,
      total: gateau.prix * quantite,
      message: document.getElementById('message').value.trim(),
      dateSouhaitee: document.getElementById('dateSouhaitee').value,
      mode: mode,
      adresse: mode === 'livraison' ? adresse : (shopLocation.adresse || 'Retrait en boutique'),
      clientNom: document.getElementById('nomClient').value.trim(),
      clientTel: document.getElementById('telClient').value.trim(),
      clientEmail: document.getElementById('emailClient').value.trim(),
      statut: 'attente',
      createdAt: new Date().toISOString()
    };

    const commandes = Store.get(SHOPCAKE_KEYS.ORDERS, []);
    commandes.push(commande);
    Store.set(SHOPCAKE_KEYS.ORDERS, commandes);

    notifierAdminParEmail(commande);
    afficherConfirmationCommande();
    afficherAlerte('formAlert', 'Commande enregistrée ! L\'équipe ShopCake a été prévenue. 🎉', 'success');
    form.reset();
    initChoixMode();
  });
}

/* ------------------------------------------------------------
   7. INITIALISATION
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  remplirSelecteurGateaux();
  initChoixMode();
  initFormulaireCommande();
});
