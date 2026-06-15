import { test, expect } from '@playwright/test';

test.describe('Histórico de Corridas - Rota Otimizada', () => {
  const MOCK_CORRIDA_ID = 99;

  test.beforeEach(async ({ page }) => {
    // 1. Intercetar o detalhe da corrida 99 (mais específico deve vir antes ou ter padrão distinto)
    await page.route(new RegExp(`/api/corridas/${MOCK_CORRIDA_ID}$`), async (route) => {
      // Criar 16 células para um labirinto 4x4
      const celulas = [];
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          celulas.push({
            id_celula: y * 4 + x + 1,
            coordenada_x: x,
            coordenada_y: y,
          });
        }
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id_corrida: MOCK_CORRIDA_ID,
          status_corrida: 'CONCLUIDA',
          tipo_labirinto: '4X4',
          data_hora_inicio: '2026-06-14T10:00:00Z',
          tempo_total: 15000,
          velocidade_media: 10.5,
          desafio_cumprido: true,
          celulas: celulas,
          // Percurso: Caminho em linha reta na primeira linha: (0,0) -> (1,0) -> (2,0)
          percurso: [
            { id_percurso: 1, id_celula: 1, tipo_percurso: 'MOVIMENTO' }, // (0,0)
            { id_percurso: 2, id_celula: 2, tipo_percurso: 'MOVIMENTO' }, // (1,0)
            { id_percurso: 3, id_celula: 3, tipo_percurso: 'MOVIMENTO' }  // (2,0)
          ],
        }),
      });
    });

    // 2. Intercetar a listagem de corridas
    await page.route('**/api/corridas/resumo*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id_corrida: MOCK_CORRIDA_ID,
            data_hora_inicio: '2026-06-14T10:00:00Z',
            status_corrida: 'CONCLUIDA',
            tipo_labirinto: '4X4',
            tempo_total: 15000,
            velocidade_media: 10.5,
          },
        ]),
      });
    });
  });

  test('deve renderizar a rota otimizada corretamente no modal de detalhes', async ({ page }) => {
    // 1. Navegar para a URL base da aplicação
    await page.goto('/');

    // 2. Garantir que passamos pela tela de Sessão
    const btnEntrar = page.locator('[data-testid="btn-entrar-monitoramento"]');
    await expect(btnEntrar).toBeVisible({ timeout: 10000 });
    await btnEntrar.click();

    // 3. Navegar para a aba de Histórico usando o menu lateral e aguardar a resposta da API
    const responsePromise = page.waitForResponse('**/api/corridas/resumo*');
    await page.locator('[data-testid="nav-corridas"]').click();
    await responsePromise;

    // 4. Garantir que a tabela carregou e clicar na linha da corrida ID 99
    const row = page.locator(`tr:has-text("#${MOCK_CORRIDA_ID}")`);
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click();

    // 5. Validar que o Overlay de detalhes abriu
    const overlayHeader = page.locator('h2', { hasText: `Corrida #${MOCK_CORRIDA_ID}` });
    await expect(overlayHeader).toBeVisible();

    // 6. Validar a presença do Labirinto
    const mazeGrid = page.locator('[data-testid="maze-grid"]');
    await expect(mazeGrid).toBeVisible();

    /**
     * VALIDAÇÃO DA REGRA DE NEGÓCIO:
     * Células fora do percurso (ex: 3,3) devem ter as 4 paredes forçadas (true).
     * No CSS, isso é representado por 4 insets no box-shadow com a cor amarela rgb(234, 179, 8).
     */
    const cellOut = page.locator('[data-testid="cell-3-3"]');
    await expect(cellOut).toBeVisible();
    
    await expect.poll(async () => {
      const boxShadow = await cellOut.evaluate((el) => window.getComputedStyle(el).boxShadow);
      const matches = boxShadow.match(/rgb\(234, 179, 8\)/g);
      return matches ? matches.length : 0;
    }).toBe(4);

    /**
     * VALIDAÇÃO DA REGRA DE NEGÓCIO:
     * Células no percurso (ex: 1,0) devem ter apenas as paredes onde não há conexão.
     * Para o percurso (0,0) <-> (1,0) <-> (2,0):
     * A célula (1,0) está aberta para Oeste (0,0) e Leste (2,0).
     * Deve ter apenas 2 paredes (Norte e Sul).
     */
    const cellIn = page.locator('[data-testid="cell-0-1"]'); // row 0, col 1 = (1,0)
    await expect(cellIn).toBeVisible();
    
    await expect.poll(async () => {
      const boxShadow = await cellIn.evaluate((el) => window.getComputedStyle(el).boxShadow);
      const matches = boxShadow.match(/rgb\(234, 179, 8\)/g);
      return matches ? matches.length : 0;
    }).toBe(2);

    /**
     * VALIDAÇÃO ADICIONAL: Background colors
     */
    // Célula fora do percurso (zinco escuro)
    await expect(cellOut).toHaveCSS('background-color', 'rgb(9, 9, 11)');
    // Célula no percurso (azul ardósia/visitada)
    await expect(cellIn).toHaveCSS('background-color', 'rgb(30, 41, 59)');
  });
});
