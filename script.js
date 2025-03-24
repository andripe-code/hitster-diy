document.getElementById('scan').addEventListener('click', async () => {
    const video = document.getElementById('camera');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;

    alert("Aponte a câmera para o QR Code!");
});
