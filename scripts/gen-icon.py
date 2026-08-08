"""Génère l'icône source 1024x1024 de myPlanning : un calendrier stylisé sur
fond bleu accent (#0052CC), cohérent avec le pictogramme de la barre latérale
(components/layout/SideNav.tsx). Sert uniquement de source à `tauri icon`,
qui en dérive ensuite tout le jeu de tailles/formats (.ico, .png, .icns) ;
ce script n'a pas vocation à être relancé, seul `icons/icon.png` compte.
"""
from PIL import Image, ImageDraw

SIZE = 1024
BLUE = (0, 82, 204, 255)      # --accent
WHITE = (255, 255, 255, 255)

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Fond arrondi façon icône d'app Windows moderne.
radius = 220
draw.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=radius, fill=BLUE)

# Corps du calendrier (rectangle blanc, coins arrondis).
margin_x = 210
top = 260
bottom = 820
draw.rounded_rectangle([margin_x, top, SIZE - margin_x, bottom], radius=48, fill=WHITE)

# Bandeau supérieur (légèrement plus sombre) façon en-tête de calendrier.
header_h = 130
draw.rounded_rectangle(
    [margin_x, top, SIZE - margin_x, top + header_h],
    radius=48,
    fill=BLUE,
)
# Carré pour masquer l'arrondi bas du bandeau (on ne veut arrondi qu'en haut).
draw.rectangle([margin_x, top + header_h - 48, SIZE - margin_x, top + header_h], fill=BLUE)

# Deux anneaux de reliure.
ring_w = 28
ring_h = 90
ring_y = top - ring_h // 2
for cx in (margin_x + 130, SIZE - margin_x - 130):
    draw.rounded_rectangle(
        [cx - ring_w // 2, ring_y, cx + ring_w // 2, ring_y + ring_h],
        radius=ring_w // 2,
        fill=BLUE,
    )

# Grille de "jours" (3x3 petits carrés bleus) sous le bandeau.
grid_top = top + header_h + 60
cell = 90
gap = 40
grid_w = 3 * cell + 2 * gap
start_x = (SIZE - grid_w) // 2
for row in range(3):
    for col in range(3):
        x0 = start_x + col * (cell + gap)
        y0 = grid_top + row * (cell + gap)
        draw.rounded_rectangle([x0, y0, x0 + cell, y0 + cell], radius=16, fill=BLUE)

img.save("src-tauri/icons/icon.png")
print("OK -> src-tauri/icons/icon.png")
