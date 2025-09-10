# Termina Themes Guide

Termina offers a flexible theming system that lets you fully customize the terminal's appearance.

## 🎨 Built-in Themes

### Warp Dark (Default)
Il tema principale ispirato a Warp Terminal.
```json
{
  "name": "warp-dark",
  "background": "#1e2124",
  "foreground": "#ffffff",
  "cursor": "#00d4aa",
  "accent": "#00d4aa",
  "border": "#36393f"
}
```

### Warp Light
A light variant for daytime use.
```json
{
  "name": "warp-light", 
  "background": "#ffffff",
  "foreground": "#000000",
  "cursor": "#007acc",
  "accent": "#007acc",
  "border": "#e1e4e8"
}
```

### Terminal Classic
The traditional green-on-black terminal.
```json
{
  "name": "terminal-classic",
  "background": "#000000",
  "foreground": "#00ff00", 
  "cursor": "#00ff00",
  "accent": "#00ff00",
  "border": "#333333"
}
```

### Cyberpunk
Neon colors for a futuristic look.
```json
{
  "name": "cyberpunk",
  "background": "#0a0a0a",
  "foreground": "#ff0080",
  "cursor": "#00ffff", 
  "accent": "#00ffff",
  "border": "#2d0b4f"
}
```

## 🛠️ Creating Custom Themes

### Through the UI
1. Open Settings (`⌘,`)
2. Go to "Appearance"
3. Select "Custom" as the theme
4. Adjust colors using the pickers

### Through Configuration File
Edit `~/.termina/config.json`:

```json
{
  "theme": {
    "name": "mio-tema",
    "background": "#1a1a2e",
    "foreground": "#e94560", 
    "cursor": "#f5f5f5",
    "accent": "#0f3460",
    "border": "#16213e",
    "backgroundBlur": true,
    "selection": "rgba(233, 69, 96, 0.3)",
    "tabBackground": "#16213e",
    "tabActive": "#0f3460"
  }
}
```

## 🎯 Theme Properties

| Property | Description | Example |
|----------|-------------|---------|
| `background` | Main background color | `#1e2124` |
| `foreground` | Text color | `#ffffff` |
| `cursor` | Cursor color | `#00d4aa` |
| `accent` | Accent color (AI, borders) | `#00d4aa` |
| `border` | Border color | `#36393f` |
| `selection` | Selection color | `rgba(255,255,255,0.3)` |
| `backgroundBlur` | Enable background blur | `true` |

## 🌈 Terminal Color Palette

You can also customize the standard ANSI colors:

```json
{
  "theme": {
    "colors": {
      "black": "#000000",
      "red": "#ff6b6b", 
      "green": "#51cf66",
      "yellow": "#ffd43b",
      "blue": "#339af0",
      "magenta": "#f06292",
      "cyan": "#22d3ee",
      "white": "#ffffff",
      "brightBlack": "#6c757d",
      "brightRed": "#ff8a80",
      "brightGreen": "#69db7c", 
      "brightYellow": "#ffe066",
      "brightBlue": "#4dabf7",
      "brightMagenta": "#f48fb1",
      "brightCyan": "#67e8f9",
      "brightWhite": "#ffffff"
    }
  }
}
```

## 💡 Theme Tips

### Contrast
- Ensure sufficient contrast between text and background
- Use tools like [WebAIM](https://webaim.org/resources/contrastchecker/) to verify

### AI Colors
- The `accent` color is used for AI and interactive elements
- Choose a color that stands out from normal text

### Accessibility
- Avoid color combinations that are problematic for color blindness
- Test the theme in various lighting conditions

### Performance
- Themes with transparency require more resources
- Disable `backgroundBlur` on lower-end systems

## 📱 Adaptive Themes

You can create themes that adapt to time of day:

```json
{
  "theme": {
    "adaptive": true,
    "light": {
      "background": "#ffffff",
      "foreground": "#000000"
    },
    "dark": { 
      "background": "#1e2124",
      "foreground": "#ffffff"
    }
  }
}
```

## 🎨 Community Theme Gallery

### Dracula
```json
{
  "name": "dracula",
  "background": "#282a36",
  "foreground": "#f8f8f2",
  "cursor": "#f8f8f0",
  "accent": "#bd93f9"
}
```

### Nord
```json
{
  "name": "nord",
  "background": "#2e3440", 
  "foreground": "#d8dee9",
  "cursor": "#d8dee9",
  "accent": "#88c0d0"
}
```

### Gruvbox
```json
{
  "name": "gruvbox",
  "background": "#282828",
  "foreground": "#ebdbb2", 
  "cursor": "#ebdbb2",
  "accent": "#fe8019"
}
```

### One Dark
```json
{
  "name": "one-dark",
  "background": "#1e2127",
  "foreground": "#abb2bf",
  "cursor": "#528bff", 
  "accent": "#61afef"
}
```

## 📦 Sharing Themes

To share a theme:

1. Export the theme configuration
2. Create a `.json` file with the theme
3. Share the file with others
4. Import via drag & drop in settings (future feature)

## 🧯 Theme Debugging

If a theme doesn't work:

1. Check JSON syntax
2. Verify all colors are valid (hex, rgb, rgba)
3. Restart Termina after changes
4. Check console logs for errors

---

**Tip**: Use the "Warp Dark" theme as a base for your custom themes!
