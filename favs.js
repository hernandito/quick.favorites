(function () {
    var labelText = (typeof qf_settings !== 'undefined' && qf_settings.label) ? qf_settings.label : '⭐⭐';

    function createNewMenu() {
        if (document.getElementById('qf-custom-btn')) return; // Already exists
        
        // Find Unraid's top nav container
        var nav = document.querySelector('.nav-user') || document.querySelector('#navBar') || document.querySelector('ul.nav');
        if (!nav) return;

        var btn = document.createElement('a');
        btn.id = 'qf-custom-btn';
        btn.href = '#';
        btn.innerHTML = labelText;
        btn.title = 'Quick Favorites';
        btn.style.cssText = 'padding: 0 10px; cursor: pointer; display: inline-flex; align-items: center; text-decoration: none; color: inherit; font-weight: bold;';

        if (nav.tagName === 'UL') {
            var li = document.createElement('li');
            li.appendChild(btn);
            nav.appendChild(li); // Appends to the very end
        } else {
            nav.appendChild(btn); // Appends to the very end
        }
    }

    // Run several times because unRAID can redraw parts of the header (from your script!)
    var runs = 0;
    var maxRuns = 20;
    var timer = setInterval(function () {
        createNewMenu();
        runs++;
        if (runs >= maxRuns) clearInterval(timer);
    }, 500);

    // Watch for DOM updates and re-apply
    var obs = new MutationObserver(function () {
        createNewMenu();
    });

    function startObserver() {
        if (document.body) {
            obs.observe(document.body, { childList: true, subtree: true });
            createNewMenu();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver, { once: true });
    } else {
        startObserver();
    }
})();

// Popup Click Logic
document.addEventListener('click', function(e) {
    var clickedLink = e.target.closest('#qf-custom-btn');
    var customMenu = document.getElementById('my-custom-fav-menu');

    if (clickedLink) {
        e.preventDefault(); e.stopPropagation();
        if (!customMenu) return;

        if (customMenu.style.display === 'block') {
            customMenu.style.display = 'none';
        } else {
            customMenu.style.display = 'block';
            var rect = clickedLink.getBoundingClientRect();
            var menuWidth = customMenu.offsetWidth || 480;
            var btnCenter = rect.left + window.scrollX + (rect.width / 2);
            var calculatedLeft = Math.max(15, Math.min(btnCenter - (menuWidth / 2), window.innerWidth - menuWidth - 15));
            customMenu.style.top = (rect.bottom + window.scrollY + 10) + 'px';
            customMenu.style.left = calculatedLeft + 'px';
        }
    } 
    else if (customMenu && customMenu.style.display === 'block') {
        if (!e.target.closest('#my-custom-fav-menu')) {
            customMenu.style.display = 'none';
        } else {
            var itemTarget = e.target.closest('.qf-item');
            if (itemTarget) {
                var action = itemTarget.getAttribute('data-action');
                var path = itemTarget.getAttribute('data-path').trim();
                var token = (typeof csrf_token !== 'undefined') ? csrf_token : '';
                
                if (action === 'script_modal' || action === 'script_background') {
                    e.preventDefault(); e.stopPropagation();
                    var fullScriptPath = "/boot/config/plugins/user.scripts/scripts/" + path + "/script";
                    
                    $.post('/plugins/user.scripts/exec.php', {
                        script: fullScriptPath,
                        action: 'intermediate',
                        csrf_token: token
                    }, function() {
                        var tmpScriptPath = "/tmp/user.scripts/tmpScripts/" + path + "/script";
                        var targetUrl = (action === 'script_modal') 
                            ? "/plugins/user.scripts/startScript.sh&arg1=" + tmpScriptPath 
                            : "/plugins/user.scripts/backgroundScript.sh&arg1=" + tmpScriptPath;
                        
                        openBox(targetUrl, 'Executing: ' + path, 600, 900, true);
                        customMenu.style.display = 'none'; 
                    });
                } 
                else if (action === 'script_log') {
                    e.preventDefault(); e.stopPropagation();
                    if (!path) return;
                    
                    var scriptName = path.replace(/^\/+/, '');
                    var logWin = window.open('/logging.htm?done=Close', 'qf_log_window', 'width=800,height=600,resizable=yes,scrollbars=yes');
                    var fetchUrl = '/plugins/quick.favorites/log_api.php?script=' + encodeURIComponent(scriptName);
                    
                    fetch(fetchUrl)
                        .then(function(res) { return res.text(); })
                        .then(function(logData) {
                            var checkReady = setInterval(function() {
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
                        });
                    customMenu.style.display = 'none';
                }
            }
        }
    }
}, true);