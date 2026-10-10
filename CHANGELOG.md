# Changelog

## 1.0.0 (2026-10-10)


### Features

* add picture captions, edited in the picture editor and drawn into the slide ([#11](https://github.com/polandy/glissando/issues/11)) ([5632a09](https://github.com/polandy/glissando/commit/5632a090fb8b7c4235155f49ed5dcb0fb464e99f))
* add pictures to an existing slideshow, from the device and from Immich ([#21](https://github.com/polandy/glissando/issues/21)) ([a985c28](https://github.com/polandy/glissando/commit/a985c2889f997ac89d1f87cbdb35c2d2d35ed014))
* add the slideshow JSON format and the WebGL2 player engine ([33fc47f](https://github.com/polandy/glissando/commit/33fc47fe33810a2c39f5daa52479d5404914af56))
* aim the automatic Ken Burns at faces found on the device ([#17](https://github.com/polandy/glissando/issues/17)) ([fc4567f](https://github.com/polandy/glissando/commit/fc4567fadbd867a3cde233a8b5bfe742e7c2479b))
* browse and pick Immich photos through the self-hosted Glissando ([#18](https://github.com/polandy/glissando/issues/18)) ([58d87b8](https://github.com/polandy/glissando/commit/58d87b8a0907c47a11cd2b4b29793b9787790e7b))
* choose one default transition for the whole slideshow ([#15](https://github.com/polandy/glissando/issues/15)) ([3f73221](https://github.com/polandy/glissando/commit/3f732214458fedee2552e94b82bab60c89b2f89f))
* export and import a slideshow as a .glissando file ([#8](https://github.com/polandy/glissando/issues/8)) ([05288cb](https://github.com/polandy/glissando/commit/05288cb4348c0539f1e9ac5713e8cfb74e2e4a32))
* give a picture its own Ken Burns motion in a picture editor ([#10](https://github.com/polandy/glissando/issues/10)) ([67a5ac7](https://github.com/polandy/glissando/commit/67a5ac7676937d4ee810e5d0867c03904fbb24ed))
* import pictures and music and play them as an automatic slideshow ([0dce0df](https://github.com/polandy/glissando/commit/0dce0df9bc06dedb11ad91d3a8d380a6987e9656))
* let chosen pictures be removed in the pictures step ([#29](https://github.com/polandy/glissando/issues/29)) ([dfd7bf9](https://github.com/polandy/glissando/commit/dfd7bf9555e25f4143ea3ece101f31f81fc2a154))
* make Glissando installable and fully offline ([#9](https://github.com/polandy/glissando/issues/9)) ([cb0b74b](https://github.com/polandy/glissando/commit/cb0b74b8325db4986e7f4f12143257f76e309bf4))
* open a .glissando file by double-click in the installed app ([#14](https://github.com/polandy/glissando/issues/14)) ([2f3f317](https://github.com/polandy/glissando/commit/2f3f3172149b40b99241d2c4f626ac696ef47e7e))
* paint an app shell before the app's script runs ([#16](https://github.com/polandy/glissando/issues/16)) ([2b84b0b](https://github.com/polandy/glissando/commit/2b84b0b773f25c93a229671cf4f3bab262a8a54a))
* play the glide start animation on first launch ([#2](https://github.com/polandy/glissando/issues/2)) ([3a796dc](https://github.com/polandy/glissando/commit/3a796dc443b0ee9526cd1e6bb6d46e78d43f3415))
* remove, reorder and rename pictures, and delete a slideshow ([#7](https://github.com/polandy/glissando/issues/7)) ([bfe58d1](https://github.com/polandy/glissando/commit/bfe58d158895110b530122560023197ef94945eb))
* save a slideshow as a web page that plays offline in any browser ([#22](https://github.com/polandy/glissando/issues/22)) ([495ac74](https://github.com/polandy/glissando/commit/495ac7428ac4ea14cdbb3d71eac4b4adeac9fed6))
* save a slideshow as an MP4 video, rendered frame by frame on the device ([#20](https://github.com/polandy/glissando/issues/20)) ([dd51f32](https://github.com/polandy/glissando/commit/dd51f321f32b8b3151fd147cdc427709cab50629))
* save slideshows on the Glissando server with photos linked from Immich ([#23](https://github.com/polandy/glissando/issues/23)) ([3850bd8](https://github.com/polandy/glissando/commit/3850bd82a3a10bf9a559c23a4c448d1bd5b3a2da))
* select several pictures and move them together, also by touch ([#24](https://github.com/polandy/glissando/issues/24)) ([78f624e](https://github.com/polandy/glissando/commit/78f624e9edf7d62676784790e048cde3bdf950da))
* set a picture's own duration and transition in the picture editor ([#12](https://github.com/polandy/glissando/issues/12)) ([24bb6f7](https://github.com/polandy/glissando/commit/24bb6f7230d95c9d00ee6b5a02ed50c8d4e84086))
* sort pictures added to an own-order slideshow in by capture date ([#26](https://github.com/polandy/glissando/issues/26)) ([7fcb100](https://github.com/polandy/glissando/commit/7fcb100ae557492fbcbc5d848a38b5f78d2db4f7))
* trim and fade the slideshow's music in a music editor ([#13](https://github.com/polandy/glissando/issues/13)) ([78897d2](https://github.com/polandy/glissando/commit/78897d2eafed1ebf929f62e55b82b5f054f1b0d8))


### Bug Fixes

* announce the exported page's start state only once Play is wired ([#28](https://github.com/polandy/glissando/issues/28)) ([49e7adb](https://github.com/polandy/glissando/commit/49e7adbd2c64b82660f6c8305d5aec15830007f1))
* keep the Ken Burns motion smooth through every picture ([#19](https://github.com/polandy/glissando/issues/19)) ([0fcb0d0](https://github.com/polandy/glissando/commit/0fcb0d0d38b1522bbb4e5ee77fe77dfbdfef4f32))
* keep the status of a library service that dies as the container stops ([#25](https://github.com/polandy/glissando/issues/25)) ([daf46a1](https://github.com/polandy/glissando/commit/daf46a1dda5f484c9af2ab3cfe6254446f9621b3))
