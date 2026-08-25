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