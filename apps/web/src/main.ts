import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';
import { pwa } from './lib/pwa.svelte';
import { unlockAudioOnFirstGesture } from './lib/sound/synth';
import './app.css';

const target = document.getElementById('app');
if (!target) throw new Error('Elemento #app não encontrado');

// Service worker: guarda o jogo no aparelho para funcionar sem internet
const updateSW = registerSW({
  onOfflineReady() {
    pwa.offlineReady = true;
  },
  onNeedRefresh() {
    pwa.updateReady = true;
  },
});
pwa.update = () => void updateSW(true);

// Sons: os navegadores só liberam o áudio depois do primeiro toque ou tecla
unlockAudioOnFirstGesture();

export default mount(App, { target });
