#!/bin/bash
DEST="/usr/local/emhttp/plugins/quick.favorites"
SOURCE="/mnt/cache/appdata/fav-plugin-dev/rescue/webgui"

# 1. Create destination and copy our files
mkdir -p $DEST
cp -rv $SOURCE/* $DEST/

# Set proper unRAID permissions
chown -R root:root $DEST
chmod -R 755 $DEST

# 2. Clean up any previous injections so we don't get duplicates
sed -i '/quick.favorites/d' /usr/local/emhttp/webGui/template.php
sed -i '/quick.favorites/d' /usr/local/emhttp/plugins/dynamix/template.php

# 3. Global Injection
# This wrapper ensures unRAID actually processes the PHP inside our overlay file
echo '<?php include "/usr/local/emhttp/plugins/quick.favorites/quick.favorites.page"; ?>' > $DEST/include.php

# Inject the wrapper and the Javascript into the BOTTOM of the Dynamix template
echo '<?php include "/usr/local/emhttp/plugins/quick.favorites/include.php"; ?>' >> /usr/local/emhttp/plugins/dynamix/template.php
echo '<script src="/plugins/quick.favorites/favs.js"></script>' >> /usr/local/emhttp/plugins/dynamix/template.php

echo "----------------------------------------"
echo "Deployment Complete!"