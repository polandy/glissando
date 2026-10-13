<p align="center">
  <picture>
    <source srcset="assets/brand/logo-stacked-dark.svg" media="(prefers-color-scheme: dark)">
    <img src="assets/brand/logo-stacked-light.svg" alt="Glissando" width="320">
  </picture>
</p>

Glissando turns your photos and a song or several into a beautiful slideshow — gliding Ken Burns
moves and smooth transitions, chosen for you. It is a web app you install like an app (PWA), made
for offline use: your pictures stay on your device, and no server or internet connection is
needed once it is installed.

**Status:** early development. What is planned, and in which order, is in
[`dev-docs/SCOPE.md`](dev-docs/SCOPE.md).

Runs in current Chrome, Edge, Firefox and Safari (including iPhone and iPad), in German and
English.

## Two ways to use it

|                    | On your device                                          | With your own server and Immich                                    |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------------------ |
| Get it             | open <https://polandy.github.io/glissando/>             | run the container next to Immich ([guide](docs/self-hosting.md))   |
| Needs              | nothing after the first load — works offline            | your server, reachable from your devices                           |
| Pictures from      | files on the device                                     | files on the device, or picked from Immich                         |
| Slideshows live    | in the browser on that one device                       | on the device, or on the server for every device at home           |
| Make, play, export | ✓ music, Ken Burns, transitions, video (MP4), HTML file | ✓ the same                                                         |
| Picture frame      | —                                                       | an Immich album, played endlessly                                  |
| Share by link      | —                                                       | anyone can watch in a browser                                      |
| TV remote          | —                                                       | show on the TV, control it from the phone                          |
| Your pictures      | never leave the device                                  | stay with your devices, server and Immich, unless you share a link |

## License

[MIT](LICENSE). The Baloo 2 font is licensed under the [SIL Open Font License 1.1](assets/fonts/OFL.txt).
