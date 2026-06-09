import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object — Tela de Monitoramento em Tempo Real
 * Rastreabilidade: HU-09, HU-11, HU-12, HU-13, HU-15, HU-20
 */
export class MonitoramentoPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ── Navegação ────────────────────────────────────────────────

  /**
   * Navega para "/" sem entrar no monitoramento.
   * Deixa o painel de sessão (Session.tsx) visível.
   * Usar para testes que verificam o painel de sessão.
   */
  async navegarParaSession() {
    await this.page.goto('/');
    await expect(this.page.locator('[data-testid="painel-sessao"]')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Navega para a tela de Telemetria/Monitoramento (TelemetriaPage).
   * Clica em btn-entrar-monitoramento para sair da Session.
   * Indicadores de desempenho e status-conexao ficam visíveis aqui.
   */
  async navegar() {
    await this.page.goto('/');
    const btnEntrar = this.page.locator('[data-testid="btn-entrar-monitoramento"]');
    await expect(btnEntrar).toBeVisible({ timeout: 5000 });
    await btnEntrar.click();
    await expect(this.statusConexao()).toBeVisible({ timeout: 5000 });
  }

  /**
   * Navega para a view do Labirinto (LabirintoPage).
   * Necessário para testes que verificam mapa-labirinto.
   */
  async navegarParaLabirinto() {
    await this.navegar();
    await this.page.locator('[data-testid="nav-labirinto"]').click();
    await expect(this.mapaLabirinto()).toBeVisible({ timeout: 5000 });
  }

  // ── Status de Conexão (HU-09) ─────────────────────────────────
  statusConexao(): Locator {
    return this.page.locator('[data-testid="status-conexao"]');
  }

  alertaConexaoPerdida(): Locator {
    return this.page.locator('[data-testid="alerta-conexao-perdida"]');
  }

  async aguardarStatusOnline() {
    await expect(this.statusConexao()).toContainText(/online/i, { timeout: 5000 });
  }

  // ── Mapa do Labirinto (HU-12) ─────────────────────────────────
  mapaLabirinto(): Locator {
    return this.page.locator('[data-testid="mapa-labirinto"]');
  }

  posicaoRobo(): Locator {
    return this.page.locator('[data-testid="posicao-robo"]');
  }

  // ── Indicadores de Desempenho (HU-13) ────────────────────────
  indicadorBateria(): Locator {
    return this.page.locator('[data-testid="indicador-bateria"]');
  }

  indicadorVelocidade(): Locator {
    return this.page.locator('[data-testid="indicador-velocidade"]');
  }

  indicadorTempo(): Locator {
    return this.page.locator('[data-testid="indicador-tempo"]');
  }

  indicadorStatus(): Locator {
    return this.page.locator('[data-testid="indicador-status"]');
  }

  // ── Alerta de Evento Crítico (HU-15) ─────────────────────────
  alertaEventoCritico(): Locator {
    return this.page.locator('[data-testid="alerta-evento-critico"]');
  }

  // ── Início de Sessão (HU-11) ──────────────────────────────────
  painelSessao(): Locator {
    return this.page.locator('[data-testid="painel-sessao"]');
  }

  // ── Simulação de WebSocket ────────────────────────────────────
  async simularEventoWebSocket(evento: object) {
    await this.page.evaluate((ev) => {
      window.dispatchEvent(new CustomEvent('ws-test-message', { detail: ev }));
    }, evento);
  }
}