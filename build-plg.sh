#!/bin/bash
#
# build-plg.sh - prepare quick.favorites.plg for a release
#
# Run this in your repo folder BEFORE you commit and push. It does two jobs:
#
#   1. Bumps <!ENTITY version> to today's date with a letter suffix, so Unraid's
#      Plugins page actually offers the update. Unraid compares versions with a
#      plain strcmp(), so the new value must sort AFTER the old one.
#
#   2. Writes an <MD5> tag into every <FILE> block, matching the real file on
#      disk. Unraid checks this hash against the file already installed: if it
#      differs, it deletes the old copy and downloads fresh. If it matches, the
#      download is skipped as unnecessary. That makes upgrades self-correcting.
#
# Usage:
#     cd /mnt/cache/appdata/github-desktop/Repositories/quick.favorites
#     bash build-plg.sh
#     ...then commit and push in GitHub Desktop.
#
# IMPORTANT: run this AFTER you finish editing the other files. If you change
# QuickFavorites.page after running it, the stored MD5 is stale - just run it
# again. Re-running is always safe.
#

set -euo pipefail

PLG="quick.favorites.plg"

if [[ ! -f "$PLG" ]]; then
    echo "ERROR: $PLG not found. Run this from inside the repo folder."
    exit 1
fi

# ---- 1. Work out the next version -------------------------------------------
CURRENT=$(grep -oP '<!ENTITY version\s+"\K[^"]+' "$PLG")
TODAY=$(date +%Y.%m.%d)

if [[ "$CURRENT" == "$TODAY"* ]]; then
    # Same day: advance the letter suffix a -> b -> c ...
    SUFFIX="${CURRENT#$TODAY}"
    if [[ -z "$SUFFIX" ]]; then
        NEXT="${TODAY}a"
    else
        NEXT="${TODAY}$(echo "$SUFFIX" | tr 'a-y' 'b-z')"
    fi
else
    NEXT="${TODAY}a"
fi

# Safety: Unraid uses strcmp, so the new string must sort after the old one.
if [[ ! "$NEXT" > "$CURRENT" ]]; then
    echo "ERROR: new version '$NEXT' does not sort after current '$CURRENT'."
    echo "       Unraid would treat this as a downgrade and skip the update."
    exit 1
fi

# ---- 2. Rewrite version + MD5 tags ------------------------------------------
python3 - "$PLG" "$NEXT" <<'PYEOF'
import hashlib, os, re, sys

plg, new_version = sys.argv[1], sys.argv[2]
text = open(plg, encoding='utf-8').read()

text = re.sub(r'(<!ENTITY version\s+")[^"]+(">)', r'\g<1>' + new_version + r'\g<2>', text, count=1)

# Resolve the entities used inside <URL> so we can map a URL back to a local file
ents = dict(re.findall(r'<!ENTITY\s+(\w+)\s+"([^"]*)">', text))
def expand(s):
    for _ in range(5):
        s = re.sub(r'&(\w+);', lambda m: ents.get(m.group(1), m.group(0)), s)
    return s

updated, missing, crlf_fixed = [], [], []

def handle(block):
    m = re.search(r'<URL>(.*?)</URL>', block, re.S)
    if not m:
        return block
    local = os.path.basename(expand(m.group(1)).strip())
    if not os.path.isfile(local):
        missing.append(local)
        return block
    raw = open(local, 'rb').read()
    # Hash the bytes GIT WILL STORE, not the bytes on disk. .gitattributes
    # `* text=auto` normalises CRLF -> LF on commit, so a CRLF working copy
    # would otherwise be hashed one way and served from GitHub another - and
    # Unraid then aborts the install with "bad file MD5".
    if b'\x00' not in raw:                       # treat as text, not binary
        normalised = raw.replace(b'\r\n', b'\n')
        if normalised != raw:
            crlf_fixed.append(local)
            open(local, 'wb').write(normalised)   # fix the working copy too
            raw = normalised
    digest = hashlib.md5(raw).hexdigest()
    updated.append((local, digest))
    block = re.sub(r'\s*<MD5>.*?</MD5>', '', block, flags=re.S)   # drop any old tag
    return block.replace('</URL>', '</URL>\n  <MD5>' + digest + '</MD5>')

text = re.sub(r'<FILE\b.*?</FILE>', lambda m: handle(m.group(0)), text, flags=re.S)
open(plg, 'w', encoding='utf-8').write(text)

print("  version -> " + new_version + "\n")
for name, digest in updated:
    print("  {:<28} {}".format(name, digest))
if crlf_fixed:
    print("\n  Converted CRLF -> LF (and hashed the LF form): " + ", ".join(crlf_fixed))
if missing:
    print("\n  WARNING: no local file found for: " + ", ".join(missing))
    print("  Those <FILE> blocks were left without an MD5.")
PYEOF

echo
echo "Done. Now commit and push in GitHub Desktop, then use Check for Updates."
