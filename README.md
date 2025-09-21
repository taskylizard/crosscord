## crosscord

0. YOU ARE ON YOUR OWN. YOU WILL NEED THE PURCHASED GAME FILES TO USE THIS.
1. You will need: ffmpeg (unused but will be used in the future), bun, oxipng, cloudflared. You will also need the game files in the `CrossCode/` directory.
2. Clone this repo, and run `bun run compile` to compile the game to make it load faster (it will be compiled to `compiled/`)
3. Create a new app in the discord developer portal. Copy the client ID and client secret from the developer portal in the OAuth2 section, and put them in `.env` as `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` respectively.
4. Now, in two terminals, run `bun run start` and `bun run tunnel` to start the server and tunnel it to cloudflared.
5. Copy the URL that cloudflared gives you.
6. Create a new app in the discord developer portal, and you want to set the following:
   - OAuth2 > Redirect URIs: `https://127.0.0.1`
   - Activities > Settings > Enable Activities: Toggle it on
   - Activities > URL Mappings > Set Root Mapping to your cloudflared URL. Create a new proxy path mapping to `/{assets}/` to target to `<your cloudflared url>/{assets}/`.

Now, you should be able to start the activity and it should work (I think).

This is for educational purposes only, and I am not responsible for any damage that may occur to your computer or your discord account.
