let currentStream = null; // Armazenar o stream da câmera

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

                    // Verificação do link do Spotify
                    if (code.data.includes("spotify.com")) {
                        // Extrair o ID da música ou playlist do link do Spotify
                        const trackId = code.data.split("track:")[1] || code.data.split("playlist:")[1];

                        // Gerar o código do iframe para embutir o player
                        const iframe = `<iframe src="https://open.spotify.com/embed/track/${trackId}" width="300" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
                        
                        // Inserir o player na página
                        document.getElementById("spotifyPlayerContainer").innerHTML = iframe;
                    } else {
                        alert("Esse QR Code não é do Spotify.");
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
