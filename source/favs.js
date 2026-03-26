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

                if (action === '_blank') {
                    window.open(path, '_blank');
                    customMenu.style.display = 'none';
                } else if (action === '_self') {
                    window.location.href = path;
                } else if (action === 'script_modal') {
                    openTerminal('run_script', 'user.scripts', path);
                    customMenu.style.display = 'none';
                } else if (action === 'script_background') {
                    $.post('/plugins/user.scripts/exec.php', { action: 'background', script: path, csrf_token: token });
                    customMenu.style.display = 'none';
                } else if (action === 'script_log') {
                    // 1. Open a blank Unraid terminal window first
                    var logWin = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
                    
                    // Path updated to quick.favorites
                    $.post('/plugins/quick.favorites/log_api.php', { 
                        path: path, 
                        csrf_token: token 
                    }, function(logData) {
                        
                        var checkReady = setInterval(function() {
                            if (logWin && logWin.document && logWin.document.readyState === 'complete') {
                                clearInterval(checkReady);
                                
                                var contentDiv = logWin.document.createElement('div');
                                contentDiv.style.whiteSpace = 'pre-wrap';
                                contentDiv.style.marginBottom = '20px';
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