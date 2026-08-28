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

    // Single-instance guard. If favs.js is evaluated more than once (double
    // <script> tag, cached duplicate, re-injected header) the second copy must
    // not build a second button.
    if (window.__quickFavoritesLoaded) return;
    window.__quickFavoritesLoaded = true;

    var PLUGIN = 'quick.favorites';
    var LABEL = String((window.qf_settings && window.qf_settings.label) || '\u2B50\u2B50').trim();

    // Open on click (default) or on hover. Pointer devices without hover
    // (touch screens) always fall back to click, otherwise the menu would be
    // unreachable - a tap fires no mouseenter.
    var canHover = !window.matchMedia || window.matchMedia('(hover: hover)').matches;
    var HOVER = ((window.qf_settings && window.qf_settings.open_mode) === 'hover') && canHover;
    var OPEN_DELAY = parseInt((window.qf_settings && window.qf_settings.hover_delay), 10);
    if (isNaN(OPEN_DELAY) || OPEN_DELAY < 0) OPEN_DELAY = 250;
    var CLOSE_DELAY = 400;   // grace period while crossing the gap to the popup

    /* ------------------------------------------------------------------ */
    /* 1. Popup payload                                                    */
    /* ------------------------------------------------------------------ */

    // Emoji webfont. Loaded as a normal, non-blocking <link> once the page has
    // settled - never as an @import inside the pop-up's own stylesheet, which
    // used to hold that sheet back and let the menu paint unstyled.
    // If it never arrives (slow link, server offline, Google unreachable) the
    // platform emoji font in the CSS stack renders instead, so icons always show.
    function ensureEmojiFont() {
        if (document.getElementById('qf-emoji-font')) return;

        var pre = document.createElement('link');
        pre.rel = 'preconnect';
        pre.href = 'https://fonts.gstatic.com';
        pre.crossOrigin = 'anonymous';
        document.head.appendChild(pre);

        var link = document.createElement('link');
        link.id = 'qf-emoji-font';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap';
        link.media = 'all';
        document.head.appendChild(link);
    }

    var popupLoading = false;

    function loadPopup(done) {
        var existing = document.getElementById('my-custom-fav-menu');
        if (existing) { bindPopupHover(existing); if (done) done(existing); return; }
        if (popupLoading) return;
        popupLoading = true;

        fetch('/plugins/' + PLUGIN + '/popup.php', { credentials: 'same-origin' })
            .then(function (res) { return res.text(); })
            .then(function (html) {
                var host = document.createElement('div');
                host.id = 'qf-popup-host';
                // Hidden inline BEFORE any markup goes in, so the fragment can
                // never paint even for one frame. popup.php's own <style> is not
                // trusted for this: it begins with an external @import (Google
                // Fonts) and a sheet with a pending import can be applied late,
                // during which the raw menu renders full size. That was the flash.
                host.style.display = 'none';
                host.innerHTML = html; // <style> blocks inserted this way still apply
                document.body.appendChild(host);
                var m0 = host.querySelector('#my-custom-fav-menu');
                if (m0) m0.style.display = 'none';   // belt and braces
                popupLoading = false;
                var built = document.getElementById('my-custom-fav-menu');
                bindPopupHover(built);
                if (done) done(built);
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
        // In hover mode keep the popup tight under the button. A large gap is a
        // dead zone: the pointer leaves the button before reaching the menu.
        menu.style.top = (rect.bottom + window.scrollY + (HOVER ? 2 : 10)) + 'px';
        menu.style.left = left + 'px';
    }

    var openTimer = null, closeTimer = null;

    function cancelTimers() {
        if (openTimer)  { clearTimeout(openTimer);  openTimer = null; }
        if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    }

    function isOpen() {
        var m = document.getElementById('my-custom-fav-menu');
        return !!m && m.classList.contains('qf-open');
    }

    function openMenu() {
        var anchor = document.getElementById('qf-custom-btn');
        if (!anchor) return;
        ensureEmojiFont();
        loadPopup(function (menu) {
            if (!menu) return;
            var host = document.getElementById('qf-popup-host');
            if (host) { host.style.display = 'block'; host.classList.add('qf-visible'); }
            menu.style.display = '';            // let the stylesheet decide
            menu.classList.add('qf-open');
            positionMenu(menu, anchor);
        });
    }

    function closeMenu() {
        var m = document.getElementById('my-custom-fav-menu');
        if (m) { m.classList.remove('qf-open'); m.style.display = 'none'; }
        var host = document.getElementById('qf-popup-host');
        if (host) { host.classList.remove('qf-visible'); host.style.display = 'none'; }
    }

    function toggleMenu() {
        cancelTimers();
        if (isOpen()) closeMenu(); else openMenu();
    }

    // ---- hover handling ----
    function scheduleOpen() {
        cancelTimers();
        if (isOpen()) return;
        openTimer = setTimeout(function () { openTimer = null; openMenu(); }, OPEN_DELAY);
    }

    function scheduleClose() {
        cancelTimers();
        closeTimer = setTimeout(function () { closeTimer = null; closeMenu(); }, CLOSE_DELAY);
    }

    // Keep the menu open while the pointer is inside it, and close once it
    // leaves. Bound when the popup is first built.
    function bindPopupHover(menu) {
        if (!HOVER || !menu || menu._qfHoverBound) return;
        menu._qfHoverBound = true;
        menu.addEventListener('mouseenter', cancelTimers, false);
        menu.addEventListener('mouseleave', scheduleClose, false);
    }

    window.qfToggleMenu = toggleMenu;
    window.qfCloseMenu  = closeMenu;

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

    // Collapse any number of Quick Favorites nav items down to exactly one,
    // always preferring the server-rendered element over a synthetic fallback.
    // This is the backstop: whatever else goes wrong, only one button survives.
    function dedupe() {
        var all = document.querySelectorAll(
            '#menu .nav-item.QuickFavoritesButton, #menu .nav-item.qf-nav-item, #menu .nav-item.qf-synthetic'
        );
        if (all.length < 2) return;

        var keep = document.querySelector('#menu .nav-item.QuickFavoritesButton') || all[0];
        for (var i = 0; i < all.length; i++) {
            if (all[i] !== keep && all[i].parentNode) all[i].parentNode.removeChild(all[i]);
        }
    }

    function placeButton() {
        dedupe();
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

            // Hover mode is additive - click still works exactly as before.
            if (HOVER) {
                item.addEventListener('mouseenter', scheduleOpen, false);
                item.addEventListener('mouseleave', scheduleClose, false);
            }
        }
        return true;
    }

    // Pre-fetching is a convenience, not a requirement. Doing it while the page
    // is still rendering is what put menu markup on screen mid-load, so hold off
    // until the load event has fired and the browser is idle.
    var warmed = false;
    function warmPopup() {
        if (warmed) return;
        warmed = true;
        var go = function () {
            var work = function () { ensureEmojiFont(); loadPopup(); };
            if (window.requestIdleCallback) {
                window.requestIdleCallback(work, { timeout: 3000 });
            } else {
                setTimeout(work, 800);
            }
        };
        if (document.readyState === 'complete') go();
        else window.addEventListener('load', go, { once: true });
    }

    function init() {
        if (!placeButton()) return false;
        warmPopup();                 // pre-fetch, but never during page render
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
    window.addEventListener('load', init);

    // Watch the nav bar itself. If Unraid streams its button in after we made a
    // fallback - the race that caused the intermittent double star - this fires
    // the moment it lands, instead of waiting for a timer.
    (function watchMenu() {
        if (typeof MutationObserver === 'undefined') return;
        var scheduled = false;
        var obs = new MutationObserver(function () {
            if (scheduled) return;
            scheduled = true;
            setTimeout(function () { scheduled = false; init(); }, 0);
        });
        function attach() {
            var menu = document.getElementById('menu');
            if (menu) { obs.observe(menu, { childList: true, subtree: true }); return true; }
            return false;
        }
        if (!attach()) document.addEventListener('DOMContentLoaded', attach);
    })();
})();

/* ---------------------------------------------------------------------- */
/* 4. Delegated handling of clicks inside the popup                        */
/* ---------------------------------------------------------------------- */
document.addEventListener('click', function (e) {
    var customMenu = document.getElementById('my-custom-fav-menu');
    if (!customMenu || !customMenu.classList.contains('qf-open')) return;

    if (!e.target.closest('#my-custom-fav-menu') && !e.target.closest('#qf-custom-btn')) {
        window.qfCloseMenu && window.qfCloseMenu();
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
            window.qfCloseMenu && window.qfCloseMenu();
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
        window.qfCloseMenu && window.qfCloseMenu();
    }
}, true);
