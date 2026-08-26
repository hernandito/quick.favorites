<?php
$rawScript = isset($_GET['script']) ? $_GET['script'] : '';
$script = basename($rawScript);

// Two possible locations for User Script logs in Unraid
$activeLog = "/tmp/user.scripts/tmpScripts/" . $script . "/log.txt";
$savedLog = "/boot/config/plugins/user.scripts/scripts/" . $script . "/log.txt";

if (empty($script)) {
    echo "ERROR: The script name passed to the API was blank.<br><br>";
    exit;
}

/**
 * Render a User Script log as HTML.
 *
 * A log is NOT trusted input. The script is written by the admin, but its
 * OUTPUT routinely carries bytes the admin never wrote - filenames from a
 * share, container names, the body of a curl'd API response. favs.js assigns
 * this response to innerHTML in the webGUI origin, so anything that survives
 * as live markup runs with the admin's session.
 *
 * strip_tags() is the wrong tool here: it filters tag NAMES and keeps every
 * ATTRIBUTE, so allowing <img> and <a> also allowed
 * <img src=x onerror=...> and <a href="javascript:...">.
 *
 * Escape first instead, so no raw '<' survives, then restore only exact
 * formatting tags matched by a strict pattern. Nothing attacker-supplied can
 * become an attribute, because attributes are re-introduced by this code
 * rather than carried over from the log.
 */
function qf_render_log($raw) {
    $out = htmlspecialchars($raw, ENT_QUOTES, 'UTF-8');

    // Attribute-free formatting tags, opening and closing.
    $out = preg_replace(
        '#&lt;(/?)(b|i|u|s|em|strong|br|p|div|span|font|hr|pre|code)\s*/?&gt;#i',
        '<$1$2>',
        $out
    );

    // The two coloured forms User Scripts actually emit. The value is
    // constrained to a named colour or a hex triplet, so it cannot carry a
    // quote, a space, or an event handler.
    $colour = '(?:[a-zA-Z]{3,20}|\#[0-9a-fA-F]{3}|\#[0-9a-fA-F]{6})';

    $out = preg_replace(
        '#&lt;font\s+color\s*=\s*(?:&quot;|&\#039;)?(' . $colour . ')(?:&quot;|&\#039;)?\s*&gt;#i',
        '<font color="$1">',
        $out
    );

    $out = preg_replace(
        '#&lt;span\s+style\s*=\s*(?:&quot;|&\#039;)?color\s*:\s*(' . $colour . ');?(?:&quot;|&\#039;)?\s*&gt;#i',
        '<span style="color:$1">',
        $out
    );

    return $out;
}

if (file_exists($activeLog)) {
    echo "<b>--- Active Run Log ---</b><br><br>";
    echo qf_render_log(file_get_contents($activeLog));
} elseif (file_exists($savedLog)) {
    echo "<b>--- Saved Log ---</b><br><br>";
    echo qf_render_log(file_get_contents($savedLog));
} else {
    echo "No log found for User Script: <b>" . htmlspecialchars($script) . "</b><br><br>";
}
?>
