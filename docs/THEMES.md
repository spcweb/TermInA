# Guida ai Temi di Termina

Termina offre un sistema di temi flessibile che ti permette di personalizzare completamente l'aspetto del terminale.

## 🎨 Temi Predefiniti

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
Una versione chiara per l'uso diurno.
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
Il tradizionale terminale verde su nero.
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
Colori neon per un look futuristico.
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

## 🛠️ Creazione Temi Personalizzati

### Tramite Interfaccia
1. Apri le impostazioni (`⌘,`)
2. Vai a "Aspetto"
3. Seleziona "Custom" come tema
4. Modifica i colori usando i selettori

### Tramite File di Configurazione
Edita `~/.termina/config.json`:

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

## 🎯 Proprietà dei Temi

| Proprietà | Descrizione | Esempio |
|-----------|-------------|---------|
| `background` | Colore di sfondo principale | `#1e2124` |
| `foreground` | Colore del testo | `#ffffff` |
| `cursor` | Colore del cursore | `#00d4aa` |
| `accent` | Colore degli accenti (AI, bordi) | `#00d4aa` |
| `border` | Colore dei bordi | `#36393f` |
| `selection` | Colore della selezione | `rgba(255,255,255,0.3)` |
| `backgroundBlur` | Abilita sfocatura sfondo | `true` |

## 🌈 Palette di Colori del Terminale

Puoi anche personalizzare i colori ANSI standard:

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

## 💡 Suggerimenti per i Temi

### Contrasto
- Assicurati che ci sia sufficiente contrasto tra testo e sfondo
- Usa strumenti come [WebAIM](https://webaim.org/resources/contrastchecker/) per verificare

### Colori AI
- Il colore `accent` viene usato per l'AI e gli elementi interattivi
- Scegli un colore che si distingua dal testo normale

### Accessibilità
- Evita combinazioni di colori problematiche per daltonici
- Testa il tema in diverse condizioni di illuminazione

### Performance
- I temi con trasparenza richiedono più risorse
- Disabilita `backgroundBlur` su sistemi meno potenti

## 📱 Temi Adattivi

Puoi creare temi che si adattano all'ora del giorno:

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

## 🎨 Galleria Temi Community

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

## 📦 Condivisione Temi

Per condividere un tema:

1. Esporta la configurazione del tema
2. Crea un file `.json` con il tema
3. Condividi il file con altri utenti
4. Importa tramite drag & drop nelle impostazioni (feature futura)

## 🔧 Debugging Temi

Se un tema non funziona:

1. Controlla la sintassi JSON
2. Verifica che tutti i colori siano validi (hex, rgb, rgba)
3. Riavvia Termina dopo le modifiche
4. Controlla i log della console per errori

---

**Suggerimento**: Usa il tema "Warp Dark" come base per i tuoi temi personalizzati!
