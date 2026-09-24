import os
import re

dist_html_path = r"C:\Users\Admin\.gemini\antigravity-ide\scratch\garden-experience\dist\index.html"
with open(dist_html_path, "r", encoding="utf-8") as f:
    content = f.read()

checks = {
    "btnQuickThemeToggle": "btnQuickThemeToggle" in content,
    "cfg-appearance": "cfg-appearance" in content,
    "themeRadioLight": "themeRadioLight" in content,
    "themeRadioDark": "themeRadioDark" in content,
    "themeRadioSystem": "themeRadioSystem" in content,
    "brandHomeLink": "brandHomeLink" in content
}

print("DIST HTML VERIFICATION RESULTS:")
for k, v in checks.items():
    print(f"  {k}: {'PASS' if v else 'FAIL'}")

src_js_path = r"C:\Users\Admin\.gemini\antigravity-ide\scratch\garden-experience\src\main.js"
with open(src_js_path, "r", encoding="utf-8") as f:
    js_content = f.read()

js_checks = {
    "initTheme": "function initTheme" in js_content,
    "setThemeMode": "function setThemeMode" in js_content,
    "applyResolvedTheme": "function applyResolvedTheme" in js_content,
    "btnQuickAssign": "btnQuickAssign" in js_content,
    "btnQuickResolve": "btnQuickResolve" in js_content,
    "btnQuickWhatsapp": "btnQuickWhatsapp" in js_content,
    "btnQuickEmail": "btnQuickEmail" in js_content,
    "btnQuickInternalNote": "btnQuickInternalNote" in js_content,
    "localStorage persistence": "localStorage.setItem('garden_theme_mode'" in js_content
}

print("\nSRC JS VERIFICATION RESULTS:")
for k, v in js_checks.items():
    print(f"  {k}: {'PASS' if v else 'FAIL'}")
