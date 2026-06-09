import { test, expect } from '@playwright/test';
import { MonitoramentoPage } from '../pages/MonitoramentoPage';
import {
  eventoSessaoIniciada,
  eventoAtualizacaoTelemetria,
  eventoConexaoPerdida,
} from '../fixtures/mock-telemetria';

/**
 * Suíte E2E — Tela de Monitoramento em Tempo Real
 *
 * Rastreabilidade:
 *   CT-S01 → HU-20 (Comunicação com Micromouse)
 *   CT-S02 → HU-10 (Validação da telemetria)
 *   CT-S03 → HU-09, HU-11, HU-12 (Monitoramento, sessão, trajeto)
 *   CT-S04 → HU-13, HU-15 (Indicadores e alertas)
 */

test.describe('CT-S01 | HU-20 — Recepção de Telemetria', () => {
  test('deve carregar a tela de monitoramento com sucesso', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    await monitoramento.navegar();

    await expect(page).toHaveTitle(/frontend/i);
  });

  test('deve exibir o painel de sessão na tela principal', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    // Usa navegarParaSession para manter a Session visível (sem entrar no monitoramento)
    await monitoramento.navegarParaSession();

    await expect(monitoramento.painelSessao()).toBeVisible();
  });

  test('deve atualizar o estado da interface ao receber evento SESSAO_INICIADA via WebSocket', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    // Entra no labirinto para ter o mapa visível
    await monitoramento.navegarParaLabirinto();

    await monitoramento.simularEventoWebSocket(eventoSessaoIniciada);

    await expect(monitoramento.mapaLabirinto()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('CT-S02 | HU-10 — Validação da Telemetria Recebida', () => {
  test('deve manter a interface estável ao receber pacote de telemetria válido', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    await monitoramento.navegarParaLabirinto();

    await monitoramento.simularEventoWebSocket(eventoSessaoIniciada);
    await monitoramento.simularEventoWebSocket(eventoAtualizacaoTelemetria);

    // Interface não deve quebrar com pacote válido
    await expect(monitoramento.mapaLabirinto()).toBeVisible({ timeout: 3000 });
    await expect(monitoramento.indicadorBateria()).toBeVisible();
  });

  test('não deve exibir dado corrompido nos indicadores ao receber pacote inválido', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    await monitoramento.navegar();

    // Simula pacote inválido (campo obrigatório ausente)
    await monitoramento.simularEventoWebSocket({ type: 'ATUALIZACAO_TELEMETRIA', data: null });

    // Indicadores devem permanecer sem travamento
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('null');
  });
});

test.describe('CT-S03 | HU-09, HU-11, HU-12 — Monitoramento em Tempo Real', () => {
  test('deve exibir o mapa do labirinto ao iniciar sessão', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    await monitoramento.navegarParaLabirinto();

    await monitoramento.simularEventoWebSocket(eventoSessaoIniciada);

    await expect(monitoramento.mapaLabirinto()).toBeVisible({ timeout: 3000 });
  });

  test('deve atualizar a posição do robô ao receber pacote de movimentação', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    await monitoramento.navegar();

    await monitoramento.simularEventoWebSocket(eventoSessaoIniciada);
    await monitoramento.simularEventoWebSocket(eventoAtualizacaoTelemetria);

    await expect(monitoramento.posicaoRobo()).toBeVisible({ timeout: 3000 });
  });

  test('deve exibir alerta visual ao detectar CONEXAO_PERDIDA (HU-09)', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    await monitoramento.navegar();

    await monitoramento.simularEventoWebSocket(eventoConexaoPerdida);

    await expect(monitoramento.alertaConexaoPerdida()).toBeVisible({ timeout: 4000 });
  });

  test('deve indicar status Online quando conexão está ativa (HU-09)', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    await monitoramento.navegar();

    await monitoramento.simularEventoWebSocket(eventoSessaoIniciada);

    await expect(monitoramento.statusConexao()).toContainText(/online/i, { timeout: 3000 });
  });

  test('deve indicar status Offline após receber CONEXAO_PERDIDA (HU-09)', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    await monitoramento.navegar();

    await monitoramento.simularEventoWebSocket(eventoConexaoPerdida);

    await expect(monitoramento.statusConexao()).toContainText(/offline/i, { timeout: 4000 });
  });
});

test.describe('CT-S04 | HU-13, HU-15 — Indicadores de Desempenho e Alertas', () => {
  test('deve exibir o indicador de bateria na tela (HU-13)', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    await monitoramento.navegar();

    await expect(monitoramento.indicadorBateria()).toBeVisible();
  });

  test('deve exibir o indicador de velocidade na tela (HU-13)', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    await monitoramento.navegar();

    await expect(monitoramento.indicadorVelocidade()).toBeVisible();
  });

  test('deve exibir o indicador de tempo decorrido na tela (HU-13)', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    await monitoramento.navegar();

    await expect(monitoramento.indicadorTempo()).toBeVisible();
  });

  test('deve atualizar o valor da bateria ao receber telemetria (HU-13)', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    await monitoramento.navegar();

    await monitoramento.simularEventoWebSocket(eventoSessaoIniciada);
    await monitoramento.simularEventoWebSocket(eventoAtualizacaoTelemetria);

    // Bateria do mock é 98.5 — deve aparecer na interface
    await expect(monitoramento.indicadorBateria()).not.toBeEmpty({ timeout: 3000 });
  });

  test('deve exibir alerta de evento crítico quando acionado (HU-15)', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    await monitoramento.navegar();

    await monitoramento.simularEventoWebSocket({
      type: 'ALERTA_CRITICO',
      data: { descricao: 'Bateria crítica' },
    });

    await expect(monitoramento.alertaEventoCritico()).toBeVisible({ timeout: 3000 });
  });

  test('alertas críticos devem estar visíveis sem scroll ou interação (HU-15)', async ({ page }) => {
    const monitoramento = new MonitoramentoPage(page);
    await monitoramento.navegar();

    await monitoramento.simularEventoWebSocket({ type: 'ALERTA_CRITICO', data: { descricao: 'Parada inesperada' } });

    const alerta = monitoramento.alertaEventoCritico();
    await expect(alerta).toBeVisible({ timeout: 3000 });
    await expect(alerta).toBeInViewport();
  });
});