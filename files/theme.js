/* ============================================================
   SHOPCAKE — theme.js (Partie 10/11)
   Applique et mémorise le thème choisi parmi les 5 disponibles
   (chocolat, vanille, fraise, rainbow, sombre). Nécessite
   app.js chargé avant (Store, SHOPCAKE_KEYS).

   Le thème est appliqué dès l'exécution du script (pas dans
   DOMContentLoaded) pour limiter le flash de thème par défaut
   au chargement de la page.
   ============================================================ */

const THEME_PAR_DEFAUT = 'chocolat';

function appliquerTheme(nomTheme) {
  document.documentElement.setAttribute('data-theme', nomTheme);
  const select = document.getElementById('themeSelect');
  if (select) select.value = nomTheme;
}

/* Application immédiate, avant même le rendu complet du DOM */
(function initialiserThemeAuPlusTot() {
  try {
    const themeSauvegarde = JSON.parse(localStorage.getItem('shopcake_theme'));
    document.documentElement.setAttribute('data-theme', themeSauvegarde || THEME_PAR_DEFAUT);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', THEME_PAR_DEFAUT);
  }
})();

function initSelecteurTheme() {
  const select = document.getElementById('themeSelect');
  if (!select) return;

  const themeActuel = document.documentElement.getAttribute('data-theme') || THEME_PAR_DEFAUT;
  select.value = themeActuel;

  select.addEventListener('change', () => {
    appliquerTheme(select.value);
    if (typeof Store !== 'undefined') Store.set(SHOPCAKE_KEYS.THEME, select.value);
    if (typeof afficherToast === 'function') {
      afficherToast('Thème "' + select.options[select.selectedIndex].text + '" appliqué', 'success');
    }
  });
}

document.addEventListener('DOMContentLoaded', initSelecteurTheme);
