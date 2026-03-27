document.addEventListener('click', function(e) {
    var clickedLink = e.target.closest('a[href="/Favorites"]');
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

                    // Clean up the name (removes leading slashes just in case)
                    var scriptName = path.replace(/^\/+/, '');
                    
                    // 1. Open Unraid's native blank log window
                    var logWin = window.open('/logging.htm?done=Close', 'qf_log_window', 'width=800,height=600,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no');
                    
                    // 2. Fetch the log text from our API using GET so it matches the PHP file
                    var fetchUrl = '/plugins/quick.favorites/log_api.php?script=' + encodeURIComponent(scriptName);
                    
                    fetch(fetchUrl)
                        .then(function(response) { return response.text(); })
                        .then(function(logData) {
                            
                            // 3. Wait for the page's "readyState" to be complete so we know Unraid added its button
                            var checkReady = setInterval(function() {
                                if (logWin && logWin.document && logWin.document.readyState === 'complete') {
                                    clearInterval(checkReady);
                                    
                                    // 4. Create our pre-formatted HTML log container
                                    var contentDiv = logWin.document.createElement('div');
                                    contentDiv.style.whiteSpace = 'pre-wrap';
                                    contentDiv.style.fontFamily = 'monospace';
                                    contentDiv.style.padding = '10px';
                                    contentDiv.style.marginBottom = '20px';
                                    contentDiv.innerHTML = logData; 
                                    
                                    // 5. Slip our log directly ABOVE Unraid's native Close button
                                    logWin.document.body.insertBefore(contentDiv, logWin.document.body.firstChild);
                                    
                                    // Scroll to bottom
                                    logWin.scrollTo(0, logWin.document.body.scrollHeight);
                                }
                            }, 50);
                        })
                        .catch(function(err) {
                            if (logWin && logWin.document) {
                                logWin.document.body.innerHTML = "<div style='padding:20px; color:red;'>Fetch Error: " + err + "</div>";
                            }
                        });
                        
                    customMenu.style.display = 'none';
                }
            }
        }
    }
}, true);