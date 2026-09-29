const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
let socket;
let state = null;
let playerId = null;
let myChoice = null;
let myWager = 1;
let timerInterval = null;
let toastTimeout;
const letters = ['A', 'B', 'C', 'D'];
const colors = ['mint', 'coral', 'blue', 'gold'];

function connect() {
  return new Promise((resolve, reject) => {
    if (socket?.readyState === WebSocket.OPEN) return resolve();
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${location.host}`);
    socket.addEventListener('open', () => resolve(), { once: true });
    socket.addEventListener('error', () => reject(new Error('Could not reach the game server. Check that it is running.')), { once: true });
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.type === 'joined') {
        playerId = message.playerId;
        state = message.state;
        myChoice = null;
        myWager = 1;
        render();
      } else if (message.type === 'state') {
        const previousPhase = state?.phase;
        const previousRound = state?.round;
        state = message.state;
        if (state.phase === 'question' && (previousPhase !== 'question' || previousRound !== state.round)) {
          myChoice = null;
          myWager = 1;
        }
        render();
      } else if (message.type === 'error') showToast(message.message);
      else if (message.type === 'left') { state = null; playerId = null; renderHome(); }
    });
    socket.addEventListener('close', () => {
      if (state) showToast('Connection lost. The room is no longer connected.');
    });
  });
}

function send(message) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

function renderHome() {
  clearInterval(timerInterval);
  app.innerHTML = `
    <section class="landing">
      <div class="hero-copy">
        <div class="eyebrow">LIGHTS UP. BRAINS ON.</div>
        <div class="hero-scribble" aria-hidden="true">✳</div>
        <h1>Think fast.<br><em>Talk later.</em></h1>
        <p>The quick-fire trivia party for people who are absolutely sure they know the answer.</p>
        <div class="hero-foot"><span><b>02–08</b> PLAYERS</span><span><b>08</b> QUESTIONS</span><span><b>∞</b> BRAGGING</span></div>
      </div>
      <div class="play-card">
        <div class="card-kicker"><span class="micro-label">ROUND UP YOUR FAVORITES</span><span class="pill">✦ FREE TO PLAY</span></div>
        <div id="homeOptions" class="home-options">
          <h2>Make it a game night.</h2><p class="subcopy">One room. One code. Maximum confidence.</p>
          <button class="button button-primary button-wide" id="showCreate">CREATE A ROOM <span>→</span></button>
          <div class="divider">OR JOIN A ROOM</div>
          <label class="form-label" for="joinCode">ROOM CODE</label>
          <div class="join-row"><input class="input code-input" id="joinCode" maxlength="5" placeholder="5-LETTER CODE" autocomplete="off"><button class="button button-join" id="showJoin">JOIN <span>→</span></button></div>
          <p class="form-caption">Everyone plays on their own phone or laptop. No downloads, no trivia night referee.</p>
        </div>
        <div id="createForm" class="room-form">
          <button class="icon-button back-home">← BACK</button><h2 style="margin-top:20px">You’re the host.</h2><p class="subcopy">Pick a name your friends will recognize.</p>
          <label class="form-label" for="hostName">YOUR NAME</label><input class="input name-input" id="hostName" maxlength="18" placeholder="e.g. Quiz Khalifa" autocomplete="nickname">
          <button class="button button-primary button-wide" id="createRoom">CREATE YOUR ROOM <span>→</span></button>
          <p class="form-caption">We’ll give you a code to share with 1–7 friends.</p>
        </div>
        <div id="joinForm" class="room-form">
          <button class="icon-button back-home">← BACK</button><h2 style="margin-top:20px">You’re invited.</h2><p class="subcopy">Let’s get you in the game.</p>
          <label class="form-label" for="joinName">YOUR NAME</label><input class="input name-input" id="joinName" maxlength="18" placeholder="e.g. Quiz Khalifa" autocomplete="nickname">
          <label class="form-label" for="joinCode2">ROOM CODE</label><input class="input name-input code-input room-code-input" id="joinCode2" maxlength="5" placeholder="5-LETTER CODE" autocomplete="off">
          <button class="button button-primary button-wide" id="joinRoom">JOIN THE PARTY <span>→</span></button>
          <p class="form-caption">Ask the host for the five-letter room code.</p>
        </div>
      </div>
    </section>`;
  document.querySelector('#showCreate').onclick = () => switchForm('createForm');
  document.querySelector('#showJoin').onclick = () => {
    const code = document.querySelector('#joinCode').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    switchForm('joinForm');
    document.querySelector('#joinCode2').value = code;
  };
  document.querySelectorAll('.back-home').forEach(button => button.onclick = () => switchForm(null));
  document.querySelector('#joinCode').addEventListener('input', event => event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  document.querySelector('#joinCode2').addEventListener('input', event => event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  document.querySelector('#createRoom').onclick = async () => {
    try { await connect(); send({ type: 'create', name: document.querySelector('#hostName').value }); }
    catch (error) { showToast(error.message); }
  };
  document.querySelector('#joinRoom').onclick = async () => {
    const code = document.querySelector('#joinCode2').value;
    if (code.length !== 5) return showToast('Enter the 5-letter room code first.');
    try { await connect(); send({ type: 'join', name: document.querySelector('#joinName').value, code }); }
    catch (error) { showToast(error.message); }
  };
}

function switchForm(id) {
  document.querySelector('#homeOptions').classList.toggle('hidden', Boolean(id));
  document.querySelectorAll('.room-form').forEach(form => form.classList.toggle('active', form.id === id));
}

function avatar(name, index, size = '') {
  return `<span class="avatar ${colors[index % colors.length]} ${size}">${escapeHtml(name.trim().charAt(0).toUpperCase() || '?')}</span>`;
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function sortedPlayers() { return [...(state?.players || [])].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)); }
function render() {
  if (!state) return renderHome();
  clearInterval(timerInterval);
  if (state.phase === 'lobby') renderLobby();
  else if (state.phase === 'finished') renderResults();
  else renderQuestion();
}

function topLine() { return `<div class="game-topline"><div class="room-badge"><span class="online-dot"></span> ROOM <strong>${state.code}</strong></div><div class="connection-status"><span class="online-dot"></span> CONNECTED</div></div>`; }
function renderLobby() {
  const isHost = playerId === state.hostId;
  const players = state.players;
  app.innerHTML = `<section class="view">${topLine()}<div class="lobby-grid">
    <div class="lobby-main"><div class="eyebrow">ROOM’S OPEN</div><h1>Waiting on<br><em>your people.</em></h1><p>Send the code to your crew. The more, the merrier (and louder).</p>
      <div class="room-code-block"><strong>${state.code}</strong><span>YOUR ROOM CODE<br>SHARE IT WITH YOUR CREW</span></div>
      <div class="player-count">PLAYERS IN THE ROOM · ${players.length} / 8</div><div class="player-grid">${players.map((player, index) => `<div class="player-tile">${avatar(player.name, index)}<span class="player-name">${escapeHtml(player.name)}</span>${player.id === state.hostId ? '<span class="player-host">HOST</span>' : ''}</div>`).join('')}${players.length < 8 ? `<div class="player-tile" style="border-style:dashed;background:transparent"><span class="avatar" style="background:#2c3038;color:#7e838c">+</span><span class="player-name" style="color:#828791">Room for ${8 - players.length} more</span></div>` : ''}</div>
    </div>
    <aside class="side-panel"><div class="eyebrow">THE PLAN</div><h3>Eight rounds<br>of “I knew that.”</h3><ol class="side-steps"><li><span class="step-number">01</span><span>Pick your answer before the 15-second clock hits zero.</span></li><li><span class="step-number">02</span><span>Wager 1–3 points. More confidence, bigger swing.</span></li><li><span class="step-number">03</span><span>Right wins your wager. Wrong loses it. Score never goes below zero.</span></li></ol>${isHost ? `<button class="button button-primary button-wide" id="startGame" ${players.length < 2 ? 'disabled style="opacity:.45;cursor:not-allowed"' : ''}>${players.length < 2 ? 'WAITING FOR PLAYERS' : 'LET’S PLAY'} <span>→</span></button><p class="hint">${players.length < 2 ? 'Need at least 2 players to start.' : 'Once started, everyone plays together.'}</p>` : `<div class="waiting-note"><span class="online-dot"></span> Waiting for the host to start…</div>`}<button class="icon-button" style="margin-top:13px" id="leaveRoom">LEAVE ROOM</button></aside>
  </div></section>`;
  document.querySelector('#startGame')?.addEventListener('click', () => send({ type: 'start' }));
  document.querySelector('#leaveRoom').addEventListener('click', () => send({ type: 'leave' }));
}

function renderQuestion() {
  const question = state.question;
  const isReveal = state.phase === 'reveal';
  const mine = state.players.find(player => player.id === playerId);
  const myAnswer = myChoice ?? mine?.answered;
  const delta = state.roundPoints || {};
  const players = sortedPlayers();
  let banner = '';
  if (isReveal) {
    const correct = mine && mine.answered && Number.isInteger(myChoice) ? myChoice === question.answer : null;
    banner = `<div class="reveal-banner ${correct === false ? 'wrong' : ''}"><span class="spark">${correct === true ? '✦' : correct === false ? '×' : '✧'}</span>${correct === true ? 'NAILED IT' : correct === false ? 'NOT THIS TIME' : 'THE ANSWER IS IN'}${correct === true ? ` · +${mine.wager} PTS` : correct === false ? ` · −${mine.wager} PTS` : ''}</div>`;
  }
  const options = question.options.map((option, index) => {
    const selected = myChoice === index;
    const correct = isReveal && index === question.answer;
    const wrong = isReveal && selected && index !== question.answer;
    const count = isReveal ? `<span class="vote-count">${state.answerCounts[index]} ${state.answerCounts[index] === 1 ? 'PICK' : 'PICKS'}</span>` : '';
    return `<button class="answer-option ${selected ? 'selected' : ''} ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}" data-choice="${index}" ${isReveal || myChoice !== null ? 'disabled' : ''}><span class="answer-key">${letters[index]}</span><span>${escapeHtml(option)}</span>${count}</button>`;
  }).join('');
  app.innerHTML = `<section class="view">${topLine()}<div class="question-layout"><div class="question-panel">
    <div class="question-meta"><span class="round-label">ROUND <strong>${String(state.round + 1).padStart(2, '0')}</strong> <span style="color:#777d86">/ 08</span></span><span class="category">${question.category}</span></div>
    ${!isReveal ? '<div class="timer-row"><div class="timer-wrap"><div class="timer-bar" id="timerBar"></div></div><div class="timer-digital"><strong id="timerDigital">15</strong><span>SECONDS</span></div></div>' : ''}${banner}
    <h2 class="question-text">${escapeHtml(question.question)}</h2><div class="answer-grid">${options}</div>
    ${!isReveal ? `<div class="wager-block"><div class="wager-title">YOUR WAGER <small>Get it right to win your points.</small></div><div class="wager-options">${[1, 2, 3].map(n => `<button class="wager-option ${myWager === n ? 'active' : ''}" data-wager="${n}" ${myChoice !== null ? 'disabled' : ''}>${n} PTS</button>`).join('')}</div></div><div class="lock-note" id="lockNote">${myChoice !== null ? '<strong>ANSWER LOCKED.</strong> Waiting for the clock.' : 'Choose your wager, then pick an answer.'}</div>` : `<div class="lock-note">THE CORRECT ANSWER IS HIGHLIGHTED</div>`}
  </div><aside class="score-panel"><div class="score-head"><h3>Scoreboard</h3><span>${isReveal ? 'ROUND ' + String(state.round + 1).padStart(2, '0') : 'LIVE'}</span></div><div class="score-list">${players.map((player, index) => `<div class="score-row ${player.id === playerId ? 'me' : ''}">${avatar(player.name, index)}<span class="player-name">${escapeHtml(player.name)}${player.id === playerId ? ' · YOU' : ''}</span><span class="score-value">${player.score}${isReveal && delta[player.id] ? `<span class="score-delta ${delta[player.id] < 0 ? 'minus' : ''}">${delta[player.id] > 0 ? '+' : ''}${delta[player.id]}</span>` : ''}</span></div>`).join('')}</div><div class="score-subtitle">${isReveal ? 'Next question loading…' : 'Your answer is private until the timer ends.'}</div>${!isReveal && myChoice !== null ? '<div class="waiting-card"><b>Locked in. Nice.</b><span>Your answer stays hidden until the clock runs out.</span></div>' : ''}</aside></div></section>`;
  if (!isReveal) {
    document.querySelectorAll('[data-wager]').forEach(button => button.onclick = () => { myWager = Number(button.dataset.wager); renderQuestion(); });
    document.querySelectorAll('[data-choice]').forEach(button => button.onclick = () => {
      if (myChoice !== null) return;
      myChoice = Number(button.dataset.choice);
      send({ type: 'answer', choice: myChoice, wager: myWager });
      renderQuestion();
    });
    updateTimer();
    timerInterval = setInterval(updateTimer, 100);
  }
}

function updateTimer() {
  const bar = document.querySelector('#timerBar');
  if (!bar || !state?.deadline) return;
  const remaining = Math.max(0, state.deadline - Date.now());
  bar.style.width = `${Math.min(100, remaining / 15000 * 100)}%`;
  bar.classList.toggle('urgent', remaining < 5000);
  const digital = document.querySelector('#timerDigital');
  if (digital) digital.textContent = String(Math.ceil(remaining / 1000)).padStart(2, '0');
}

function renderResults() {
  const players = sortedPlayers();
  const isHost = playerId === state.hostId;
  const winner = players[0];
  const tied = players.filter(player => player.score === winner?.score);
  const title = tied.length > 1 ? 'It’s a dead heat!' : `${escapeHtml(winner?.name || 'Someone')} takes it!`;
  app.innerHTML = `<section class="view">${topLine()}<div class="results-hero"><span class="trophy">🏆</span><div class="eyebrow">THAT’S ALL, FOLKS</div><h1>${title}</h1><p>${tied.length > 1 ? 'Same score, same bragging rights.' : 'The room has a new trivia champion.'}</p></div><div class="final-podium">${players.map((player, index) => `<div class="podium-row ${index === 0 ? 'first' : ''}"><span class="place">${String(index + 1).padStart(2, '0')}</span><span class="podium-player">${avatar(player.name, index)}${escapeHtml(player.name)}${player.id === playerId ? ' · YOU' : ''}</span><span class="podium-score">${player.score} PTS</span></div>`).join('')}</div><div class="results-buttons">${isHost ? '<button class="button button-primary" id="newGame">PLAY AGAIN <span style="margin-left:13px">↻</span></button>' : '<span class="waiting-note" style="margin:0;border:0">Waiting for the host to start another game…</span>'}<button class="button button-dark" id="exitGame">BACK TO HOME</button></div></section>`;
  document.querySelector('#newGame')?.addEventListener('click', () => send({ type: 'start' }));
  document.querySelector('#exitGame').onclick = () => send({ type: 'leave' });
}

document.querySelector('#rulesButton').onclick = () => document.querySelector('#rulesOverlay').classList.remove('hidden');
document.querySelectorAll('[data-close-rules]').forEach(button => button.onclick = () => document.querySelector('#rulesOverlay').classList.add('hidden'));
document.querySelector('#rulesOverlay').addEventListener('click', event => { if (event.target.id === 'rulesOverlay') event.currentTarget.classList.add('hidden'); });
renderHome();
