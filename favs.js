/* Quick Favorites - unRAID header menu
 *
 * Loaded on every page by QuickFavoritesButton.page (Menu="Buttons").
 *
 * Unraid renders our nav item into the right-hand utility group of #menu as:
 *   <div class="nav-item QuickFavoritesButton util">
 *     <a href="#" onclick="QuickFavoritesButton();return false;" title="Quick Favorites">
 *       <b class="fa fa-star system"></b><span>Quick Favorites</span>
 *     </a>
 *   </div>
 *
 * This script moves that element to the END of the left tab strip
 * (#menu .nav-tile, the one holding Dashboard / Main / ... / Tools) so it is the
 * last item on the menu bar, swaps in the user's header label, and wires up the
 * popup. It does NOT depend on Unraid's native "Favorites" tab existing.
 */
(function () {
    'use strict';

    var PLUGIN = 'quick.favorites';
    var LABEL = (window.qf_settings && window.qf_settings.label) || '\u2B50\u2B50';

    /* ------------------------------------------------------------------ */
    /* 1. Popup payload                                                    */
    /* ------------------------------------------------------------------ */

    var popupLoading = false;

    function loadPopup(done) {
        var existing = document.getElementById('my-custom-fav-menu');
        if (existing) { if (done) done(existing); return; }
        if (popupLoading) return;
        popupLoading = true;

        fetch('/plugins/' + PLUGIN + '/popup.php', { credentials: 'same-origin' })
            .then(function (res) { return res.text(); })
            .then(function (html) {
                var host = document.createElement('div');
                host.id = 'qf-popup-host';
                host.innerHTML = html; // <style> blocks inserted this way still apply
                document.body.appendChild(host);
                popupLoading = false;
                if (done) done(document.getElementById('my-custom-fav-menu'));
            })
            .catch(function (err) {
                popupLoading = false;
                console.error('[QuickFavorites] Failed to load popup payload:', err);
            });
    }

    /* ------------------------------------------------------------------ */
    /* 2. Open / close                                                     */
    /* ------------------------------------------------------------------ */

    function positionMenu(menu, anchor) {
        var rect = anchor.getBoundingClientRect();
        var width = menu.offsetWidth || 480;
        var center = rect.left + window.scrollX + (rect.width / 2);
        var left = Math.max(15, Math.min(center - (width / 2), window.innerWidth - width - 15));
        menu.style.top = (rect.bottom + window.scrollY + 10) + 'px';
        menu.style.left = left + 'px';
    }

    function toggleMenu() {
        var anchor = document.getElementById('qf-custom-btn')
                  || document.querySelector('#menu .nav-item.QuickFavoritesButton a');
        if (!anchor) return;

        loadPopup(function (menu) {
            if (!menu) return;
            if (menu.style.display === 'block') {
                menu.style.display = 'none';
            } else {
                menu.style.display = 'block';
                positionMenu(menu, anchor);
            }
        });
    }

    // Exposed so the inline onclick Unraid renders can reach it.
    window.qfToggleMenu = toggleMenu;

    /* ------------------------------------------------------------------ */
    /* 3. Put the button at the end of the nav bar                         */
    /* ------------------------------------------------------------------ */

    function buildLabel(anchor) {
        anchor.textContent = '';
        var trimmed = String(LABEL).trim();

        if (/^(fa-|icon-)[a-z0-9\-]+$/i.test(trimmed)) {
            var i = document.createElement('b');
            i.className = (trimmed.indexOf('icon-') === 0) ? trimmed + ' system' : 'fa ' + trimmed + ' system';
            anchor.appendChild(i);
        } else {
            var span = document.createElement('span');
            span.className = 'qf-nav-label';
            span.textContent = trimmed;
            anchor.appendChild(span);
        }
    }

    function placeButton() {
        var item = document.querySelector('#menu .nav-item.QuickFavoritesButton');
        if (!item) return false;

        // The left tab strip is the .nav-tile WITHOUT the "right" class.
        var tiles = document.querySelectorAll('#menu .nav-tile');
        var leftTile = null;
        for (var i = 0; i < tiles.length; i++) {
            if (!tiles[i].classList.contains('right')) { leftTile = tiles[i]; break; }
        }
        if (!leftTile) leftTile = item.parentNode;

        // Move to the very end of the tab strip -> last item on the menu bar.
        if (leftTile.lastElementChild !== item) leftTile.appendChild(item);

        item.classList.remove('util');   // drop the right-hand utility icon styling
        item.classList.add('qf-nav-item');

        var anchor = item.querySelector('a');
        if (!anchor) return false;

        if (!anchor._qfReady) {
            anchor._qfReady = true;
            anchor.id = 'qf-custom-btn';
            anchor.setAttribute('href', '#');
            anchor.setAttribute('title', 'Quick Favorites');
            anchor.removeAttribute('onclick');
            buildLabel(anchor);
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                toggleMenu();
            }, false);
        }
        return true;
    }

    function init() {
        if (placeButton()) {
            loadPopup();       // warm the payload so the first click is instant
            return true;
        }
        return false;
    }

    if (!init()) {
        var attempts = 0;
        var timer = setInterval(function () {
            attempts++;
            if (init() || attempts >= 60) clearInterval(timer);
        }, 100);
    }
    document.addEventListener('DOMContentLoaded', init);
})();

