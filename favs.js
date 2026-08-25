(function () {
    function createNewMenu() {
        if (document.getElementById('qf-custom-btn')) return;
        
        var menuBar = document.querySelector('div#menu');
        if (!menuBar) return;

        // 1. Create a dedicated nav-item container matching Unraid's layout architecture
        var navItemDiv = document.createElement('div');
        navItemDiv.className = 'nav-item';

        var btn = document.createElement('a');
        btn.id = 'qf-custom-btn';
        btn.href = '#';
        // Pulls label from global settings or defaults to stars
        btn.innerHTML = (typeof qf_settings !== 'undefined' && qf_settings.label) ? qf_settings.label : '⭐⭐';
        btn.title = 'Quick Favorites';
        btn.style.cssText = 'height: 100%; display: inline-flex; align-items: center; padding: 0 14px; cursor: pointer; text-decoration: none; color: inherit; font-size: 13px; font-weight: bold;';

        navItemDiv.appendChild(btn);

        // 2. Find the core "Settings" tab link as a universal, reliable anchor
        var allLinks = menuBar.querySelectorAll('a');
        var settingsNode = null;

        for (var i = 0; i < allLinks.length; i++) {
            var href = allLinks[i].getAttribute('href') || '';
            if (allLinks[i].textContent.trim() === 'Settings' || href.includes('Settings')) {
                settingsNode = allLinks[i].closest('.nav-item') || allLinks[i].parentElement;
                break;
            }
        }

        // 3. Insert right after Settings, or fallback to the end of the menu if Settings isn't found
        if (settingsNode && settingsNode.parentElement === menuBar) {
            settingsNode.after(navItemDiv);
        } else {
            menuBar.appendChild(navItemDiv);
        }
    }

    var runs = 0;
    var timer = setInterval(function () {
        createNewMenu();
        runs++;
        if (runs >= 30) clearInterval(timer);
    }, 400);

    var obs = new MutationObserver(function () {
        createNewMenu();
    });

    if (document.body) {
        obs.observe(document.body, { childList: true, subtree: true });
        createNewMenu();
    }
})();

// Full click handler for the popup menu and script execution
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
                        var targetUrl = "";

                        if (action === 'script_modal') {
                            targetUrl = "/plugins/user.scripts/startScript.sh&arg1=" + tmpScriptPath;
                            openBox(targetUrl, 'Executing: ' + path, 600, 900, true);
                        } else {
                            targetUrl = "/plugins/user.scripts/backgroundScript.sh&arg1=" + tmpScriptPath;
                            openBox(targetUrl, 'Executing (Background): ' + path, 600, 900, true);
                        }
                        customMenu.style.display = 'none';
                    });
                }
                else if (action === 'script_log') {
                    e.preventDefault(); e.stopPropagation();

                    if (!path || path === '') {
                        alert("Javascript Error: The script name (data-path) is blank in the HTML!");
                        return;
                    }
                    var scriptName = path.replace(/^\/+/, '');
                    var logWin = window.open('/logging.htm?done=Close', 'qf_log_window', 'width=800,height=600,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no');
                    var fetchUrl = '/plugins/quick.favorites/log_api.php?script=' + encodeURIComponent(scriptName);

                    fetch(fetchUrl)
                        .then(function(response) {
                            if (!response.ok) {
                                throw new Error('HTTP ' + response.status);
                            }
                            return response.text();
                        })
                        .then(function(logData) {
                            var checkReady = setInterval(function() {
                                if (logWin && logWin.document && logWin.document.readyState === 'complete') {
                                    clearInterval(checkReady);
                                    var contentDiv = logWin.document.createElement('div');
                                    contentDiv.style.whiteSpace = 'pre-wrap';
                                    contentDiv.style.fontFamily = 'monospace';
                                    contentDiv.style.padding = '10px';
                                    contentDiv.style.marginBottom = '20px';
                                    contentDiv.textContent = logData;
                                    logWin.document.body.insertBefore(contentDiv, logWin.document.body.firstChild);
                                    logWin.scrollTo(0, logWin.document.body.scrollHeight);
                                }
                            }, 50);
                        })
                        .catch(function(err) {
                            if (logWin && logWin.document) {
                                var errorDiv = logWin.document.createElement('div');
                                errorDiv.style.padding = '20px';
                                errorDiv.style.color = 'red';
                                errorDiv.textContent = 'Fetch Error: ' + err;
                                logWin.document.body.insertBefore(errorDiv, logWin.document.body.firstChild);
                            }
                        });

                    customMenu.style.display = 'none';
                }
            }
        }
    }
}, true);