# Roteiro de Testes Funcionais - Software

Este documento define os **casos de teste funcionais** do software do Micromouse, com base nos requisitos e histórias de usuário. Os testes validam as funcionalidades críticas do software, desde a recepção de dados até a visualização e persistência de resultados.

---

### CT-S01 - Recepção de dados do Micromouse

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-S01 |
| **Nome do caso de teste** | Recepção de telemetria |
| **Objetivo do caso de teste** | Verificar se o sistema recebe os dados de telemetria do Micromouse com sucesso. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Micromouse ligado, conectado à rede e sistema web rodando e aberto. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Iniciar conexão do sistema com o Micromouse<br>2. Monitorar a porta de recebimento dos dados<br>3. Registrar o comportamento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Dados de telemetria recebidos continuamente, sem falhas ou perda de pacotes. |

### CT-S02 - Validação da telemetria recebida

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-S02 |
| **Nome do caso de teste** | Validação de pacotes de dados |
| **Objetivo do caso de teste** | Garantir que o sistema valida corretamente os pacotes recebidos, rejeitando formatos inválidos. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Conexão estabelecida entre o sistema e o Micromouse. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Injetar dados de telemetria (válidos e corrompidos/inválidos)<br>2. Observar o log de processamento do backend<br>3. Registrar o comportamento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | O sistema aceita pacotes válidos para processamento e descarta/alerta sobre pacotes inválidos. |

### CT-S03 - Monitoramento em tempo real

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-S03 |
| **Nome do caso de teste** | Monitoramento da corrida em tempo real |
| **Objetivo do caso de teste** | Avaliar se a interface web atualiza o estado do Micromouse no labirinto instantaneamente. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Sistema recebendo dados válidos de telemetria e dashboard aberto. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Acessar a tela de monitoramento no app<br>2. Observar a atualização visual da posição e dos sensores<br>3. Registrar o comportamento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | A interface gráfica exibe a movimentação do rato no labirinto instantaneamente, sem lag perceptível. |

### CT-S04 - Exibição dos indicadores da corrida

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-S04 |
| **Nome do caso de teste** | Exibição de indicadores da corrida |
| **Objetivo do caso de teste** | Confirmar a correta exibição dos indicadores como tempo decorrido, velocidade e status. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Micromouse em corrida ativa, comunicando com o sistema. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Acessar o painel da corrida<br>2. Verificar os valores numéricos e gráficos exibidos<br>3. Registrar o comportamento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Os indicadores refletem os dados exatos do rato em tempo real e de forma legível. |

### CT-S05 - Persistência dos dados finais

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-S05 |
| **Nome do caso de teste** | Persistência de corrida finalizada |
| **Objetivo do caso de teste** | Assegurar que os dados totais da corrida e o mapa descoberto são salvos no banco de dados. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | O percurso do Micromouse foi concluído com sucesso. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Acionar a conclusão da corrida (via Micromouse ou interface)<br>2. Consultar o banco de dados do sistema<br>3. Registrar o comportamento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Os registros completos da corrida (tempo total, mapa, rota executada) são persistidos. |

### CT-S06 - Consulta por labirinto

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-S06 |
| **Nome do caso de teste** | Consulta de resultados por labirinto |
| **Objetivo do caso de teste** | Verificar se é possível filtrar os históricos de corrida para visualizar os dados de um labirinto específico. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Existência de dados de corridas persistidos associados a diferentes labirintos. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Acessar a página de histórico/resultados<br>2. Selecionar e aplicar o filtro por um labirinto alvo<br>3. Registrar o comportamento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | O sistema atualiza a listagem exibindo somente as corridas pertencentes ao labirinto pesquisado. |

### CT-S07 - Consulta geral de resultados

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-S07 |
| **Nome do caso de teste** | Consulta geral do histórico |
| **Objetivo do caso de teste** | Validar a exibição e a funcionalidade de listagem de todo o histórico de resultados globais. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Banco de dados populado com diversas corridas salvas. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Acessar a tela geral de resultados<br>2. Navegar pela listagem de informações<br>3. Registrar o comportamento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | O sistema exibe o histórico integral corretamente, com as informações principais formatadas e precisas. |

---

## Histórico de Versões

| Versão | Data | Descrição | Autor(es) | Revisor(es) |
| :---: | :---: | :--- | :--- | :--- |
| `1.0` | 07/05/2026 | Elaboração dos casos de teste funcionais | Euller Júlio  | Gabriel Castelo |
