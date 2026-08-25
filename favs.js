/* Quick Favorites - unRAID header menu
 *
 * Loaded on every page by QuickFavoritesButton.page (Menu="Buttons").
 *
 * IMPORTANT rendering note:
 * Unraid's default-base.css (loaded by every theme) contains the global rule
 *
 *     .nav-item a span { display: none; }
 *
 * so ANY label wrapped in a <span> inside a nav item is invisible. Unraid's own
 * tabs put their text directly in the <a> as a bare text node:
 *
 *     <div class="nav-item"><a href="/Tools" onclick="initab('/Tools')">Tools</a></div>
 *
 * This script does the same. A bare text node is unaffected by both the top-theme
 * rule above and the sidebar-theme rule (.nav-item a b {display:none}), so the
 * label stays visible on black, white, azure and gray.
 */
(function () {
    'use strict';

    var PLUGIN = 'quick.favorites';
    var LABEL = String((window.qf_settings && window.qf_settings.label) || '\u2B50\u2B50').trim();

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
        var anchor = document.getElementById('qf-custom-btn');
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

    window.qfToggleMenu = toggleMenu;

    /* ------------------------------------------------------------------ */
    /* 3. Put the button at the end of the nav bar                         */
    /* ------------------------------------------------------------------ */

    function leftNavTile() {
        var tiles = document.querySelectorAll('#menu .nav-tile');
        for (var i = 0; i < tiles.length; i++) {
            if (!tiles[i].classList.contains('right')) return tiles[i];
        }
        return null;
    }

    // Fill the anchor the way Unraid fills its own tabs: a bare text node.
    function applyLabel(anchor) {
        while (anchor.firstChild) anchor.removeChild(anchor.firstChild);

        if (/^(fa-|icon-)[a-z0-9\-]+$/i.test(LABEL)) {
            var b = document.createElement('b');
            b.className = (LABEL.indexOf('icon-') === 0) ? LABEL + ' system' : 'fa ' + LABEL + ' system';
            anchor.appendChild(b);
        } else {
            // Bare text node - NOT wrapped in <span>, which Unraid's CSS hides.
            anchor.appendChild(document.createTextNode(LABEL));
        }
    }

    function placeButton() {
        var tile = leftNavTile();
        if (!tile) return false;

        var server = document.querySelector('#menu .nav-item.QuickFavoritesButton');
        var synth  = document.querySelector('#menu .nav-item.qf-synthetic');

        // The server-rendered button arrived after we had already built a
        // fallback -> drop ours, keep Unraid's.
        if (server && synth && server !== synth) {
            synth.parentNode && synth.parentNode.removeChild(synth);
            synth = null;
        }

        var item = server || synth;

        if (!item) {
            // Do NOT invent a button while the document is still parsing.
            // Unraid emits our nav item into the RIGHT nav tile, after the left
            // tile and after my_usage(), so during parsing it can legitimately
            // not exist yet. Creating one here is what produced a duplicate
            // ("two stars") on slow-rendering pages such as /Plugins.
            if (document.readyState === 'loading') return false;

            item = document.createElement('div');
            item.className = 'nav-item qf-synthetic';
            item.appendChild(document.createElement('a'));
        }

        item.classList.remove('util');          // drop right-hand utility icon styling
        item.classList.add('qf-nav-item');

        // Move to the very end of the tab strip -> last item on the menu bar.
        if (item.parentNode !== tile || tile.lastElementChild !== item) tile.appendChild(item);

        var anchor = item.querySelector('a');
        if (!anchor) { anchor = document.createElement('a'); item.appendChild(anchor); }

        if (!anchor._qfReady) {
            anchor._qfReady = true;
            anchor.id = 'qf-custom-btn';
            anchor.setAttribute('href', '#');
            anchor.setAttribute('title', 'Quick Favorites');
            anchor.removeAttribute('onclick');
            applyLabel(anchor);
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                toggleMenu();
            }, false);
        }
        return true;
    }

    function init() {
        if (!placeButton()) return false;
        loadPopup();                 // warm the payload so the first click is instant
        return true;
    }

    if (!init()) {
        var attempts = 0;
        var timer = setInterval(function () {
            attempts++;
            if (init() || attempts >= 60) clearInterval(timer);
        }, 100);
    }
    document.addEventListener('DOMContentLoaded', init);
    window.addEventListener('load', init);   // final de-duplication pass
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
