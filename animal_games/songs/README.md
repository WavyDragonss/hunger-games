# Music Player Songs Directory

Add your `.mp3` files here for the music player.

## Current Songs Configuration

The music player is initialized with these songs in `animal.js`:
- `apocalypse.mp3` — Apocalypse by Cigarettes After Sex
- `sweater-weather.mp3` — Sweater Weather by The Neighbourhood
- `until-i-found-you.mp3` — Until I Found You by Stephen Sanchez

## How to Add New Songs

1. Add `.mp3` files to this directory
2. Update the `animalGamesSongs` array in `animal_games/js/animal.js`
3. Each song entry needs:
   - `file`: path relative to HTML file (e.g., `"songs/song.mp3"`)
   - `title`: display name (e.g., `"Artist Name — Song Title"`)

## For Other Games (Porting)

The music player is a reusable module. To add it to `duck_games` or `maze_runner`:

1. Copy `music-player.js` to that game's `js/` folder
2. Add to HTML header:
   ```html
   <div class="music-player-container">
     <div id="now-playing" class="now-playing"></div>
     <audio id="player"></audio>
   </div>
   ```
3. Copy music player CSS to that game's `css/` file:
   ```css
   .music-player-container { ... }
   .now-playing { ... }
   ```
4. In that game's JS, add before the closing `})();`:
   ```js
   var gameSongs = [
     { file: "songs/song1.mp3", title: "Song Title" },
     { file: "songs/song2.mp3", title: "Song Title" }
   ];
   if (typeof initMusicPlayer === "function") {
     initMusicPlayer(gameSongs);
   }
   ```
5. Create a `songs/` directory in that game's folder
6. Import both `music-player.js` and game JS in HTML

See `animal_games/` for reference implementation.
