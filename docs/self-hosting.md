# Self-hosting Glissando with Immich

Glissando runs from any static web host and needs no server. To pick photos from your
[Immich](https://immich.app) server, run Glissando yourself, next to Immich. The installation from
the public website never shows Immich.

The self-hosted Glissando is a container image, `ghcr.io/polandy/glissando`. It holds the same
app as the public one, served by [Caddy](https://caddyserver.com), plus one route: `/immich/`
leads to your Immich server. With a data volume it also keeps slideshows on the server (step 3);
without one there is no application server behind it. The route passes on only
the few reads Glissando makes (albums, photos, faces) and adds your Immich API key on the way;
everything else is refused. The key stays inside the container: browsers never see it, and there
is no key to type into the app.

## First: protect it

**Whoever can open your Glissando can browse the photo library the API key can read.** The
container itself has no sign-in. Before you make it reachable, put it behind one of:

- your reverse proxy's sign-in, for example Authelia or another forward auth, or basic auth;
- a network boundary: only your home network, or only Tailscale (or another VPN).

Serve it over **HTTPS** through your reverse proxy, like your other services. The container speaks
plain HTTP on port 8080 and leaves TLS to the proxy; installing Glissando as an app needs HTTPS.

## 1. Create an Immich API key

In Immich, open **Account Settings → API Keys → New API Key**, name it "Glissando" and give it
exactly these permissions, nothing more:

- `album.read`
- `asset.read`
- `asset.view`
- `asset.download`
- `face.read`

Copy the key and save it in a file next to your Immich `docker-compose.yml`, for example
`glissando-immich-api-key.txt`. The container runs as user id 10001, so the file must be readable
by it (`chmod 644`, or `chown 10001` it).

The key belongs to one Immich user: everyone using this Glissando sees that user's albums and
photos, and the albums shared with that user.

## 2. Add the service to Immich's compose file

Add Glissando to the `docker-compose.yml` that runs Immich, so both share its Docker network and
Glissando reaches Immich directly:

```yaml
services:
  # … Immich's services …

  glissando:
    container_name: glissando
    image: ghcr.io/polandy/glissando:latest
    restart: always
    environment:
      IMMICH_URL: http://immich-server:2283
      IMMICH_API_KEY_FILE: /run/secrets/immich_api_key
    secrets:
      - immich_api_key
    ports:
      - "8080:8080" # or no ports at all, when your reverse proxy is on the same Docker network

secrets:
  immich_api_key:
    file: ./glissando-immich-api-key.txt
```

Then `docker compose up -d glissando`, and point your reverse proxy at port 8080 of the
container. Pin a version (`ghcr.io/polandy/glissando:0.1.0`) instead of `latest` if you update
deliberately.

### Settings

| Variable              | Meaning                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `IMMICH_URL`          | Immich's address inside the Docker network, scheme, host and port only. Unset: no Immich |
| `IMMICH_API_KEY_FILE` | A file holding the API key (a Docker secret). Preferred                                  |
| `IMMICH_API_KEY`      | The API key itself, instead of a file                                                    |
| `GLISSANDO_DATA_DIR`  | Where slideshows on the server are kept, a mounted volume (step 3). Unset: none          |

The container refuses to start, and says why in its log, when `IMMICH_URL` is set without a key,
a key is set without `IMMICH_URL`, both key variables are set, the key file cannot be read,
`GLISSANDO_DATA_DIR` is set without `IMMICH_URL` or is not a directory the container can write, or
a variable starting with `IMMICH_` or `GLISSANDO_` is not one of the above (a typo).

## 3. Optional: slideshows on the server

With a data volume, Glissando also keeps slideshows on the server: every device at home can play
and edit them, and their photos stay in Immich, linked rather than copied. Only the slideshows
themselves and their music are stored in the volume, in one SQLite database
(`library.sqlite`). Add a volume and `GLISSANDO_DATA_DIR` to the service from step 2:

```yaml
services:
  glissando:
    # … as in step 2 …
    environment:
      IMMICH_URL: http://immich-server:2283
      IMMICH_API_KEY_FILE: /run/secrets/immich_api_key
      GLISSANDO_DATA_DIR: /data
    volumes:
      - glissando-data:/data

volumes:
  glissando-data:
```

A named volume like this one is writable by the container from the start. If you mount a
directory of the host instead (`./glissando-data:/data`), make it writable for user id 10001
(`chown 10001 glissando-data`).

**Everyone who can open your Glissando can change and delete the slideshows on the server** — the
app asks before deleting, but there is no sign-in of its own; protect it as described above.
**Back up the volume** with your other backups: a deleted or changed slideshow cannot be restored
from Glissando. Copy the volume while the container is stopped, or back up the whole directory
including `library.sqlite-wal` together.

Once the volume is set, the app shows the library in two sections, "On this device" and "On your
Glissando server". A new slideshow asks "Where should it live?" (the device remembers your last
choice); one on the server takes its pictures from Immich only. On a server slideshow's screen,
⋯ offers "Keep a copy on this device" for playing it offline, and a slideshow on the device can be
copied there with "Save on the server". Without a connection to your Glissando, its slideshows
show greyed out until it is back. A photo deleted in Immich shows as "No longer in Immich" and is
skipped when playing.

## Troubleshooting

Glissando shows the state of its Immich connection in one line, in the pictures step and in the
settings. What each one means:

| Glissando says                                                | What to do                                                                                                                                                                         |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Not set up                                                    | `IMMICH_URL` is not set, or you opened the public Glissando instead of yours.                                                                                                      |
| The Glissando backend cannot reach the Immich server.         | Look at the container's log (`docker compose logs glissando`): it names the failed connection. Check that Immich runs, that `IMMICH_URL` is right and both share a Docker network. |
| Immich rejects the server's key.                              | The key is wrong or was deleted in Immich. Create a new one (step 1), replace the file, restart the container.                                                                     |
| The server's key lacks permissions: …                         | Edit the key in Immich and give it all five permissions from step 1.                                                                                                               |
| Your sign-in has expired.                                     | Your reverse proxy's sign-in ran out. Reload the page and sign in again.                                                                                                           |
| Offline — Immich needs a connection to your Glissando server. | The device is offline. Photos you already added, and every slideshow, keep working.                                                                                                |

Photos you pick are downloaded and stored on your device like pictures from its own files, so
your slideshows play without Immich and without a connection.
