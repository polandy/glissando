# Sizes

| Size (id), shared name | Fits within | Use (de / en)                                                       |
| ---------------------- | ----------- | ------------------------------------------------------------------- |
| `small`, Klein / Small | 1280 × 720  | Zum Verschicken in einer Nachricht / For sending in a message       |
| `sharp`, Standard      | 1920 × 1080 | Full HD, für Rechner und Tablet / Full HD, for a computer or tablet |
| `4k`, Groß / Large     | 3840 × 2160 | 4K, für den Fernseher / 4K, for the TV                              |

The names come from the shared `sizeScale.*` keys, the same as in the video sheet.

- Each picture is fitted within the size (`fitWithin`, long and short edge, never scaled up) and
  encoded as JPEG q 0.85. The stored display picture already fits within 3840 × 2160, so 4K takes
  its bytes as they are, and so does any size the stored picture already fits.
- The default is Small.
- The estimate beside a size is
  `(Σ picture bytes × min(1, fitted pixels / stored pixels) + song bytes + clip bytes + page bytes) × 4 / 3`,
  shown as "ca. 16 MB". Clip bytes are each distinct clip's file, counted whole at every size. "Page bytes" are the player bundle, font and markup.
- With 4K selected, a lemon note shows: "Zu groß für eine E-Mail. …"
