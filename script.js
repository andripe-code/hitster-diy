let currentStream = null; // Armazenar o stream da câmera
let audioPlayer = null;   // Player de áudio
let currentMusic = null;  // Música atual
let currentTrackId = null; // ID do track

// Função para configurar o player de música
function setupPlayer(trackUrl) {
    // Criar um player de áudio simples (para qualquer música)
    audioPlayer = new Audio(trackUrl);
    audioPlayer.controls = true; // Ativar controles padrão
    document.getElementById('spotifyPlayerContainer').innerHTML = ''; // Limpar conteúdo anterior
    document.getElementById('spotifyPlayerContainer').appendChild(audioPlayer);
    document.getElementById('controls').style.display = 'block'; // Mostrar controles de play/pause

    // Aguardar o player carregar
    audioPlayer.oncanplay = () => {
        audioPlayer.play();
    };
}

// Função para escanear o QR Code
document.getElementById('scan').addEventListener('click', async () => {
    const video = document.getElementById('camera');
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // Se o stream estiver ativo, pare-o antes de reiniciar
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    try {
        // Iniciar o stream de vídeo
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = currentStream;

        // Função de leitura do QR Code
        const scanQR = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    alert("QR Code detectado: " + code.data);

                    // Se for um link do Spotify
                    if (code.data.includes("spotify.com")) {
                        const trackId = code.data.split("track:")[1] || code.data.split("playlist:")[1];
                        currentTrackId = trackId;

                        const iframe = `<iframe src="https://open.spotify.com/embed/track/${trackId}" width="300" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
                        document.getElementById("spotifyPlayerContainer").innerHTML = iframe;

                        // Ativar controles play/pause para o player do Spotify
                        document.getElementById('playBtn').addEventListener('click', () => {
                            document.querySelector('iframe').contentWindow.postMessage('{"command":"play"}', '*');
                        });
                        document.getElementById('pauseBtn').addEventListener('click', () => {
                            document.querySelector('iframe').contentWindow.postMessage('{"command":"pause"}', '*');
                        });
                    } else {
                        // Se for qualquer outro link de música
                        setupPlayer(code.data);
                    }
                }
            }
            requestAnimationFrame(scanQR);
        };

        scanQR(); // Começar a leitura do QR Code

    } catch (error) {
        alert("Erro ao acessar a câmera: " + error.message);
    }
});

// Funções de play e pause
document.getElementById('playBtn').addEventListener('click', () => {
    if (audioPlayer) {
        audioPlayer.play();
    }
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    if (audioPlayer) {
        audioPlayer.pause();
    }
});