/* ---------------------------------------------------------------------- */
/* 4. Delegated handling of clicks inside the popup                        */
/* ---------------------------------------------------------------------- */
document.addEventListener('click', function (e) {
    var customMenu = document.getElementById('my-custom-fav-menu');
    if (!customMenu || customMenu.style.display !== 'block') return;

    if (!e.target.closest('#my-custom-fav-menu') && !e.target.closest('#qf-custom-btn')) {
        customMenu.style.display = 'none';
        return;
    }

    var itemTarget = e.target.closest('.qf-item');
    if (!itemTarget) return;

    var action = itemTarget.getAttribute('data-action');
    var path = itemTarget.getAttribute('data-path') ? itemTarget.getAttribute('data-path').trim() : '';
    var token = (typeof csrf_token !== 'undefined') ? csrf_token : '';

    if (action === 'script_modal' || action === 'script_background') {
        e.preventDefault(); e.stopPropagation();
        var fullScriptPath = '/boot/config/plugins/user.scripts/scripts/' + path + '/script';

        $.post('/plugins/user.scripts/exec.php', {
            script: fullScriptPath,
            action: 'intermediate',
            csrf_token: token
        }, function () {
            var tmpScriptPath = '/tmp/user.scripts/tmpScripts/' + path + '/script';
            var targetUrl = (action === 'script_modal')
                ? '/plugins/user.scripts/startScript.sh&arg1=' + tmpScriptPath
                : '/plugins/user.scripts/backgroundScript.sh&arg1=' + tmpScriptPath;

            openBox(targetUrl, 'Executing: ' + path, 600, 900, true);
            customMenu.style.display = 'none';
        });
    }
    else if (action === 'script_log') {
        e.preventDefault(); e.stopPropagation();
        if (!path) return;

        var scriptName = path.replace(/^\/+/, '');
        var logWin = window.open('/logging.htm?done=Close', 'qf_log_window',
            'width=800,height=600,resizable=yes,scrollbars=yes');
        var fetchUrl = '/plugins/quick.favorites/log_api.php?script=' + encodeURIComponent(scriptName);

        fetch(fetchUrl, { credentials: 'same-origin' })
            .then(function (res) { return res.text(); })
            .then(function (logData) {
                var checkReady = setInterval(function () {
                    if (logWin && logWin.document && logWin.document.readyState === 'complete') {
                        clearInterval(checkReady);
                        var contentDiv = logWin.document.createElement('div');
                        contentDiv.style.whiteSpace = 'pre-wrap';
                        contentDiv.style.fontFamily = 'monospace';
                        contentDiv.style.padding = '10px';
                        contentDiv.innerHTML = logData;
                        logWin.document.body.insertBefore(contentDiv, logWin.document.body.firstChild);
                        logWin.scrollTo(0, logWin.document.body.scrollHeight);
                    }
                }, 50);
            })
            .catch(function (err) {
                if (logWin && logWin.document) {
                    logWin.document.body.innerHTML =
                        "<div style='padding:20px;color:red;'>Fetch Error: " + err + '</div>';
                }
            });
        customMenu.style.display = 'none';
    }
}, true);
