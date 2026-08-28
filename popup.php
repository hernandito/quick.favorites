<?php
$cfg_dir = "/boot/config/plugins/quick.favorites";
$json_file = "$cfg_dir/favorites.json";
$css_file = "$cfg_dir/custom.css";

// 1. Load and Group Data by Category
$favs = [];
$grouped_favs = [];

if (file_exists($json_file)) {
    $raw = json_decode(file_get_contents($json_file), true);
    if (is_array($raw)) {
        foreach ($raw as $key => $data) {
            if (is_string($data)) {
                $data = ['category' => 'General', 'label' => $data, 'icon' => 'fa-star', 'action' => '_self', 'path' => $key];
            } else {
                if (!isset($data['path'])) {
                    $data['path'] = $key;
                }
            }
            $cat = !empty($data['category']) ? $data['category'] : 'Uncategorized';
            if (!isset($grouped_favs[$cat])) { $grouped_favs[$cat] = []; }
            $grouped_favs[$cat][] = $data;
        }
    }
}

// 2. Load Appearance Settings
$appearance_file = "$cfg_dir/appearance.json";
$defaults = [
    'menu_title' => 'Quick Favorites',
    'icon_size' => '32',
    'bg_color' => '#1c1c1c',
    'header_color' => '#ffca28',
    'header_line' => '#333333',
    'section_title_color' => '#888888',
    'text_color' => '#e0e0e0',
    'grid_columns' => '4',
    'menu_width' => '480',
    'hover_color' => '#333333',
    'show_header' => 'yes'
];
$style = file_exists($appearance_file) ? array_merge($defaults, json_decode(file_get_contents($appearance_file), true)) : $defaults;
$custom_css = file_exists($css_file) ? file_get_contents($css_file) : '';
?>

<style>
    /* The emoji webfont is no longer pulled in with @import. An @import must be
       the first thing in a stylesheet and blocks that sheet from applying until
       the remote request finishes - which is what let the menu paint unstyled.
       favs.js now loads it as a normal <link> after the page has settled, and
       the stack below guarantees emoji render regardless. */

    #my-custom-fav-menu { 
        display: none; position: absolute; z-index: 99999; 
        border: 1px solid #444; border-radius: 8px; 
        box-shadow: 0 12px 30px rgba(0,0,0,0.8); 
        width: <?= htmlspecialchars($style['menu_width'] ?? '480') ?>px; 
        padding: 10px 20px; box-sizing: border-box; 
        background: <?= $style['bg_color'] ?> !important; 
		margin-top: 1px;
			
    }
    .qf-main-header { 
        font-weight: bold; margin-bottom: 15px; padding-bottom: 8px; 
        font-size: 14px; text-transform: uppercase; letter-spacing: 1px; text-align: left; 
        color: <?= $style['header_color'] ?> !important;
        border-bottom: 1px solid <?= $style['header_line'] ?> !important;
        <?php if (($style['show_header'] ?? 'yes') === 'no') echo 'display: none !important;'; ?>
    }
    .qf-section { margin-bottom: 4px; }
    .qf-section:last-child { margin-bottom: 0; }
    .qf-section-title { 
        font-size: 12px; margin-bottom: 0px; padding-bottom: 1px; 
        text-transform: uppercase; letter-spacing: 0.5px; 
        color: <?= $style['section_title_color'] ?> !important;
        border-bottom: 1px solid <?= $style['section_border_color'] ?> !important;
    }
    .qf-grid { 
        display: grid; grid-template-columns: repeat(<?= htmlspecialchars($style['grid_columns'] ?? '4') ?>, 1fr); 
        gap: 0px; justify-items: center; 
    }
    .qf-item { 
        display: flex; flex-direction: column; align-items: center; 
        text-decoration: none !important; padding: 10px 5px; border-radius: 6px; 
        transition: background 0.1s; text-align: center; width: 100%; box-sizing: border-box; 
    }
    .qf-item:hover { 
        background: <?= htmlspecialchars($style['hover_color'] ?? '#333333') ?> !important; 
        text-decoration: none !important; 
    }
    .qf-icon-fa { 
        margin-bottom: 8px; font-size: <?= $style['icon_size'] ?>px !important;
        color: <?= $style['icon_color'] ?> !important;
    }
    .qf-icon-img { 
        margin-bottom: 8px; width: <?= $style['icon_size'] ?>px !important;
        height: <?= $style['icon_size'] ?>px !important; object-fit: contain;
    }
    .qf-label { 
        font-size: 11px; line-height: 1.2; word-wrap: break-word; 
        color: <?= $style['label_color'] ?> !important;
    }
    <?= $custom_css ?>
</style>

<!-- display:none is inline on purpose. The <style> above begins with an
     external @import; while that import is loading the sheet can be applied
     late, and the menu would paint full-size for a frame. An inline style is
     honoured immediately, with no stylesheet involved. -->
<div id="my-custom-fav-menu" style="display:none">
    <div class="qf-main-header"><?= htmlspecialchars($style['menu_title']) ?></div>
    
    <?php if (empty($grouped_favs)): ?>
        <div style="color:#888; font-size:12px; padding:20px; text-align:center;">Add links in Settings > Quick Favorites</div>
    <?php else: ?>
        <?php foreach ($grouped_favs as $category => $items): ?>
            <div class="qf-section">
                <div class="qf-section-title"><?= htmlspecialchars($category) ?></div>
                <div class="qf-grid">
                    <?php foreach ($items as $item): 
                        $isScript = ($item['action'] === 'script_modal' || $item['action'] === 'script_background');
                        $href = $isScript ? '#' : htmlspecialchars($item['path']);
                    ?>
                        <a href="<?= $href ?>" 
                           data-action="<?= htmlspecialchars($item['action']) ?>" 
                           data-path="<?= htmlspecialchars($item['path']) ?>" 
                           class="qf-item">
                            <?php if (strpos($item['icon'], '/') !== false || strpos($item['icon'], '.') !== false): ?>
                                <img src="<?= htmlspecialchars($item['icon']) ?>" class="qf-icon-img">
                            <?php elseif (preg_match('/^[a-zA-Z0-9\-]+$/', $item['icon'])): ?>
                                <?php $fa = (strpos($item['icon'], 'fa-') === 0) ? $item['icon'] : 'fa-' . $item['icon']; ?>
                                <i class="fa <?= htmlspecialchars($fa) ?> qf-icon-fa"></i>
                            <?php else: ?>
								<span style="font-family: 'Noto Color Emoji','Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol','Android Emoji',EmojiSymbols,sans-serif; font-size: <?= htmlspecialchars($style['icon_size'] ?? '32') ?>px; line-height: 1; display: inline-block; vertical-align: middle; text-align: center; margin-bottom: 10px;"><?= htmlspecialchars($item['icon']) ?></span>
                            <?php endif; ?>
                            <span class="qf-label"><?= htmlspecialchars($item['label']) ?></span>
                        </a>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>