// Variáveis globais
let player;
let currentTrack = null;
let isScanning = false;

// Inicializa o player do Spotify
window.onSpotifyWebPlaybackSDKReady = () => {
  const token = 'SEU_TOKEN_DE_ACESSO_AQUI'; // Substitua pelo seu token
  player = new Spotify.Player({
    name: 'Hitster Game',
    getOAuthToken: cb => { cb(token); },
    volume: 0.5
  });

  player.connect().then(success => {
    if (success) {
      console.log('Player conectado!');
    }
  });
};

// Controles do player
document.getElementById('play-btn').addEventListener('click', () => {
  player.resume();
});

document.getElementById('pause-btn').addEventListener('click', () => {
  player.pause();
});

document.getElementById('next-btn').addEventListener('click', () => {
  startCamera();
});

// Escaneamento de QR code
document.getElementById('scan-btn').addEventListener('click', () => {
  startCamera();
});

function startCamera() {
  const video = document.getElementById('camera');
  const status = document.getElementById('status');

  if (isScanning) {
    video.style.display = 'none';
    isScanning = false;
    status.textContent = 'Aguardando escaneamento...';
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      video.srcObject = stream;
      video.style.display = 'block';
      isScanning = true;
      status.textContent = 'Aponte para um QR code do Spotify...';
      scanQRCode(video);
    })
    .catch(err => {
      status.textContent = 'Erro ao acessar a câmera: ' + err.message;
    });
}

function scanQRCode(video) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const status = document.getElementById('status');

  function tick() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        const spotifyUrl = code.data;
        if (spotifyUrl.includes('spotify.com')) {
          playSpotifyTrack(spotifyUrl);
          video.style.display = 'none';
          isScanning = false;
          status.textContent = 'Música carregada!';
          return;
        }
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
}

function playSpotifyTrack(url) {
  // Extrai o ID da música do link do Spotify (ex: spotify:track:4uLU6hMCjMI75M1A2tKUQC)
  const trackId = url.split('/').pop();
  player._options.getOAuthToken(token => {
    fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(response => response.json())
      .then(data => {
        currentTrack = data.uri;
        player.play({ uris: [currentTrack] });
      });
  });
}
