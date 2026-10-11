# Sizes

| Size (id)      | Fits within | Label (de / en)                                               |
| -------------- | ----------- | ------------------------------------------------------------- |
| Klein / Small  | 1280 × 720  | Zum Verschicken in einer Nachricht / For sending in a message |
| Scharf / Sharp | 1920 × 1080 | Für Rechner und Tablet / For a computer or tablet             |
| 4K             | 3840 × 2160 | Für den Fernseher / For the TV                                |

- Each picture is fitted within the size (`fitWithin`, long and short edge, never scaled up) and
  encoded as JPEG q 0.85. The stored display picture already fits within 3840 × 2160, so 4K takes
  its bytes as they are, and so does any size the stored picture already fits.
- The default is Small.
- The estimate beside a size is
  `(Σ picture bytes × min(1, fitted pixels / stored pixels) + song bytes + page bytes) × 4 / 3`,
  shown as "ca. 16 MB". "Page bytes" are the player bundle, font and markup.
- With 4K selected, a lemon note shows: "Zu groß für eine E-Mail. …"
