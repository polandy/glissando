# Changelog

## [0.1.3](https://github.com/polandy/glissando/compare/glissando-v0.1.2...glissando-v0.1.3) (2026-11-12)


### Bug Fixes

* **glissando-file:** export a server slideshow so its .glissando file opens again ([#339](https://github.com/polandy/glissando/issues/339)) ([d702c14](https://github.com/polandy/glissando/commit/d702c14856ba28151fced4817c874c04f02ae08a))
* **immich:** make 4K renditions in a worker so server slideshows play without stutter ([#337](https://github.com/polandy/glissando/issues/337)) ([e30dda6](https://github.com/polandy/glissando/commit/e30dda689b697d61f49d3d3ecfebc43e46b257ab))

## [0.1.2](https://github.com/polandy/glissando/compare/glissando-v0.1.1...glissando-v0.1.2) (2026-11-12)


### Features

* **glissando-file:** carry each picture's focus so opening a file skips detection ([#331](https://github.com/polandy/glissando/issues/331)) ([0015539](https://github.com/polandy/glissando/commit/0015539f2576182b395c6a4c17b989d25c098c29))
* **immich:** list JPEGs only and browse by month, favourites, people and folders ([#334](https://github.com/polandy/glissando/issues/334)) ([f404205](https://github.com/polandy/glissando/commit/f4042055a92d2de6ea373856164d31e80c4bb339))


### Bug Fixes

* **glissando-file:** open every older format version through a migration chain ([#336](https://github.com/polandy/glissando/issues/336)) ([a8409ee](https://github.com/polandy/glissando/commit/a8409eef8d8ed295a8237830befebcbb209161eb))
* **settings:** play server slideshows in 4K automatically only on 4K screens ([#328](https://github.com/polandy/glissando/issues/328)) ([cfa6857](https://github.com/polandy/glissando/commit/cfa6857ce6ce82b2ab98e68372fe9c9c1d138cf3))
* **start:** tell a failed demo download from a damaged file ([#330](https://github.com/polandy/glissando/issues/330)) ([0346337](https://github.com/polandy/glissando/commit/034633758f1f9abaa2efbaf2017066a5affb7d73))

## [0.1.1](https://github.com/polandy/glissando/compare/glissando-v0.1.0...glissando-v0.1.1) (2026-11-10)


### Features

* offer a demo slideshow on the public install's empty start screen ([#84](https://github.com/polandy/glissando/issues/84)) ([0e61a62](https://github.com/polandy/glissando/commit/0e61a62e5f0b22dce4a024a5c53a2961941c4eef))


### Bug Fixes

* **library:** size the sample song tiles to about 140 px on wide screens ([#326](https://github.com/polandy/glissando/issues/326)) ([8e546f7](https://github.com/polandy/glissando/commit/8e546f7f7cef818bcc413896c4fe1c22454927d2))
* **player:** upload each picture slice from its own rows' bytes ([#323](https://github.com/polandy/glissando/issues/323)) ([992f4b8](https://github.com/polandy/glissando/commit/992f4b87c21b6086f3396a05be58434053995bba))
* **server-library:** a kept copy's title and closing slides point at the copy's own pictures ([#325](https://github.com/polandy/glissando/issues/325)) ([7149f17](https://github.com/polandy/glissando/commit/7149f1700bda19eb31af33f7c62b6b84a25034ab))

## [0.1.0](https://github.com/polandy/glissando/compare/glissando-v0.0.12...glissando-v0.1.0) (2026-11-09)


### Features

* **editor:** Sort by date puts the pictures back in capture order after a shuffle or move ([#168](https://github.com/polandy/glissando/issues/168)) ([d7b4456](https://github.com/polandy/glissando/commit/d7b4456229848d97598bcb5582002469ce32013b))
* **frame:** the caption names each picture's place and date ([#175](https://github.com/polandy/glissando/issues/175)) ([fde29eb](https://github.com/polandy/glissando/commit/fde29eb259cbcd2db27c42415fc241cd8be237b8))
* **library:** tell the user when a newer version is open in another tab and reload ([#320](https://github.com/polandy/glissando/issues/320)) ([0551283](https://github.com/polandy/glissando/commit/05512831100b480ed91fa8f679fefc4e40011217))
* **player:** play from a chosen picture ([#169](https://github.com/polandy/glissando/issues/169)) ([500dd21](https://github.com/polandy/glissando/commit/500dd21deccc608a5b676a45ac6398754e43a873))


### Bug Fixes

* **app:** give the slideshow's more menu arrow-key navigation and one separator per non-empty group ([#299](https://github.com/polandy/glissando/issues/299)) ([a43f52a](https://github.com/polandy/glissando/commit/a43f52a6a1be9118657c776d00d936afae820d8e))
* **app:** log an HTML export error that arrives after the sheet closed ([#284](https://github.com/polandy/glissando/issues/284)) ([aee586f](https://github.com/polandy/glissando/commit/aee586f7969af153603729647441627ed76de4fb))
* **app:** report a cross-origin script error by its message when its error is null ([#292](https://github.com/polandy/glissando/issues/292)) ([81b0889](https://github.com/polandy/glissando/commit/81b088906926b9eaea3464ee95ecdc2d14fba2c0))
* **app:** say so on the app shell when the library cannot open ([#223](https://github.com/polandy/glissando/issues/223)) ([f863dab](https://github.com/polandy/glissando/commit/f863dab5e9cc9d320cd08cc4157e7bf083ecef52))
* **app:** show a skeleton while a slideshow opens and leave to the parent when it fails ([#288](https://github.com/polandy/glissando/issues/288)) ([1356f37](https://github.com/polandy/glissando/commit/1356f37c30bf2a7b080c1adedbf637d2d1b0ca23))
* **app:** warn once when a stored setting value is unrecognised ([#295](https://github.com/polandy/glissando/issues/295)) ([bfe27f3](https://github.com/polandy/glissando/commit/bfe27f335792531c71bc48bb68565be1c311ee41))
* **brand:** hash-verify the font licence texts fetched by the webfont build ([#311](https://github.com/polandy/glissando/issues/311)) ([ba6b472](https://github.com/polandy/glissando/commit/ba6b4721ee9cc02ff6205181bdb2ba1b2505d5ec))
* **card-face:** ignore a replaced style's late font load ([#225](https://github.com/polandy/glissando/issues/225)) ([f9b6f8b](https://github.com/polandy/glissando/commit/f9b6f8b49bdf90cb590aca1d1e694bc861954290))
* **card-sheet:** give sheet chips, options and menu items a 44 px hit square under a coarse pointer ([#232](https://github.com/polandy/glissando/issues/232)) ([fd0cae6](https://github.com/polandy/glissando/commit/fd0cae665c840c771fce434cfa7835776f98854b))
* **card-sheet:** give the radio groups arrow keys and a roving tabindex ([#231](https://github.com/polandy/glissando/issues/231)) ([9b32179](https://github.com/polandy/glissando/commit/9b321795232382b7a9dab098a5e937c5088b6fc1))
* **chapters:** hand focus back to the chapter's strip tile when its sheet closes ([#227](https://github.com/polandy/glissando/issues/227)) ([5b7392d](https://github.com/polandy/glissando/commit/5b7392db8ce342845883f079ea534de2d40faaa1))
* **compose:** measure the phrase tolerance by the beat interval at the cut ([#274](https://github.com/polandy/glissando/issues/274)) ([08e03cd](https://github.com/polandy/glissando/commit/08e03cdab3439633362a2c95d03f8badbed001d2))
* **compose:** size a repeating playlist from its period instead of growing it song by song ([#276](https://github.com/polandy/glissando/issues/276)) ([b5ee789](https://github.com/polandy/glissando/commit/b5ee789cff7c97dfacabffdfba6223547c89b0cf))
* **copy:** sweep the catalogues and user guide against the glossary ([#158](https://github.com/polandy/glissando/issues/158)) ([60bf5b6](https://github.com/polandy/glissando/commit/60bf5b645b5bd9c810d424d879ee4ff3a78b729b))
* **deploy:** log ordinary requests to the access log and answer /healthz unlogged ([#319](https://github.com/polandy/glissando/issues/319)) ([5a943dd](https://github.com/polandy/glissando/commit/5a943dd0bf041a5cbe7f06b28a8f9324cd9334a8))
* **e2e:** register the TV stream plugin only from the Playwright web servers ([#310](https://github.com/polandy/glissando/issues/310)) ([36293cd](https://github.com/polandy/glissando/commit/36293cd3c9fbf92fdf9d698d9cbebbf9883ae311))
* **export:** the exported page names mediabunny, its MPL-2.0 licence and its source ([#182](https://github.com/polandy/glissando/issues/182)) ([5b43d29](https://github.com/polandy/glissando/commit/5b43d298c861ffe040227a41b44c161ade2890e9))
* **focus-sheet:** give focus back to the More button when the sheet closes ([#226](https://github.com/polandy/glissando/issues/226)) ([4f1279e](https://github.com/polandy/glissando/commit/4f1279eb5cad1fb8a6baad38191d72ebe4f7151d))
* **focus:** answer a request whose reply cannot be posted with a failed reply ([#278](https://github.com/polandy/glissando/issues/278)) ([bd81497](https://github.com/polandy/glissando/commit/bd81497537f95b45a2d362842fd031053c902424))
* **frame:** the prepared round starts playing at the hand-over, not hidden ahead of it ([#180](https://github.com/polandy/glissando/issues/180)) ([7ba330f](https://github.com/polandy/glissando/commit/7ba330f0fb08d4ba920969509e6cf8ba4a2fcb03))
* **glissando-file:** accept a picture an EXIF orientation turns in the opened-file size check ([#268](https://github.com/polandy/glissando/issues/268)) ([0f1e799](https://github.com/polandy/glissando/commit/0f1e7990649c85eef6e06ba820ba996876f77ef0))
* **glissando-file:** allow only audio, video or octet-stream media types ([#212](https://github.com/polandy/glissando/issues/212)) ([351e046](https://github.com/polandy/glissando/commit/351e04643241df7a38d9c1119887a2edae06ab02))
* **glissando-file:** log a failed claim release after a saved open instead of reporting the open as failed ([#267](https://github.com/polandy/glissando/issues/267)) ([0d15068](https://github.com/polandy/glissando/commit/0d15068a66f4c7c1398b3635f5bae2b712249eec))
* **glissando-file:** log a real failure that races the cancel of an open instead of counting it as the cancel ([#266](https://github.com/polandy/glissando/issues/266)) ([9c341eb](https://github.com/polandy/glissando/commit/9c341eb93c8cf2f26950955c442d4ad82efd1d20))
* **glissando-file:** refuse two pictures or thumbnails at one path ([#211](https://github.com/polandy/glissando/issues/211)) ([ebd2f33](https://github.com/polandy/glissando/commit/ebd2f3361f41a784845bc6d8ccb964f0b7536afa))
* **html-export:** open the exported page in a sandboxed frame, not on the app's origin ([#286](https://github.com/polandy/glissando/issues/286)) ([47f42ff](https://github.com/polandy/glissando/commit/47f42ff8e719513f395b4b5b36d7840ffaa1f4eb))
* **i18n:** name the missing key when a runtime message key is unknown ([#291](https://github.com/polandy/glissando/issues/291)) ([5349870](https://github.com/polandy/glissando/commit/5349870b9d8d29899a29017f5d8d7ee89bec1ebb))
* **immich:** a photo's capture date is cut to whole seconds, so it matches the same file's EXIF date ([#179](https://github.com/polandy/glissando/issues/179)) ([ea80b22](https://github.com/polandy/glissando/commit/ea80b22b6a980f4415f9b5ad41f50e36ce107d90))
* **immich:** fail loud when an album's next page does not advance ([#271](https://github.com/polandy/glissando/issues/271)) ([c3a4600](https://github.com/polandy/glissando/commit/c3a460044f263c7ad9bd279d92e6dcec10f23a48))
* **immich:** read a photo's GPS from the search, range-checked ([2c31c6d](https://github.com/polandy/glissando/commit/2c31c6dd5c2dd5e118364e2dc75fe7c39338e2ea))
* **immich:** the proxy lets the import's GPS lookup through ([#176](https://github.com/polandy/glissando/issues/176)) ([cccadb7](https://github.com/polandy/glissando/commit/cccadb76ea48bcfbc6b06284aeb1ea707b585142))
* **import:** a linked Immich photo whose thumbnail can't be read gets grey colours and is still linked ([#184](https://github.com/polandy/glissando/issues/184)) ([edf54b7](https://github.com/polandy/glissando/commit/edf54b7b3e94b0e068229c0a5cce2a3f516dcad5))
* **import:** abort Immich downloads on cancel and refuse oversized videos unread ([#216](https://github.com/polandy/glissando/issues/216)) ([e32b8db](https://github.com/polandy/glissando/commit/e32b8db0c33c31091ec1e9ae3d55d350db01c6aa))
* **import:** cap pictures at 100 MiB and 268 MP before decoding ([#213](https://github.com/polandy/glissando/issues/213)) ([24a41ac](https://github.com/polandy/glissando/commit/24a41ac2b056eef7975d03a5c73ba96138564dba))
* **import:** Immich links are serialised session state; home switch, create and add wait for them ([#181](https://github.com/polandy/glissando/issues/181)) ([9351058](https://github.com/polandy/glissando/commit/9351058d026ad8e880f21d1f08b5b33d4629cc8a))
* **import:** keep a stopped pick's flag on the file in flight so it cannot outlive it ([#279](https://github.com/polandy/glissando/issues/279)) ([122da8c](https://github.com/polandy/glissando/commit/122da8c2ea517f5129610a0bcfb2cbb1e91d77c6))
* **import:** read a picture's EXIF once for its date and GPS ([#214](https://github.com/polandy/glissando/issues/214)) ([f137ed1](https://github.com/polandy/glissando/commit/f137ed1b5663601785aee7db3d390bfd14d3a756))
* **import:** stop tracking settled song reads and let the music probe be aborted ([#275](https://github.com/polandy/glissando/issues/275)) ([7dabb9c](https://github.com/polandy/glissando/commit/7dabb9cf67cbf7b764cc998bfd72807bb97c53a3))
* **import:** validate channels and frame size before FLAC encoding ([#272](https://github.com/polandy/glissando/issues/272)) ([0958e4a](https://github.com/polandy/glissando/commit/0958e4a4b2eb9f908305c494fda54bd03de3fe90))
* **media:** let only the latest load of a re-requested id make its URL ([#210](https://github.com/polandy/glissando/issues/210)) ([89318a0](https://github.com/polandy/glissando/commit/89318a07451b6bf8bb9f2d44b6f0655ae0263b24))
* **mood:** the preview revokes its song URLs when it closes while focus or loudness still loads ([#183](https://github.com/polandy/glissando/issues/183)) ([115fb54](https://github.com/polandy/glissando/commit/115fb5413bee597fa273a368571a5043192bcc62))
* **music-editor:** a removed sample download settling late keeps the re-added download's progress and abort ([#201](https://github.com/polandy/glissando/issues/201)) ([7ab1b66](https://github.com/polandy/glissando/commit/7ab1b66d6cd29c49cf248ca2a38059d34629b82f))
* **music:** cap songs at 200 MB and 20 minutes at intake and before every decode ([#202](https://github.com/polandy/glissando/issues/202)) ([13e6609](https://github.com/polandy/glissando/commit/13e660996f070916cb56033e205a91b3de997062))
* **music:** keep the status a playlist song replays while its track starts ([#277](https://github.com/polandy/glissando/issues/277)) ([87074af](https://github.com/polandy/glissando/commit/87074afebbc71868e0a774f30c23da0633fa2b70))
* **music:** sample-song preview plays on iPad Safari — the tap unlocks the audio before the song is looked up ([#170](https://github.com/polandy/glissando/issues/170)) ([1e4c200](https://github.com/polandy/glissando/commit/1e4c2004248b6cfa531c76d810bf72ea80d33d6c))
* **navigation:** restore every popped entry on a refused leave and queue an open() during a pending climb down ([#289](https://github.com/polandy/glissando/issues/289)) ([b6a7882](https://github.com/polandy/glissando/commit/b6a7882e53e12ab6e71069df7e72b347e18de0e6))
* **picture-editor:** store a wheel zoom once the wheel rests ([#221](https://github.com/polandy/glissando/issues/221)) ([5292379](https://github.com/polandy/glissando/commit/5292379fd2a4c981a51f31c4c5506ed25591b427))
* **places:** fail a non-ok place-data fetch and stop refetching it for every picture ([#269](https://github.com/polandy/glissando/issues/269)) ([c8f5874](https://github.com/polandy/glissando/commit/c8f587433ce4a84a7251128ac9dccc38d47005fa))
* **places:** widen the place search's longitude span with latitude ([#270](https://github.com/polandy/glissando/issues/270)) ([89431d6](https://github.com/polandy/glissando/commit/89431d60ffdd7d850a477680cb5dd602d34b9a4d))
* **player:** cards survive a context restore; Play retries a failed clip ([#178](https://github.com/polandy/glissando/issues/178)) ([b58a8ba](https://github.com/polandy/glissando/commit/b58a8baa25047a7cab7d60e3c5dba93af598acc1))
* **player:** delete the renderer's vertex buffer on dispose ([#258](https://github.com/polandy/glissando/issues/258)) ([a857a5c](https://github.com/polandy/glissando/commit/a857a5c1d09b805c1510c3d57ba1251551024344))
* **player:** delete the shader and program objects before throwing on a compile or link failure ([#257](https://github.com/polandy/glissando/issues/257)) ([5832606](https://github.com/polandy/glissando/commit/5832606c8ada63c0eac8c3b636f2e20be186f4b5))
* **player:** fall back to the DOM renderer when the WebGL2 setup fails ([#219](https://github.com/polandy/glissando/issues/219)) ([79235d4](https://github.com/polandy/glissando/commit/79235d44b98fde4a0e4176929bd470f8a73d4594))
* **player:** log swallowed errors, one MediaQueryList, cap durations at safe integers ([#261](https://github.com/polandy/glissando/issues/261)) ([fdccba5](https://github.com/polandy/glissando/commit/fdccba5f76a89fe981bf4a6f79a2f500b3df9e9d))
* **player:** release the frame player's WebGL context only through the renderer ([#259](https://github.com/polandy/glissando/issues/259)) ([f5e94e6](https://github.com/polandy/glissando/commit/f5e94e6e5082bcd447684493de1921a9621f17f7))
* **player:** seek the music back to the show clock after a stall ([#206](https://github.com/polandy/glissando/issues/206)) ([875a11e](https://github.com/polandy/glissando/commit/875a11e88c5a6624281c5b1d5de6981e96bda72a))
* **player:** show the failure card when the slideshow's music cannot be read ([#290](https://github.com/polandy/glissando/issues/290)) ([4492155](https://github.com/polandy/glissando/commit/4492155a9ace9ff7f0cb5a3dba86c3229e7ebf87))
* **scripts:** make ci-failures.sh take the latest failed run ([#313](https://github.com/polandy/glissando/issues/313)) ([00b3b76](https://github.com/polandy/glissando/commit/00b3b76a30bc8a0772779ae99a25642833a7193f))
* **server-library:** a discovery answered 5xx or with a sign-in redirect keeps the remembered library ([#198](https://github.com/polandy/glissando/issues/198)) ([a9a1950](https://github.com/polandy/glissando/commit/a9a19507c90da72912640731a5f294aa5f641790))
* **server-library:** explain a proxy's non-JSON 412 instead of throwing a bare SyntaxError ([#249](https://github.com/polandy/glissando/issues/249)) ([8b2b632](https://github.com/polandy/glissando/commit/8b2b632bba2c8e3da80755c62d03c3cc25d812f8))
* **server-library:** keep the newer revision when a list or read is answered after an edit ([#197](https://github.com/polandy/glissando/issues/197)) ([662538f](https://github.com/polandy/glissando/commit/662538f7685c0b3b97aef4fb1e1cfbfbe056e40f))
* **server-library:** key copy progress by slideshow and drop the uncancellable signal ([#250](https://github.com/polandy/glissando/issues/250)) ([7ecb995](https://github.com/polandy/glissando/commit/7ecb9959aca8770708dcd5be140de26d207dff5f))
* **server-library:** read only a newerFocus 409 as newerKept on a picture focus PUT ([#247](https://github.com/polandy/glissando/issues/247)) ([97bfeb8](https://github.com/polandy/glissando/commit/97bfeb8afc54bf9ded293902416ef5514e6a16cc))
* **server-library:** show running "Keep a copy" progress in the header ([#251](https://github.com/polandy/glissando/issues/251)) ([2b979d7](https://github.com/polandy/glissando/commit/2b979d76d831f18e192fbc8bf5f7480a14b72e46))
* **server:** log and close the socket when writing an answer throws ([#246](https://github.com/polandy/glissando/issues/246)) ([e2ff8c2](https://github.com/polandy/glissando/commit/e2ff8c2c975682267167c9e5a9c0919d0d0d30da))
* **server:** never end a TV pairing in use to make room for a new session; answer 503 tvFull instead ([#196](https://github.com/polandy/glissando/issues/196)) ([73d55ca](https://github.com/polandy/glissando/commit/73d55ca0599b66095b5b433129b2f14bade291ea))
* **server:** never open the TV stream of a client that left while its request was read ([#195](https://github.com/polandy/glissando/issues/195)) ([47adde2](https://github.com/polandy/glissando/commit/47adde2a49e2aefeaee513c1a50ac3bc6f84ea00))
* **server:** only a MusicLoudnessFormatError answers 400 invalidLoudness; any other failure answers 500 ([#199](https://github.com/polandy/glissando/issues/199)) ([6bae559](https://github.com/polandy/glissando/commit/6bae559fc799fecee2aa5442041ca17fdbe3a996))
* **server:** restart unreferenced music's grace on every upload ([#256](https://github.com/polandy/glissando/issues/256)) ([ab31ef6](https://github.com/polandy/glissando/commit/ab31ef675de3463e4fcb4cdf24e69e4026dc81ef))
* **server:** stop draining an oversized body after a 1 MiB budget and close its connection ([#253](https://github.com/polandy/glissando/issues/253)) ([168fe5b](https://github.com/polandy/glissando/commit/168fe5b94c0efd117f17e9941796e9a9ae928862))
* **share-page:** make song URLs only once every song has arrived ([#209](https://github.com/polandy/glissando/issues/209)) ([2c5e9b4](https://github.com/polandy/glissando/commit/2c5e9b43d9be20993af9bc53373da903cf57764f))
* **tv:** an answer that lands after the TV sheet closed changes nothing ([#185](https://github.com/polandy/glissando/issues/185)) ([bd49c80](https://github.com/polandy/glissando/commit/bd49c806d5cd2f4090b64dc4c459cf801fc33b34))
* **ux:** a picture's hand-set timing, motion and transition say Chosen, as the glossary does ([#191](https://github.com/polandy/glissando/issues/191)) ([f7e615e](https://github.com/polandy/glissando/commit/f7e615eeafe113317cd5dfc94c26eb9c70713209))
* **ux:** browser-back guard for selections and header crumbs as links ([#161](https://github.com/polandy/glissando/issues/161)) ([c949e33](https://github.com/polandy/glissando/commit/c949e33ec372e4d06702cb63b202d6bd0d145045))
* **ux:** distinct slideshow titles — a Title field on the music step, day range when the month is taken, created date on library cards ([#167](https://github.com/polandy/glissando/issues/167)) ([a243089](https://github.com/polandy/glissando/commit/a2430891b3a431990edccfcbc58fa643b5a13b4c))
* **ux:** every control owns a 44 px touch target — fine settings, header, chapter and focus sheets, clip editor ([#171](https://github.com/polandy/glissando/issues/171)) ([58cb968](https://github.com/polandy/glissando/commit/58cb96889a9ac19453e181881e35f742894fd6c7))
* **ux:** every dotted line in the app gives its " · " room, and keeps within its width when it wraps at a dot ([#193](https://github.com/polandy/glissando/issues/193)) ([e93bda8](https://github.com/polandy/glissando/commit/e93bda8718e7e03c79dc9db0599c4d14a978e55b))
* **ux:** export failures explained, codec note, one size scale, Immich only with a server, Esc as Back ([#162](https://github.com/polandy/glissando/issues/162)) ([b1cb9ae](https://github.com/polandy/glissando/commit/b1cb9ae8c5c2759002ed21092ea72826f8c0e87e))
* **ux:** hints say the outcome, not the mechanics — transition and preparing copy ([#172](https://github.com/polandy/glissando/issues/172)) ([c8bf430](https://github.com/polandy/glissando/commit/c8bf430f43f2cd6133a83baff7183ccb7bcd4964))
* **ux:** labelled selection bar, one-gesture reorder on touch, 44 px touch targets ([#164](https://github.com/polandy/glissando/issues/164)) ([910ab6a](https://github.com/polandy/glissando/commit/910ab6a5de0660fcf17fa1bff2027c73e32b2ab3))
* **ux:** music editor essentials first, one fit notice, info popovers, 44 px touch targets ([#165](https://github.com/polandy/glissando/issues/165)) ([824c4f1](https://github.com/polandy/glissando/commit/824c4f1caa562ddbbb1d5403671e46fe2036de6b))
* **ux:** picture editor Timing section with a length slider, caption undo, 44 px touch targets ([#166](https://github.com/polandy/glissando/issues/166)) ([4f15616](https://github.com/polandy/glissando/commit/4f15616ea46af8a50cf8f8ae5dd1b4c2aa30424d))
* **ux:** slideshow screen puts Play and pictures first, inline trip chapters ([#163](https://github.com/polandy/glissando/issues/163)) ([08f6f90](https://github.com/polandy/glissando/commit/08f6f90261ab115744388bc8c07a5114e2a18247))
* **ux:** the clip editor's handles and the install hint's close button keep their 44 px square on screen ([#188](https://github.com/polandy/glissando/issues/188)) ([be548ef](https://github.com/polandy/glissando/commit/be548ef34aa044199bce5f499b912b2987d1c921))
* **ux:** the picture editor's length hints and own-motion line say what you get, not how it is worked out ([#190](https://github.com/polandy/glissando/issues/190)) ([bc670e4](https://github.com/polandy/glissando/commit/bc670e4a2bf6f2e6f78d6c564288500838576a14))
* **ux:** the Transitions summary's dot gets room, and developer prose says chosen, as the glossary does ([#192](https://github.com/polandy/glissando/issues/192)) ([6e875b2](https://github.com/polandy/glissando/commit/6e875b22761246c8167f35bf816d2db2faaacfd2))
* **ux:** undo for removals, loading labels, route skeletons, phone search label ([#160](https://github.com/polandy/glissando/issues/160)) ([74cf6f2](https://github.com/polandy/glissando/commit/74cf6f28116cfc7f6f6abd00097296244c8f90c5))
* **video-export:** build the video encoder inside prepare so a failure resolves and cleans up ([#208](https://github.com/polandy/glissando/issues/208)) ([4fe6780](https://github.com/polandy/glissando/commit/4fe678001893b2f1e2bb6db0ce1baae20ee70226))
* **video-export:** sweep only private exports no tab holds a lock for ([#207](https://github.com/polandy/glissando/issues/207)) ([d124faa](https://github.com/polandy/glissando/commit/d124faad3e5096695f3c5b6b3c9d78f36bf3d863))


### Miscellaneous Chores

* release 0.1.0 ([#321](https://github.com/polandy/glissando/issues/321)) ([47244c7](https://github.com/polandy/glissando/commit/47244c77591129e6e55a927e0ec4b4f032f2951e))

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
