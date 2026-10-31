# Changelog

## [0.0.13](https://github.com/polandy/glissando/compare/glissando-v0.0.12...glissando-v0.0.13) (2026-10-31)


### Bug Fixes

* **copy:** sweep the catalogues and user guide against the glossary ([#158](https://github.com/polandy/glissando/issues/158)) ([60bf5b6](https://github.com/polandy/glissando/commit/60bf5b645b5bd9c810d424d879ee4ff3a78b729b))
* **ux:** browser-back guard for selections and header crumbs as links ([#161](https://github.com/polandy/glissando/issues/161)) ([c949e33](https://github.com/polandy/glissando/commit/c949e33ec372e4d06702cb63b202d6bd0d145045))
* **ux:** undo for removals, loading labels, route skeletons, phone search label ([#160](https://github.com/polandy/glissando/issues/160)) ([74cf6f2](https://github.com/polandy/glissando/commit/74cf6f28116cfc7f6f6abd00097296244c8f90c5))

## [0.0.12](https://github.com/polandy/glissando/compare/glissando-v0.0.11...glissando-v0.0.12) (2026-10-31)


### Features

* fit the pictures to a shorter music, or repeat it on a tap ([#131](https://github.com/polandy/glissando/issues/131)) ([bd3e3d6](https://github.com/polandy/glissando/commit/bd3e3d68c126adaf1f2f163f9fd43caf6027fc9a))
* gather sharing in one Share button ([#144](https://github.com/polandy/glissando/issues/144)) ([be2129d](https://github.com/polandy/glissando/commit/be2129d870992afe7ee2e50d2e9ae8136869e4e6))
* give each slideshow action one way in ([#143](https://github.com/polandy/glissando/issues/143)) ([88aac38](https://github.com/polandy/glissando/commit/88aac38fa11d5f4e4dbe1010dac4c188e3b01df9))
* insert trip chapters at each change of place in a slideshow ([#124](https://github.com/polandy/glissando/issues/124)) ([79752ec](https://github.com/polandy/glissando/commit/79752ec32fbe7c7540b83d2e156d8e07d7d7edd4))
* offer looks for a slideshow ([#125](https://github.com/polandy/glissando/issues/125)) ([340ee03](https://github.com/polandy/glissando/commit/340ee038e5a300789ce09028943f4a787e7f1b9c))
* pace the slideshow by the music's energy ([#127](https://github.com/polandy/glissando/issues/127)) ([32d80ba](https://github.com/polandy/glissando/commit/32d80ba37fdaa1df0a2cea986c01d7621779aac3))
* pick a mood for a slideshow instead of single settings ([#126](https://github.com/polandy/glissando/issues/126)) ([93ca041](https://github.com/polandy/glissando/commit/93ca0418d49e5d1a6e87f5f47ff3ab38a537a5e8))
* show mood, look and music up front in the slideshow's details ([#133](https://github.com/polandy/glissando/issues/133)) ([7418615](https://github.com/polandy/glissando/commit/7418615d9c567ec48055c9f5ec398a299f2aa7b5))
* show one view at a time in the picture editor on a phone ([#150](https://github.com/polandy/glissando/issues/150)) ([f3901e1](https://github.com/polandy/glissando/commit/f3901e1bd6992167fe6b174d7e6bcbeb5e0fce4c))
* show the music editor simple first, details on demand ([#151](https://github.com/polandy/glissando/issues/151)) ([115e3d3](https://github.com/polandy/glissando/commit/115e3d31a53cfa1b51d196cc87193bcc834c1637))
* show the running faces-and-subjects search in the header ([#152](https://github.com/polandy/glissando/issues/152)) ([ff5c4d8](https://github.com/polandy/glissando/commit/ff5c4d8dbd155145c3f76e9c53ff4ad51caa6921))
* slim the selection bar to icons whose labels show in a bubble ([#142](https://github.com/polandy/glissando/issues/142)) ([2034d8b](https://github.com/polandy/glissando/commit/2034d8b5e40119d8650988bb51134b9c0e409672))
* start a new slideshow on Calm, preview the mood at once ([#134](https://github.com/polandy/glissando/issues/134)) ([a826530](https://github.com/polandy/glissando/commit/a826530d87e1587f5584c7d1b30ada907c240eaa))
* take the picture length out of the import's music step ([#135](https://github.com/polandy/glissando/issues/135)) ([1090e2a](https://github.com/polandy/glissando/commit/1090e2a36452702a9cb754c33eb6bf126937d32b))


### Bug Fixes

* end a video slide where its clip's picture ends ([#156](https://github.com/polandy/glissando/issues/156)) ([f26cfbe](https://github.com/polandy/glissando/commit/f26cfbe9d42b3b541ed057a93bc2268209ed4318))
* end the created toast once the slideshow screen is left ([#138](https://github.com/polandy/glissando/issues/138)) ([30f17ac](https://github.com/polandy/glissando/commit/30f17ac82e5e56c58fcbe217b47791b0273b857d))
* give the sample-music tiles' title and mood room below the cover ([#149](https://github.com/polandy/glissando/issues/149)) ([d3f2d2f](https://github.com/polandy/glissando/commit/d3f2d2f13cdadacdcaf5ef31c0363f86ff049e1d))
* give the strip head's buttons their own row on a phone ([96b2dad](https://github.com/polandy/glissando/commit/96b2dad528651fac99a81e69240a467c7e26bcb2))
* keep a video slide's picture moving until its slide ends ([#155](https://github.com/polandy/glissando/issues/155)) ([e11d3c2](https://github.com/polandy/glissando/commit/e11d3c2cbe56c1162b18d096a508c128960e1576))
* keep the Automatic chapters switch in the slideshow's settings only ([#141](https://github.com/polandy/glissando/issues/141)) ([c1fe3b5](https://github.com/polandy/glissando/commit/c1fe3b5608872fd3e6752f0e6c71c32360787d87))
* make E2E-047 deterministic under CPU load ([#129](https://github.com/polandy/glissando/issues/129)) ([1cd64a1](https://github.com/polandy/glissando/commit/1cd64a159e1b15e3854d25df8875633e69939f40))
* make E2E-059 deterministic under CPU load ([#128](https://github.com/polandy/glissando/issues/128)) ([bdca286](https://github.com/polandy/glissando/commit/bdca28693617734b35d01c67a18974ef79f4977e))
* map each slide to its own picture in the player ([#136](https://github.com/polandy/glissando/issues/136)) ([41a12bc](https://github.com/polandy/glissando/commit/41a12bc5df6edfa7ac5094d04ccf39d623c0f77a))
* name the ⋯ menu's focus entry in user language, drop its progress line ([417882f](https://github.com/polandy/glissando/commit/417882f7f34edcabc17f69d1d282f8413cd939a5))
* open a song's audio in the music editor only at the first listen ([#146](https://github.com/polandy/glissando/issues/146)) ([bdd9eb5](https://github.com/polandy/glissando/commit/bdd9eb5f61cd2a3e01c0bd7d454ff6503b371305))
* open no audio in the Mood sheet's silent preview ([#145](https://github.com/polandy/glissando/issues/145)) ([d778915](https://github.com/polandy/glissando/commit/d77891586dd595fba1391db6634267ba2248ba19))
* say pictures with their own duration stay about that long when pictures are added ([#122](https://github.com/polandy/glissando/issues/122)) ([b919939](https://github.com/polandy/glissando/commit/b91993999b60eb767b97a56a95fbba2dd3a3953a))
* set labels in the text font, not Geist Mono ([#137](https://github.com/polandy/glissando/issues/137)) ([a3d42f4](https://github.com/polandy/glissando/commit/a3d42f4098229087c45665a32883f913f2c4a2c6))
* stop the title slide repeating its title ([#132](https://github.com/polandy/glissando/issues/132)) ([c0d2ca7](https://github.com/polandy/glissando/commit/c0d2ca7ee3064f9fda317a31f31e0fe978fb972f))

## [0.0.11](https://github.com/polandy/glissando/compare/glissando-v0.0.10...glissando-v0.0.11) (2026-10-22)


### Features

* offer View beside Edit in the editor's selection bar ([#119](https://github.com/polandy/glissando/issues/119)) ([c270bb6](https://github.com/polandy/glissando/commit/c270bb6e39e034bb0d0421fd9fe9c99a5a81369e))
* snap a picture change after an own duration to the beat too ([#121](https://github.com/polandy/glissando/issues/121)) ([ef5e962](https://github.com/polandy/glissando/commit/ef5e962d3b51aad088a11c8dbc1ed8438101c5cd))
* zoom while panning across scenery ([#116](https://github.com/polandy/glissando/issues/116)) ([dc6fd46](https://github.com/polandy/glissando/commit/dc6fd46e8c8dadd830486376f95e6c82512aa4b1))


### Bug Fixes

* lengthen the automatic music fade-out so an ending is never abrupt ([#120](https://github.com/polandy/glissando/issues/120)) ([8b5301b](https://github.com/polandy/glissando/commit/8b5301b97fb7d557499ff494468d8726b547eb30))
* list the bundled models, face finder and fonts in the open-source licences ([#117](https://github.com/polandy/glissando/issues/117)) ([6bf4729](https://github.com/polandy/glissando/commit/6bf4729ce92d5616f526b1c3374bb8571cc870aa))

## [0.0.10](https://github.com/polandy/glissando/compare/glissando-v0.0.9...glissando-v0.0.10) (2026-10-22)


### Features

* find the focus of server pictures on the client, share it via the server and look again ([#113](https://github.com/polandy/glissando/issues/113)) ([dcd5ee3](https://github.com/polandy/glissando/commit/dcd5ee3907c58b704b6775df375b8e51cd9c4d97))
* offer nine sample tracks for a slideshow's music ([#115](https://github.com/polandy/glissando/issues/115)) ([09975ef](https://github.com/polandy/glissando/commit/09975ef5795db0d474088d6e9bf24a4803766c6d))

## [0.0.9](https://github.com/polandy/glissando/compare/glissando-v0.0.8...glissando-v0.0.9) (2026-10-20)


### Bug Fixes

* list the server's slideshows past one whose document it cannot read ([#110](https://github.com/polandy/glissando/issues/110)) ([7823440](https://github.com/polandy/glissando/commit/782344044f404a45203f8a16436006addfb24098))

## [0.0.8](https://github.com/polandy/glissando/compare/glissando-v0.0.7...glissando-v0.0.8) (2026-10-20)


### Features

* arrange pictures and keep adding media while an import runs ([#105](https://github.com/polandy/glissando/issues/105)) ([5db02a6](https://github.com/polandy/glissando/commit/5db02a6fd53f514036ce69b897381892981eda0a))
* level every song to the same loudness and give each its own volume ([#107](https://github.com/polandy/glissando/issues/107)) ([a6083e8](https://github.com/polandy/glissando/commit/a6083e8062d52a2a4bb39d65fe5db523bf7d7ddd))
* open a .glissando file that a ZIP tool packed again ([#99](https://github.com/polandy/glissando/issues/99)) ([a555607](https://github.com/polandy/glissando/commit/a555607ac1d76aafead899c06eaf6b73ff147f09))
* open an edited glissando.json that leaves out a thumbnail key ([#101](https://github.com/polandy/glissando/issues/101)) ([b48ff99](https://github.com/polandy/glissando/commit/b48ff990e56f2e045b74a27a4c0959d07ab9dfd6))
* put a player page into every .glissando file ([#103](https://github.com/polandy/glissando/issues/103)) ([1046507](https://github.com/polandy/glissando/commit/1046507c90f0a862bdf3d239adb06b3e1d9cd09d))
* write a JSON Schema and a README into every exported .glissando file ([9f6fcde](https://github.com/polandy/glissando/commit/9f6fcde53b8ce1031dc47d24fe32a69dc58253d3))


### Bug Fixes

* end a slideshow whose last frame lands past the end before its picture ([#108](https://github.com/polandy/glissando/issues/108)) ([5a5d779](https://github.com/polandy/glissando/commit/5a5d7794b4ba720c0431ab711825e696d2f0c5aa))
* keep the music playing under a video clip's sound on the iPad ([#106](https://github.com/polandy/glissando/issues/106)) ([dc0402d](https://github.com/polandy/glissando/commit/dc0402d2844b42e51b98538f972ac1d9bd10493a))
* play video slides with sound on the iPad ([#98](https://github.com/polandy/glissando/issues/98)) ([9ef5cbf](https://github.com/polandy/glissando/commit/9ef5cbf5640def3a03fd92b4bd8eb1b2013e5c62))
* stop both server processes when one ends while the pair is starting ([#104](https://github.com/polandy/glissando/issues/104)) ([9aa9ab1](https://github.com/polandy/glissando/commit/9aa9ab13c5f58a238a44a9d3bafc167544c6cfc9))

## [0.0.7](https://github.com/polandy/glissando/compare/glissando-v0.0.6...glissando-v0.0.7) (2026-10-17)


### Features

* check every opened .glissando file as foreign before storing it ([#97](https://github.com/polandy/glissando/issues/97)) ([ba5b289](https://github.com/polandy/glissando/commit/ba5b2893603bf48f7b0e039a9de8cf8a1d26b03f))


### Bug Fixes

* let the iPad pick MP3s from any storage location ([#95](https://github.com/polandy/glissando/issues/95)) ([e8fb269](https://github.com/polandy/glissando/commit/e8fb269956676d48741dfb2ce2f3bda465c684dd))

## [0.0.6](https://github.com/polandy/glissando/compare/glissando-v0.0.5...glissando-v0.0.6) (2026-10-17)


### Features

* add a placeholder tile after the last picture that adds media ([#93](https://github.com/polandy/glissando/issues/93)) ([c42e5bd](https://github.com/polandy/glissando/commit/c42e5bd36dd80bbff48be75eb9ec91218b513bd5))
* aim the automatic motion at animals in pictures without a face ([f85c54b](https://github.com/polandy/glissando/commit/f85c54bb04cca91247deef5183b75560c6a8b681))
* aim the automatic motion at the main object of a picture ([#77](https://github.com/polandy/glissando/issues/77)) ([6247e60](https://github.com/polandy/glissando/commit/6247e60bd578dcac9fddf1384561387e233c6974))
* change pictures on a phrase start when it is about as near as a beat ([033bf16](https://github.com/polandy/glissando/commit/033bf16207927de73c87ec725d939564ed243c79))
* hide the picture frame card and bring it back in Settings ([#71](https://github.com/polandy/glissando/issues/71)) ([3dedd9d](https://github.com/polandy/glissando/commit/3dedd9dae8b995ff18fe1e9bb865438f56003111))
* link to the documentation and the source code in the settings ([#94](https://github.com/polandy/glissando/issues/94)) ([faa8379](https://github.com/polandy/glissando/commit/faa837927118dc67cdaa51da5f0b93c4d14a837d))
* open and close a slideshow with a title slide ([#65](https://github.com/polandy/glissando/issues/65)) ([6ce3a1c](https://github.com/polandy/glissando/commit/6ce3a1cebf8c8faf43c27327a6a13ce1d5899446))
* pick a title card's entrance, tint and picture colours ([#67](https://github.com/polandy/glissando/issues/67)) ([788471d](https://github.com/polandy/glissando/commit/788471dfc74e7bc9d805d267e732564fb9bdfd73))
* put every export in the slideshow's ⋯ menu ([#91](https://github.com/polandy/glissando/issues/91)) ([8a8790b](https://github.com/polandy/glissando/commit/8a8790b1482a160ef2289c80a1c77b490440f466))
* rename "Add pictures" to "Add media" since videos are accepted too ([#90](https://github.com/polandy/glissando/issues/90)) ([683658c](https://github.com/polandy/glissando/commit/683658c4a140c44e4577854e646423fdb29a8f35))
* say so in the clip editor's strip when the clip's sound cannot be read ([#87](https://github.com/polandy/glissando/issues/87)) ([b72fb62](https://github.com/polandy/glissando/commit/b72fb62c6bb70015c14aa5cee4cf778100eb515a))
* show a picture full screen in the picture selection ([#79](https://github.com/polandy/glissando/issues/79)) ([ef79be0](https://github.com/polandy/glissando/commit/ef79be01695b110b6d0cf470ac47eb8b24ad3845))
* show and drag the play position on both clip editor bars ([#85](https://github.com/polandy/glissando/issues/85)) ([e37b711](https://github.com/polandy/glissando/commit/e37b7116d8ee4a51d8b86ed91005e26b5bc626ee))
* show the clip's sound as a waveform in the clip editor's strip ([#86](https://github.com/polandy/glissando/issues/86)) ([940a387](https://github.com/polandy/glissando/commit/940a3873b38b7aedd2463c31f7c562785fe8c106))
* show the play position on the slideshow lane too ([#83](https://github.com/polandy/glissando/issues/83)) ([2691c8e](https://github.com/polandy/glissando/commit/2691c8ea6da423892cf6c45df8f5a4f35ec142bc))
* shuffle the pictures of a slideshow into a random order ([870074a](https://github.com/polandy/glissando/commit/870074a1c75ea5b07b824e6c04b29e39fc735551))
* sweep slowly across scenery ([#78](https://github.com/polandy/glissando/issues/78)) ([86d37ea](https://github.com/polandy/glissando/commit/86d37eae632b467c77e4fb261a13cb7574f39945))
* videos as slides ([#75](https://github.com/polandy/glissando/issues/75)) ([2e9e4c3](https://github.com/polandy/glissando/commit/2e9e4c34091cba219b7f92377982af21c3454de2))


### Bug Fixes

* keep equally sized pictures decoded at once apart in WebKit ([6146d58](https://github.com/polandy/glissando/commit/6146d587c3b926e17edbe12f75a937de5c774ebf))
* keep portrait pictures, picture length and alone marks on import ([fd3cde8](https://github.com/polandy/glissando/commit/fd3cde8a1cdd8dc021bcd5862d107ac614d0d0de))
* make the selection bar stand out and fit a phone ([#88](https://github.com/polandy/glissando/issues/88)) ([e013f82](https://github.com/polandy/glissando/commit/e013f82a61071f8527dacc505413445b5103e1fb))
* stack the slideshow info panel above the pictures, details folded, on tablet and narrower ([#89](https://github.com/polandy/glissando/issues/89)) ([e6baa30](https://github.com/polandy/glissando/commit/e6baa307283847528aec7c0fdb30d8ba147160fd))
* stop title cards stuttering and freezing a video next to them ([#82](https://github.com/polandy/glissando/issues/82)) ([8c672ec](https://github.com/polandy/glissando/commit/8c672ec4fe3b5abf054b7133e3212805af7df332))

## [0.0.5](https://github.com/polandy/glissando/compare/glissando-v0.0.4...glissando-v0.0.5) (2026-10-13)


### Bug Fixes

* retry a failed picture read or decode once and tell the two apart ([91d99b0](https://github.com/polandy/glissando/commit/91d99b0ef78e8cf84b8c495a55dff080214867d6))

## [0.0.4](https://github.com/polandy/glissando/compare/glissando-v0.0.3...glissando-v0.0.4) (2026-10-13)


### Features

* publish every release on GitHub Pages for anyone to install ([#62](https://github.com/polandy/glissando/issues/62)) ([31fdeb1](https://github.com/polandy/glissando/commit/31fdeb1f9ae45d2bca525222344c03d09fb27739))
* show a server slideshow on the TV, controlled from the phone ([#60](https://github.com/polandy/glissando/issues/60)) ([c319296](https://github.com/polandy/glissando/commit/c319296d0d756f953fd1181af5776d81aa1f4970))

## [0.0.3](https://github.com/polandy/glissando/compare/glissando-v0.0.2...glissando-v0.0.3) (2026-10-13)


### Features

* choose the quality of server slideshows and prepare 4K before playing ([#52](https://github.com/polandy/glissando/issues/52)) ([5ff0fbb](https://github.com/polandy/glissando/commit/5ff0fbb9b9f13e1a48f6b3c43bc9352a4280d5bf))
* frame every person in a group with the automatic Ken Burns ([8d1e873](https://github.com/polandy/glissando/commit/8d1e8731014eb807f9008446baed390aeaa2ebd5))
* pair portrait pictures and show a lone one whole over a blurred fill ([#56](https://github.com/polandy/glissando/issues/56)) ([4803105](https://github.com/polandy/glissando/commit/4803105ce905bb5c2625a1eaa41f0f2da09786eb))
* show an Immich album as an endless picture frame ([#59](https://github.com/polandy/glissando/issues/59)) ([398fd49](https://github.com/polandy/glissando/commit/398fd49c9ce06eff87ec1298162e3175c823db78))
* show the running version in the settings and make a waiting update stand out ([#53](https://github.com/polandy/glissando/issues/53)) ([199394e](https://github.com/polandy/glissando/commit/199394e79923e454715c76b10f506331a4917c2d))


### Bug Fixes

* keep import tiles' remove marks and dates under the bottom action bar ([a88163b](https://github.com/polandy/glissando/commit/a88163b84dd7fc0387cd803722f3e4daa0564280))

## [0.0.2](https://github.com/polandy/glissando/compare/glissando-v0.0.1...glissando-v0.0.2) (2026-10-12)


### Bug Fixes

* play server slideshows from Immich's preview, three pictures ahead ([#50](https://github.com/polandy/glissando/issues/50)) ([944fae1](https://github.com/polandy/glissando/commit/944fae1e0abb4c9e186c7df577b46dd7a8b3ced5))

## 0.0.1 (2026-10-11)


### Features

* add picture captions, edited in the picture editor and drawn into the slide ([#11](https://github.com/polandy/glissando/issues/11)) ([5632a09](https://github.com/polandy/glissando/commit/5632a090fb8b7c4235155f49ed5dcb0fb464e99f))
* add pictures to an existing slideshow, from the device and from Immich ([#21](https://github.com/polandy/glissando/issues/21)) ([a985c28](https://github.com/polandy/glissando/commit/a985c2889f997ac89d1f87cbdb35c2d2d35ed014))
* add the slideshow JSON format and the WebGL2 player engine ([33fc47f](https://github.com/polandy/glissando/commit/33fc47fe33810a2c39f5daa52479d5404914af56))
* aim the automatic Ken Burns at faces found on the device ([#17](https://github.com/polandy/glissando/issues/17)) ([fc4567f](https://github.com/polandy/glissando/commit/fc4567fadbd867a3cde233a8b5bfe742e7c2479b))
* browse and pick Immich photos through the self-hosted Glissando ([#18](https://github.com/polandy/glissando/issues/18)) ([58d87b8](https://github.com/polandy/glissando/commit/58d87b8a0907c47a11cd2b4b29793b9787790e7b))
* change the pictures on the music's beats ([#33](https://github.com/polandy/glissando/issues/33)) ([ade33c4](https://github.com/polandy/glissando/commit/ade33c493a4ffc7ad2a94cb659035a61caafe984))
* choose one default transition for the whole slideshow ([#15](https://github.com/polandy/glissando/issues/15)) ([3f73221](https://github.com/polandy/glissando/commit/3f732214458fedee2552e94b82bab60c89b2f89f))
* convert music a browser cannot play to FLAC on the device ([#32](https://github.com/polandy/glissando/issues/32)) ([49f79a4](https://github.com/polandy/glissando/commit/49f79a41295094b7f7c9a6529df9b947ce832357))
* export and import a slideshow as a .glissando file ([#8](https://github.com/polandy/glissando/issues/8)) ([05288cb](https://github.com/polandy/glissando/commit/05288cb4348c0539f1e9ac5713e8cfb74e2e4a32))
* give a picture its own Ken Burns motion in a picture editor ([#10](https://github.com/polandy/glissando/issues/10)) ([67a5ac7](https://github.com/polandy/glissando/commit/67a5ac7676937d4ee810e5d0867c03904fbb24ed))
* import pictures and music and play them as an automatic slideshow ([0dce0df](https://github.com/polandy/glissando/commit/0dce0df9bc06dedb11ad91d3a8d380a6987e9656))
* keep the picture length with music, changing on the beat ([#34](https://github.com/polandy/glissando/issues/34)) ([be98c36](https://github.com/polandy/glissando/commit/be98c36f13310bb00b79ece96f41b18cfdc5a8d1))
* let chosen pictures be removed in the pictures step ([#29](https://github.com/polandy/glissando/issues/29)) ([dfd7bf9](https://github.com/polandy/glissando/commit/dfd7bf9555e25f4143ea3ece101f31f81fc2a154))
* make Glissando installable and fully offline ([#9](https://github.com/polandy/glissando/issues/9)) ([cb0b74b](https://github.com/polandy/glissando/commit/cb0b74b8325db4986e7f4f12143257f76e309bf4))
* open a .glissando file by double-click in the installed app ([#14](https://github.com/polandy/glissando/issues/14)) ([2f3f317](https://github.com/polandy/glissando/commit/2f3f3172149b40b99241d2c4f626ac696ef47e7e))
* paint an app shell before the app's script runs ([#16](https://github.com/polandy/glissando/issues/16)) ([2b84b0b](https://github.com/polandy/glissando/commit/2b84b0b773f25c93a229671cf4f3bab262a8a54a))
* play several songs per slideshow, crossfading between them ([#35](https://github.com/polandy/glissando/issues/35)) ([3669c2b](https://github.com/polandy/glissando/commit/3669c2bbeec91f52a63e2aa3ba3c8e4118e3b4c9))
* play the glide start animation on first launch ([#2](https://github.com/polandy/glissando/issues/2)) ([3a796dc](https://github.com/polandy/glissando/commit/3a796dc443b0ee9526cd1e6bb6d46e78d43f3415))
* remove, reorder and rename pictures, and delete a slideshow ([#7](https://github.com/polandy/glissando/issues/7)) ([bfe58d1](https://github.com/polandy/glissando/commit/bfe58d158895110b530122560023197ef94945eb))
* save a slideshow as a web page that plays offline in any browser ([#22](https://github.com/polandy/glissando/issues/22)) ([495ac74](https://github.com/polandy/glissando/commit/495ac7428ac4ea14cdbb3d71eac4b4adeac9fed6))
* save a slideshow as an MP4 video, rendered frame by frame on the device ([#20](https://github.com/polandy/glissando/issues/20)) ([dd51f32](https://github.com/polandy/glissando/commit/dd51f321f32b8b3151fd147cdc427709cab50629))
* save slideshows on the Glissando server with photos linked from Immich ([#23](https://github.com/polandy/glissando/issues/23)) ([3850bd8](https://github.com/polandy/glissando/commit/3850bd82a3a10bf9a559c23a4c448d1bd5b3a2da))
* select several pictures and move them together, also by touch ([#24](https://github.com/polandy/glissando/issues/24)) ([78f624e](https://github.com/polandy/glissando/commit/78f624e9edf7d62676784790e048cde3bdf950da))
* set a picture's own duration and transition in the picture editor ([#12](https://github.com/polandy/glissando/issues/12)) ([24bb6f7](https://github.com/polandy/glissando/commit/24bb6f7230d95c9d00ee6b5a02ed50c8d4e84086))
* set similar shots and blurry pictures aside at import ([#37](https://github.com/polandy/glissando/issues/37)) ([524e781](https://github.com/polandy/glissando/commit/524e7814febd599967c118f0b9df032e8ceed04f))
* share a server slideshow by link ([#38](https://github.com/polandy/glissando/issues/38)) ([59fd865](https://github.com/polandy/glissando/commit/59fd86581712dcdc45467d898bc735a24c85dc9f))
* sort pictures added to an own-order slideshow in by capture date ([#26](https://github.com/polandy/glissando/issues/26)) ([7fcb100](https://github.com/polandy/glissando/commit/7fcb100ae557492fbcbc5d848a38b5f78d2db4f7))
* trim and fade the slideshow's music in a music editor ([#13](https://github.com/polandy/glissando/issues/13)) ([78897d2](https://github.com/polandy/glissando/commit/78897d2eafed1ebf929f62e55b82b5f054f1b0d8))


### Bug Fixes

* announce the exported page's start state only once Play is wired ([#28](https://github.com/polandy/glissando/issues/28)) ([49e7adb](https://github.com/polandy/glissando/commit/49e7adbd2c64b82660f6c8305d5aec15830007f1))
* keep the Ken Burns motion smooth through every picture ([#19](https://github.com/polandy/glissando/issues/19)) ([0fcb0d0](https://github.com/polandy/glissando/commit/0fcb0d0d38b1522bbb4e5ee77fe77dfbdfef4f32))
* keep the status of a library service that dies as the container stops ([#25](https://github.com/polandy/glissando/issues/25)) ([daf46a1](https://github.com/polandy/glissando/commit/daf46a1dda5f484c9af2ab3cfe6254446f9621b3))
* stop Vite's config loader warning flooding every test run ([#43](https://github.com/polandy/glissando/issues/43)) ([468baed](https://github.com/polandy/glissando/commit/468baedee6461da9ab614306980e3f144454b32e))
