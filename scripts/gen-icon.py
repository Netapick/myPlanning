"""Génère l'icône source 1024x1024 de myPlanning : le pictogramme "calendar"
de Lucide (https://lucide.dev/icons/calendar) sur fond bleu accent (#0052CC).

Reproduit fidèlement les tracés de calendar.mjs (Lucide, viewBox 24x24,
trait 2, coins arrondis) plutôt que d'en approximer la forme — la seule
source d'icônes utilisée par ce projet est Lucide, interface comme icône
d'application. Pillow n'a pas de rendu SVG natif, donc les tracés sont
redessinés directement au pixel avec les mêmes commandes.

Sert uniquement de source à `tauri icon`, qui en dérive tout le jeu de
tailles/formats (.ico, .png, .icns) ; ce script n'a pas vocation à être
relancé, seul `icons/icon.png` compte.
"""
from PIL import Image, ImageDraw

SIZE = 1024
BLUE = (0, 82, 204, 255)   # --accent
WHITE = (255, 255, 255, 255)

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Fond arrondi façon icône d'app Windows moderne.
draw.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=220, fill=BLUE)

# Le pictogramme Lucide "calendar" est dessiné sur une grille 24x24 avec un
# trait de largeur 2. On le met à l'échelle et on le centre.
SCALE = 30
OFFSET = 152
STROKE = round(2 * SCALE * 0.8)  # trait légèrement affiné pour rester net à cette taille

def pt(x, y):
    return (OFFSET + x * SCALE, OFFSET + y * SCALE)

# path d="M8 2v3" — anneau de reliure gauche
draw.line([pt(8, 2), pt(8, 5)], fill=WHITE, width=STROKE, joint="curve")
# path d="M16 2v3" — anneau de reliure droit
draw.line([pt(16, 2), pt(16, 5)], fill=WHITE, width=STROKE, joint="curve")
# rect x=3 y=3 width=18 height=18 rx=2 — corps du calendrier
draw.rounded_rectangle(
    [pt(3, 3), pt(21, 21)],
    radius=2 * SCALE * 0.28,
    outline=WHITE,
    width=STROKE,
)
# path d="M3 9h18" — bandeau séparant l'en-tête de la grille des jours
draw.line([pt(3, 9), pt(21, 9)], fill=WHITE, width=STROKE, joint="curve")

# Extrémités arrondies (stroke-linecap="round") sur les deux traits de reliure.
for x in (8, 16):
    for y in (2, 5):
        cx, cy = pt(x, y)
        r = STROKE / 2
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE)

img.save("src-tauri/icons/icon.png")
print("OK -> src-tauri/icons/icon.png")
