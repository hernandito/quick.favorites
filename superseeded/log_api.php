<?php
$rawScript = isset($_GET['script']) ? $_GET['script'] : '';
$script = basename($rawScript);

// Two possible locations for User Script logs in Unraid
$activeLog = "/tmp/user.scripts/tmpScripts/" . $script . "/log.txt";
$savedLog = "/boot/config/plugins/user.scripts/scripts/" . $script . "/log.txt";

if (empty($script)) {
    echo "ERROR: The script name passed to the API was blank.<br><br>";
    echo "Fix: Go to your Quick Favorites settings and ensure the 'URL / Path' box for this favorite contains the EXACT name of your User Script.";
    exit;
}

// SECURITY FIX: Whitelist only safe formatting tags. Strips out <script>, <iframe>, etc.
$allowed_tags = '<span><font><b><i><u><br><p><div><hr><a><img>';

if (file_exists($activeLog)) {
    echo "<b>--- Active Run Log ---</b><br><br>";
    // Output the log using the security whitelist
    echo strip_tags(file_get_contents($activeLog), $allowed_tags);
} elseif (file_exists($savedLog)) {
    echo "<b>--- Saved Log ---</b><br><br>";
    // Output the log using the security whitelist
    echo strip_tags(file_get_contents($savedLog), $allowed_tags);
} else {
    echo "No log found for User Script: <b>" . htmlspecialchars($script) . "</b><br><br>";
    echo "Paths checked:<br>";
    echo "1. " . htmlspecialchars($activeLog) . "<br>";
    echo "2. " . htmlspecialchars($savedLog) . "<br><br>";
    echo "Note: The name above must exactly match the folder name of your script in the User Scripts plugin.";
}
?>