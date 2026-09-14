"""Visual theme and Qt StyleSheets (QSS) for VisionX AI (Modern Black / Charcoal / Graphite)."""

# VisionX AI Modern Black / Charcoal / Dark Graphite Color Palette
BG_PRIMARY = "#080A0D"        # Deepest dark background
BG_SECONDARY = "#0D1117"      # Elevated panel/sidebar background
BG_CARD = "#11161D"           # Standard container card
BG_CARD_ELEVATED = "#161C24"  # Highlighted/interactive card
BORDER_COLOR = "#252C35"      # Subtle graphite border
BORDER_SUBTLE = "#1C232B"     # Faint boundary

# Restrained Gold Accent (used sparingly for active states, indicators, focus)
GOLD_ACCENT = "#D4AF37"
GOLD_HOVER = "#E5C158"
GOLD_MUTED = "rgba(212, 175, 55, 0.15)"

# Professional Typographic Hierarchy
TEXT_PRIMARY = "#F4F6F8"      # Crisp bright white
TEXT_SECONDARY = "#9AA4AF"    # Slate gray
TEXT_MUTED = "#68727D"        # Dim graphite

# Functional State Colors
SUCCESS = "#10B981"
WARNING = "#F59E0B"
DANGER = "#EF4444"
INFO = "#3B82F6"

GLOBAL_QSS = f"""
QMainWindow {{
    background-color: {BG_PRIMARY};
    color: {TEXT_PRIMARY};
}}

QWidget {{
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
    color: {TEXT_PRIMARY};
    font-size: 13px;
}}

/* Sidebar */
#Sidebar {{
    background-color: {BG_SECONDARY};
    border-right: 1px solid {BORDER_COLOR};
    min-width: 220px;
    max-width: 220px;
}}

#SidebarBrand {{
    font-size: 17px;
    font-weight: 800;
    letter-spacing: 1.5px;
    color: {TEXT_PRIMARY};
    padding: 16px 16px 2px 16px;
}}

#SidebarSubtitle {{
    font-size: 11px;
    color: {TEXT_MUTED};
    padding: 0px 16px 16px 16px;
    border-bottom: 1px solid {BORDER_COLOR};
}}

/* Navigation Buttons */
QPushButton.nav-button {{
    background-color: transparent;
    color: {TEXT_SECONDARY};
    border: none;
    border-left: 2px solid transparent;
    text-align: left;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 500;
}}

QPushButton.nav-button:hover {{
    background-color: {BG_CARD};
    color: {TEXT_PRIMARY};
}}

QPushButton.nav-button:checked {{
    background-color: {BG_CARD_ELEVATED};
    color: {GOLD_ACCENT};
    border-left: 2px solid {GOLD_ACCENT};
    font-weight: 600;
}}

/* Cards and Panels */
QFrame.card {{
    background-color: {BG_CARD};
    border: 1px solid {BORDER_COLOR};
    border-radius: 6px;
    padding: 12px;
}}

QFrame.panel {{
    background-color: {BG_SECONDARY};
    border: 1px solid {BORDER_COLOR};
    border-radius: 6px;
}}

/* Primary Buttons */
QPushButton.btn-primary {{
    background-color: {GOLD_ACCENT};
    color: #080A0D;
    font-weight: 700;
    border-radius: 5px;
    padding: 7px 14px;
    border: none;
}}

QPushButton.btn-primary:hover {{
    background-color: {GOLD_HOVER};
}}

/* Secondary Buttons */
QPushButton.btn-secondary {{
    background-color: {BG_CARD_ELEVATED};
    color: {TEXT_PRIMARY};
    border: 1px solid {BORDER_COLOR};
    border-radius: 5px;
    padding: 7px 14px;
}}

QPushButton.btn-secondary:hover {{
    background-color: #1C232B;
    border-color: {GOLD_ACCENT};
}}

/* Compact Segmented Filter Buttons */
QPushButton.btn-filter {{
    background-color: {BG_SECONDARY};
    color: {TEXT_SECONDARY};
    border: 1px solid {BORDER_COLOR};
    border-radius: 4px;
    padding: 5px 12px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
}}

QPushButton.btn-filter:hover {{
    background-color: {BG_CARD};
    color: {TEXT_PRIMARY};
}}

QPushButton.btn-filter:checked {{
    background-color: {BG_CARD_ELEVATED};
    color: {GOLD_ACCENT};
    border-color: {GOLD_ACCENT};
}}

/* Inputs & Combos */
QLineEdit, QComboBox, QSpinBox, QDoubleSpinBox {{
    background-color: {BG_PRIMARY};
    border: 1px solid {BORDER_COLOR};
    border-radius: 4px;
    padding: 6px 10px;
    color: {TEXT_PRIMARY};
    font-size: 12px;
}}

QLineEdit:focus, QComboBox:focus {{
    border-color: {GOLD_ACCENT};
}}

/* Scrollbars */
QScrollBar:vertical {{
    background: {BG_PRIMARY};
    width: 6px;
    margin: 0px;
}}

QScrollBar::handle:vertical {{
    background: {BORDER_COLOR};
    border-radius: 3px;
    min-height: 20px;
}}

QScrollBar::handle:vertical:hover {{
    background: {GOLD_ACCENT};
}}
"""
