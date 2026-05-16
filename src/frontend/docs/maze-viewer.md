# MazeViewer (frontend)

Este documento descreve o componente MazeViewer e como ele pode ser conectado ao backend que recebera os pacotes do embarcado.

## Arquitetura geral

- MazeViewer renderiza o grid do labirinto e o estado do robo em tempo real.
- A fonte de dados atual e um mock local (createMockTelemetry).
- O grid e criado por createMaze e atualizado por markVisited e markWall.

Arquivos relacionados:

- src/components/maze/MazeViewer.tsx
- src/components/maze/mockTelemetry.ts
- src/components/maze/mazeUtils.ts
- src/components/maze/types.ts

## Estado principal do componente

MazeViewer mantem:

- gridSize: tamanho do labirinto (16, 8, 4).
- maze: matriz de celulas com paredes e visitadas.
- position: posicao atual do robo.
- direction: direcao atual do robo.
- path: historico de posicoes visitadas.
- sessionStatus: idle | running | finished.

## Fluxo de atualizacao

1. startSession seta sessionStatus para running.
2. useEffect cria a telemetria (mock) e inicia o ciclo.
3. A cada update:
   - Se hitWall: marca parede com markWall.
   - Se moved: marca visitado com markVisited, atualiza posicao e caminho.
4. onFinish encerra a sessao e para a telemetria.

## Estrutura de dados esperada

O componente espera atualizacoes no formato TelemetryUpdate:

- position: { row, col }
- direction: north | south | east | west
- moved: boolean
- hitWall: boolean
- wallDir?: direcao da parede quando hitWall for true

## Como substituir o mock pelo backend

O objetivo e trocar createMockTelemetry por uma fonte real (WebSocket, SSE ou polling HTTP).

Sugestao de passos:

1. Criar um client para receber eventos do backend.
   - WebSocket: abrir conexao, escutar mensagens e fechar no cleanup.
   - SSE: EventSource com cleanup.
   - HTTP: setInterval para buscar o ultimo pacote.

2. Mapear o payload do backend para TelemetryUpdate.
   - Garantir que position e direction sejam coerentes com o grid.
   - Definir moved e hitWall a partir do pacote do embarcado.

3. Substituir o trecho que chama createMockTelemetry.
   - Em vez de createMockTelemetry, registrar os handlers no client real.
   - Em onTelemetry, reaproveitar a mesma logica de markWall e markVisited.

4. Controlar o ciclo de vida.
   - Iniciar a conexao quando sessionStatus vira running.
   - Fechar a conexao no cleanup do useEffect.
   - Ao trocar gridSize, reiniciar a sessao (ja feito em updateGridSize).

## Observacoes para integracao

- O grid usa coordenadas row/col com origem em (0,0) no canto superior esquerdo.
- Se o backend enviar posicoes fora do grid, isInsideMaze deve ser usado antes de atualizar.
- Se quiser registrar passos no backend, o contador local stepRef pode ser reaproveitado.

## Exemplo de handler (pseudo)

function onBackendMessage(payload) {
const update = mapPayloadToTelemetryUpdate(payload);
if (update.hitWall && update.wallDir) {
setMaze(prev => markWall(prev, positionRef.current, update.wallDir));
setDirection(update.direction);
return;
}
if (update.moved) {
stepRef.current += 1;
setMaze(prev => markVisited(prev, update.position, stepRef.current));
setPath(prev => [...prev, update.position]);
setPosition(update.position);
positionRef.current = update.position;
setDirection(update.direction);
}
}
