# Quickfire

Quickfire is a real-time trivia party game for 2–8 players. One player hosts a room, everyone else joins from their own device with a five-character room code, and the group competes across eight quick-fire questions.

## How to play

- Each question has four answer choices and a 15-second timer.
- Before answering, choose a confidence wager of 1, 2, or 3 points.
- Correct answers earn the wager. Wrong answers lose the wager, down to a minimum score of zero. A blank answer earns zero points.
- Answers stay hidden until the timer runs out. The game reveals the correct answer and updated scores after each question.
- After eight questions, the player with the highest score wins. Ties share the win.

## Run locally

You’ll need Node.js 18 or newer.

1. Open a terminal in the Quickfire project folder.
2. Start the game:

   ```bash
   npm start
   ```

3. Open [http://localhost:4173](http://localhost:4173) in your browser.

To join from a phone or another computer on the same Wi-Fi, use the network address printed in the terminal and enter the room code shown by the host.

## Deploy on Render

Quickfire’s Node.js server serves both the web app and the real-time game connection. To deploy it as a Render Web Service:

1. Push the project to a GitHub repository.
2. In Render, choose **New → Web Service** and connect that repository.
3. Set the build command to `npm install` and the start command to `npm start`.
4. Deploy, then share the `onrender.com` URL Render provides.

Keep the service at one instance while room data is stored in memory. Adding instances can split players across separate room lists. Restarting or redeploying the service clears active rooms. For deployment-specific settings, see [Render’s web service documentation](https://render.com/docs/web-services).

## Project files

- `server.js` — HTTP server, WebSocket connections, rooms, timers, questions, and scoring.
- `public/index.html` — page structure and rules dialog.
- `public/style.css` — responsive game-show styling.
- `public/app.js` — browser interface and real-time game interactions.
- `package.json` — project metadata and the `npm start` command.
