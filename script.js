// ===== CONFIGURAÇÕES OBRIGATÓRIAS ===== //
const CLIENT_ID = 'f114a11b46e34abd89dd962963c9f155'; // 👈 Obtenha em developer.spotify.com
const REDIRECT_URI = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://andripe-code.github.io/hitster-diy/'; // 👈 Substitua pelo seu

const SCOPES = 'streaming user-read-email user-read-private';

// ===== VARIÁVEIS GLOBAIS ===== //
let player;
let currentTrack = null;
let isScanning = false;
let accessToken = null;
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ===== ELEMENTOS DO DOM ===== //
const elements = {
  loginSection: document.getElementById('login-section'),
  gameSection: document.getElementById('game-section'),
  mobileWarning: document.getElementById('mobile-warning'),
  mobilePlayer: document.getElementById('mobile-player'),
  mobilePlayLink: document.getElementById('mobile-play-link'),
  camera: document.getElementById('camera'),
  status: document.getElementById('status'),
  errorContainer: document.getElementById('error-container')
};

// ===== FUNÇÕES PRINCIPAIS ===== //

// Inicialização
document.addEventListener('DOMContentLoaded', init);

function init() {
  showDebugInfo();
  setupEventListeners();
  checkAuth();
}

function showDebugInfo() {
  console.log(`Dispositivo: ${isMobile ? 'Mobile' : 'Desktop'}`);
  console.log(`URL atual: ${window.location.href}`);
}

function setupEventListeners() {
  document.getElementById('login-btn').addEventListener('click', startAuthFlow);
  document.getElementById('scan-btn').addEventListener('click', toggleCamera);
  document.getElementById('next-btn').addEventListener('click', toggleCamera);
}

function checkAuth() {
  if (window.location.hash.includes('access_token')) {
    handleAuthRedirect();
  } else if (window.location.hash.includes('error')) {
    showError(`Erro de autenticação: ${new URLSearchParams(window.location.hash.substring(1)).get('error')}`);
  }
}

// Autenticação com Spotify
function startAuthFlow() {
  const state = generateRandomString(16);
  localStorage.setItem('spotify_auth_state', state);
  
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('response_type', 'token');
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('scope', SCOPES);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('show_dialog', 'true');
  
  window.location.href = authUrl.toString();
}

function handleAuthRedirect() {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  
  // Verifica estado para prevenir CSRF
  const state = hashParams.get('state');
  const storedState = localStorage.getItem('spotify_auth_state');
  
  if (state !== storedState) {
    showError('Erro de segurança: Estado inválido');
    return;
  }
  
  accessToken = hashParams.get('access_token');
  localStorage.removeItem('spotify_auth_state');
  
  // Limpa a URL
  window.history.replaceState({}, document.title, window.location.pathname);
  
  initGame();
}

// Configuração do jogo
function initGame() {
  elements.loginSection.classList.add('hidden');
  elements.gameSection.classList.remove('hidden');
  
  if (isMobile) {
    elements.mobileWarning.classList.remove('hidden');
    elements.mobilePlayer.classList.remove('hidden');
    document.getElementById('play-btn').style.display = 'none';
    document.getElementById('pause-btn').style.display = 'none';
  } else {
    initSpotifyPlayer();
  }
}

function initSpotifyPlayer() {
  window.onSpotifyWebPlaybackSDKReady = () => {
    player = new Spotify.Player({
      name: 'Hitster Game',
      getOAuthToken: cb => { cb(accessToken); },
      volume: 0.5
    });

    player.addListener('ready', ({ device_id }) => {
      console.log('Dispositivo pronto:', device_id);
    });

    player.addListener('initialization_error', ({ message }) => {
      showError(`Erro no player: ${message}`);
    });

    player.connect().then(success => {
      if (!success) showError('Falha ao conectar ao Spotify');
    });

    // Configura controles
    document.getElementById('play-btn').addEventListener('click', () => player.resume());
    document.getElementById('pause-btn').addEventListener('click', () => player.pause());
  };
}

// Controle da câmera
function toggleCamera() {
  if (isScanning) {
    stopCamera();
  } else {
    startCamera();
  }
}

function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showError('API de câmera não suportada neste navegador');
    return;
  }

  elements.status.innerHTML = '<i class="fas fa-camera"></i> Iniciando câmera...';

  navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  })
  .then(stream => {
    elements.camera.srcObject = stream;
    elements.camera.onloadedmetadata = () => {
      elements.camera.play();
      elements.camera.style.display = 'block';
      isScanning = true;
      elements.status.innerHTML = '<i class="fas fa-camera"></i> Aponte para um QR code do Spotify...';
      scanQRCode();
    };
  })
  .catch(handleCameraError);
}

function stopCamera() {
  if (elements.camera.srcObject) {
    elements.camera.srcObject.getTracks().forEach(track => track.stop());
  }
  elements.camera.style.display = 'none';
  isScanning = false;
  elements.status.innerHTML = '<i class="fas fa-sync-alt"></i> Aguardando escaneamento...';
}

function handleCameraError(err) {
  let message = 'Erro na câmera: ';
  switch(err.name) {
    case 'NotAllowedError':
      message += 'Permissão negada. Por favor, permita o acesso à câmera.';
      break;
    case 'NotFoundError':
      message += 'Nenhuma câmera encontrada.';
      break;
    case 'NotSupportedError':
      message += 'O navegador não suporta câmera em páginas não seguras (HTTP). Use HTTPS.';
      break;
    default:
      message += err.message;
  }
  showError(message);
}

// Leitura de QR Code
function scanQRCode() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  function tick() {
    if (!isScanning) return;
    
    try {
      if (elements.camera.readyState === elements.camera.HAVE_ENOUGH_DATA) {
        canvas.width = elements.camera.videoWidth;
        canvas.height = elements.camera.videoHeight;
        context.drawImage(elements.camera, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          if (code.data.includes('spotify.com')) {
            handleSpotifyLink(code.data);
            stopCamera();
            return;
          }
        }
      }
      requestAnimationFrame(tick);
    } catch (err) {
      showError(`Erro no scanner: ${err.message}`);
    }
  }
  tick();
}

// Controle de músicas
function handleSpotifyLink(url) {
  try {
    const trackId = extractTrackId(url);
    
    if (isMobile) {
      // Mobile: Abre no app
      const spotifyUri = `spotify:track:${trackId}`;
      elements.mobilePlayLink.href = spotifyUri;
      elements.status.innerHTML = '<i class="fas fa-check-circle"></i> Música pronta! Clique em "Abrir no Spotify"';
    } else {
      // Desktop: Toca no Web Player
      playOnDesktop
