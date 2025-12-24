"use strict";
const statusText = document.getElementById('statusText');
const onlineDot = document.getElementById('onlineDot');
const installButton = document.getElementById('installButton');
let deferredPrompt = null;
const updateConnectionStatus = () => {
    if (!statusText || !onlineDot)
        return;
    const online = navigator.onLine;
    statusText.textContent = online ? 'You are online' : 'Offline — cached copy';
    onlineDot.style.background = online ? '#22c55e' : '#f59e0b';
    onlineDot.style.boxShadow = online
        ? '0 0 0 6px rgba(34, 197, 94, 0.12)'
        : '0 0 0 6px rgba(245, 158, 11, 0.18)';
};
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
updateConnectionStatus();
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch((err) => {
            console.error('Service worker registration failed:', err);
        });
    });
}
window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installButton)
        installButton.hidden = false;
});
installButton?.addEventListener('click', async () => {
    if (!deferredPrompt)
        return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted' && installButton) {
        installButton.textContent = 'Ready to install!';
    }
    deferredPrompt = null;
    installButton.hidden = true;
});
