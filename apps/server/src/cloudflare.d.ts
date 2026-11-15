// Informa aos tipos da Cloudflare quais são as exportações do Worker (usado por `exports`
// de "cloudflare:workers", inclusive nos testes) e quais delas são Durable Objects.
declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import('./index');
    durableNamespaces: 'Room';
  }
}
