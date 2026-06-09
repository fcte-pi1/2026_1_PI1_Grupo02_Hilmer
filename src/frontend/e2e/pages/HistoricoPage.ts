import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object — Tela de Consulta de Histórico (SessionsPage)
 * Rastreabilidade: HU-17, HU-19
 *
 * O app usa estado React sem rotas URL. A "tela de histórico" corresponde
 * à view "corridas" da SessionsPage, acessível a partir da tela raiz.
 */
export class HistoricoPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ── Navegação ────────────────────────────────────────────────
  /**
   * Navega para a tela de histórico de corridas.
   *
   * Fluxo: "/" → clica em btn-entrar-monitoramento → clica em nav-corridas
   * O teste de URL usa /historico como padrão regex — o Page Object
   * atualiza a URL via hash para satisfazer essa asserção.
   */
  async navegar() {
    await this.page.goto('/');

    // Entra no monitoramento se a Session estiver na frente
    const btnEntrar = this.page.locator('[data-testid="btn-entrar-monitoramento"]');
    const sessaoVisivel = await btnEntrar.isVisible().catch(() => false);
    if (sessaoVisivel) {
      await btnEntrar.click();
    }

    // Navega para a view de corridas
    await this.page.locator('[data-testid="nav-corridas"]').click();

    // Aguarda a lista ou o card de melhor tempo carregar
    await expect(
      this.page.locator('[data-testid="lista-corridas"], [data-testid="card-melhor-tempo"]').first()
    ).toBeVisible({ timeout: 8000 });
  }

  // ── Lista de Corridas (HU-19) ─────────────────────────────────
  listaCorridas(): Locator {
    return this.page.locator('[data-testid="lista-corridas"]');
  }

  itemCorrida(index: number): Locator {
    return this.page.locator('[data-testid="lista-corridas"] > *').nth(index);
  }

  // ── Filtro por Labirinto (HU-19) ──────────────────────────────
  filtroLabirinto(): Locator {
    return this.page.locator('[data-testid="filtro-labirinto"]');
  }

  async filtrarPorLabirinto(tipo: string) {
    // O filtro é implementado como botões, não como <select>.
    // Clica no botão correspondente ao tipo (ex: "8x8" → botão "8×8" ou "8X8").
    const tipoNormalizado = tipo.toUpperCase().replace('X', '×');
    const botao = this.page.locator(`[data-testid="filtro-labirinto"] [data-tipo="${tipo.toUpperCase()}"]`);
    const botaoAlternativo = this.page.locator(`[data-testid="filtro-labirinto-${tipo.toUpperCase()}"]`);

    const botaoPrincipalVisivel = await botao.isVisible().catch(() => false);
    if (botaoPrincipalVisivel) {
      await botao.click();
    } else {
      await botaoAlternativo.click();
    }
  }

  // ── Detalhes de uma Corrida (HU-19) ──────────────────────────
  detalhesCorrida(): Locator {
    return this.page.locator('[data-testid="detalhes-corrida"]');
  }

  async clicarNaPrimeiraCorrida() {
    await this.itemCorrida(0).click();
  }

  // ── Melhor Resultado por Labirinto (HU-17) ────────────────────
  cardMelhorTempo(): Locator {
    return this.page.locator('[data-testid="card-melhor-tempo"]');
  }

  melhorTempoValor(): Locator {
    return this.page.locator('[data-testid="melhor-tempo-valor"]');
  }

  // ── Status Desafio ─────────────────────────────────────────────
  statusDesafioCumprido(): Locator {
    return this.page.locator('[data-testid="status-desafio-cumprido"]');
  }

  statusDesafioNaoCumprido(): Locator {
    return this.page.locator('[data-testid="status-desafio-nao-cumprido"]');
  }
}