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

### CT-SE01 - Inicialização do barramento I2C

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-SE01 |
| **Nome do caso de teste** | Inicialização do barramento I2C compartilhado |
| **Objetivo do caso de teste** | Verificar se o firmware inicializa corretamente o barramento I2C usado pelos sensores do Micromouse. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Firmware embarcado compilado e placas/sensores conectados corretamente. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Ligar o Micromouse<br>2. Observar os logs de inicialização do firmware<br>3. Confirmar a criação do barramento I2C compartilhado<br>4. Registrar o comportamento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | O barramento I2C é inicializado com sucesso e fica disponível para os módulos dependentes. |

### CT-SE02 - Leitura da bateria

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-SE02 |
| **Nome do caso de teste** | Monitoramento e filtragem da bateria |
| **Objetivo do caso de teste** | Garantir que o módulo de bateria leia tensão, corrente, potência e SOC corretamente. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Sensor INA226 funcionando e firmware com o módulo de bateria ativo. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Energizar o Micromouse<br>2. Acompanhar as leituras geradas pelo módulo de bateria<br>3. Verificar se os valores variam de forma coerente com a alimentação<br>4. Registrar o comportamento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | O sistema exibe leituras válidas e filtradas de tensão, corrente, potência e SOC. |

### CT-SE03 - Leitura da IMU

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-SE03 |
| **Nome do caso de teste** | Atualização dos dados da IMU |
| **Objetivo do caso de teste** | Verificar se o módulo de IMU atualiza corretamente aceleração, giroscópio e temperatura. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Sensor MPU-9250 conectado e firmware com a tarefa de IMU em execução. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Iniciar o Micromouse<br>2. Observar os logs do módulo de IMU<br>3. Movimentar manualmente a placa para gerar variações nos eixos<br>4. Registrar o comportamento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | O firmware lê e atualiza os dados da IMU sem falhas, refletindo mudanças de movimento em tempo real. |

### CT-SE04 - Controle dos motores

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-SE04 |
| **Nome do caso de teste** | Controle dos motores e encoders |
| **Objetivo do caso de teste** | Confirmar que o módulo de motor aplica PWM corretamente e contabiliza os pulsos dos encoders. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Motores e encoders conectados ao firmware embarcado. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Ligar o sistema embarcado<br>2. Aplicar comandos de movimentação aos motores<br>3. Observar a resposta física dos motores<br>4. Validar a contagem dos encoders<br>5. Registrar o comportamento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Os motores respondem aos comandos e os encoders contabilizam movimento de forma consistente. |

### CT-SE05 - Leitura do sensor TOF

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-SE05 |
| **Nome do caso de teste** | Leitura de distância do sensor VL53L0X |
| **Objetivo do caso de teste** | Verificar se o sensor de distância retorna medidas estáveis e compatíveis com o ambiente. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Sensor VL53L0X instalado e operacional, com linha de visão desobstruída. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Iniciar o firmware<br>2. Observar as leituras de distância do sensor TOF<br>3. Aproximar e afastar um obstáculo<br>4. Registrar o comportamento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | As leituras de distância são atualizadas corretamente e acompanham a variação do obstáculo. |

### CT-SE06 - Persistência em cartão SD

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-SE06 |
| **Nome do caso de teste** | Gravação de telemetria no cartão SD |
| **Objetivo do caso de teste** | Garantir que o módulo de cartão SD registre os dados de telemetria em arquivo com sucesso. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Cartão SD inserido e montado corretamente no sistema. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Iniciar o firmware com o cartão SD presente<br>2. Gerar telemetria dos sensores e do sistema<br>3. Verificar a criação ou atualização do arquivo CSV<br>4. Registrar o comportamento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Os dados são gravados no arquivo configurado no cartão SD sem perda de registros. |

### CT-SE07 - Integração do firmware principal

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-SE07 |
| **Nome do caso de teste** | Integração geral dos módulos embarcados |
| **Objetivo do caso de teste** | Validar se o firmware principal inicializa e coordena corretamente todos os módulos embarcados. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Todos os sensores e atuadores montados conforme o hardware do Micromouse. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Ligar o Micromouse<br>2. Verificar a inicialização conjunta de bateria, IMU, motor, TOF e SD card<br>3. Observar a troca de dados entre as tarefas do firmware<br>4. Registrar o comportamento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | O firmware sobe todos os módulos sem travamentos e mantém a operação integrada de forma estável. |

### CT-SE08 - Algoritmo de exploração cega (Frontier Based) até a chegada

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-SE08 |
| **Nome do caso de teste** | Exploração Frontier Based até localizar a célula de chegada |
| **Objetivo do caso de teste** | Validar que o Frontier Based explora o labirinto de forma eficiente até encontrar a célula objetivo. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Algoritmo Frontier Based implementado no firmware, sensores TOF operacionais, Micromouse no ponto de partida. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Iniciar o Micromouse no ponto de partida do labirinto<br>2. Ativar o modo de exploração Frontier Based<br>3. Monitorar movimento e exploração das fronteiras do labirinto<br>4. Registrar células visitadas, mapa parcial construído e tempo até localizar chegada<br>5. Validar que o algoritmo detecta a célula de chegada e encerra exploração |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | O Micromouse localiza e alcança a célula de chegada, explorando sistematicamente sem entrar em loops infinitos. Mapa parcial é construído com precisão. |

### CT-SE09 - Transição para FloodFill após localizar chegada

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-SE09 |
| **Nome do caso de teste** | Mudança de Frontier Based para FloodFill na chegada |
| **Objetivo do caso de teste** | Validar que o firmware alterna automaticamente para FloodFill ao detectar a célula de chegada e mapeia o restante do labirinto. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | CT-SE08 concluído (chegada localizada), mapa parcial armazenado em memória. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Com Micromouse na célula de chegada, ativar algoritmo de mapeamento completo<br>2. Executar FloodFill a partir da célula de chegada<br>3. Registrar propagação de distâncias para todas as células alcançáveis<br>4. Validar que o mapa é atualizado com paredes não exploradas previamente<br>5. Confirmar que a transição ocorre sem perda de dados do mapa anterior |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | FloodFill mapeia todas as células alcançáveis com distâncias corretas a partir da chegada, preservando informações do Frontier Based e preparando para cálculo da rota ótima. |

### CT-SE10 - Navegação ótima após mapeamento completo

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-SE10 |
| **Nome do caso de teste** | Navegação pelo caminho ótimo calculado |
| **Objetivo do caso de teste** | Validar que o Micromouse navega pelo caminho ótimo (menor distância) do ponto de partida até a chegada. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | CT-SE09 concluído (mapa completo e distâncias calculadas pelo FloodFill). |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Retornar o Micromouse ao ponto de partida<br>2. Ativar modo de navegação ótima<br>3. Monitorar caminho percorrido e validar que segue as menores distâncias<br>4. Registrar tempo total de execução e número de células percorridas<br>5. Comparar com a distância teórica do mapa FloodFill |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Micromouse segue o caminho ótimo sem desvios, alcançando a chegada no tempo mínimo teórico, com margem de erro apenas para movimentos físicos e alinhamento. |

### CT-SE11 - Envio de batch de dados via HTTP

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-SE11 |
| **Nome do caso de teste** | Envio de batch de telemetria ao servidor backend |
| **Objetivo do caso de teste** | Validar que o firmware coleta dados de telemetria e os envia em lotes via HTTP para o backend. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Micromouse com conectividade de rede (WiFi), backend rodando e acessível, fim de execução ou intervalo de envio atingido. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Registrar telemetria durante execução (posição, sensores, bateria, etc)<br>2. Aguardar conclusão de batch (após N registros ou fim de corrida)<br>3. Monitorar formação e serialização dos dados em JSON<br>4. Enviar POST HTTP com batch de dados ao servidor<br>5. Validar resposta HTTP (status 200, confirmação de recebimento)<br>6. Verificar se dados chegaram íntegros no backend |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Batch é enviado com sucesso via HTTP, servidor responde com confirmação, e todos os registros de telemetria são persistidos sem perda ou corrupção. |

### CT-HW01 - Sistema de energia

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-HW01 |
| **Nome do caso de teste** | Funcionamento do regulador de tensão |
| **Objetivo do caso de teste** | Verificar se o regulador MP1584EN fornece 3.3V estável na saída. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Placa de PCB montada, bateria conectada (12V nominal), multímetro calibrado. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Conectar bateria ao conector CN3 (BATERIA)<br>2. Medir tensão de saída do regulador (pinos VCC)<br>3. Variar carga conectando/desconectando módulos<br>4. Registrar variações de tensão |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Tensão de saída = 3.3V ±5% em regime permanente, ripple < 100mV em transiente. |

### CT-HW02 - Subsistema de gestão energética (INA226)

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-HW02 |
| **Nome do caso de teste** | Leitura correta de tensão, corrente e potência da bateria |
| **Objetivo do caso de teste** | Validar que o sensor INA226 mede com precisão as métricas de consumo de energia. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Sensor INA226 soldado no módulo, conectado ao barramento I2C, bateria conectada. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Ligar o ESP32 e ler valores do INA226 via barramento I2C<br>2. Medir tensão com multímetro e comparar com leitura do INA226<br>3. Aplicar diferentes cargas aos motores<br>4. Verificar variação de corrente e potência |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Leituras do INA226 coincidem com multímetro (±2%), e responde adequadamente a variações de carga. |

### CT-HW03 - Subsistema de navegação inercial (MPU-9250)

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-HW03 |
| **Nome do caso de teste** | Comunicação I2C e leitura do MPU-9250 |
| **Objetivo do caso de teste** | Garantir que o sensor MPU-9250 comunica corretamente via I2C e retorna dados válidos. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Sensor MPU-9250 soldado na placa, alimentação em 3.3V, barramento I2C operacional. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Energizar a placa<br>2. Verificar presença do dispositivo no barramento I2C (endereço 0x68)<br>3. Ler registros de aceleração, giroscópio e temperatura<br>4. Movimentar a placa e verificar mudanças nos eixos XYZ |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Comunicação I2C estabelecida, dados de aceleração/giroscópio coerentes com movimento físico. |

### CT-HW04 - Subsistema infravermelho (VL53L0X)

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-HW04 |
| **Nome do caso de teste** | Funcionamento dos sensores de distância VL53L0X |
| **Objetivo do caso de teste** | Validar que cada sensor VL53L0X (CN4, CN5 com XSHUT controle) retorna leituras de distância confiáveis. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Sensores VL53L0X instalados nos conectores CN4 e CN5, barramento I2C operacional, ESP32 ligado. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Energizar o sistema<br>2. Ativar cada sensor via pino XSHUT<br>3. Ler valores de distância para obstáculos a 10cm, 20cm e 30cm<br>4. Registrar precisão e tempo de resposta |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Ambos os sensores retornam leituras dentro de ±10% do valor real, com resposta < 100ms. |

### CT-HW05 - Subsistema de motores (TB6612FNG)

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-HW05 |
| **Nome do caso de teste** | Controle de motores via ponte H TB6612FNG |
| **Objetivo do caso de teste** | Confirmar que a ponte H comuta corretamente e os motores executam movimentos em ambas as direções. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | TB6612FNG soldado, motores conectados em M1 e M2, encoders instalados, ESP32 ligado. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Aplicar PWM a AI1/PWMA (motor esquerdo) com variação de duty cycle (0%-100%)<br>2. Aplicar PWM a BI1/PWMB (motor direito) com variação de duty cycle<br>3. Testar sentidos de rotação (AI2, BI2 controlam direção)<br>4. Validar leitura dos encoders para cada movimento |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Motores respondem aos comandos PWM, giram em ambas as direções e encoders contabilizam pulsos consistentemente. |

### CT-HW06 - Subsistema de microSD

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-HW06 |
| **Nome do caso de teste** | Comunicação SPI e funcionamento do cartão SD |
| **Objetivo do caso de teste** | Validar que o cartão SD comunica via SPI e permite leitura/escrita de arquivos. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Adaptador microSD (CN1) montado, cartão SD formatado em FAT32, ESP32 ligado. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Energizar o sistema<br>2. Inicializar o barramento SPI (CS, SCK, MOSI, MISO)<br>3. Detectar cartão SD<br>4. Criar/escrever arquivo de teste<br>5. Verificar integridade dos dados |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Cartão é detectado corretamente, arquivos são escritos e lidos sem corrupção de dados. |

### CT-HW07 - Barramento I2C compartilhado

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-HW07 |
| **Nome do caso de teste** | Integridade do barramento I2C com múltiplos dispositivos |
| **Objetivo do caso de teste** | Verificar que o barramento I2C suporta comunicação simultânea de INA226, MPU-9250 e VL53L0X sem conflitos. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Todos os dispositivos I2C conectados, pull-ups em SCL/SDA (típico 4.7kΩ), ESP32 ligado. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Varrer endereços do barramento I2C (0x08 a 0x77)<br>2. Confirmar presença de: INA226 (0x40), MPU-9250 (0x68), VL53L0X (0x29)<br>3. Ler dados de cada dispositivo em sequência rápida<br>4. Registrar erros de ACK ou timeout |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Todos os dispositivos são descobertos e respondem sem erros I2C ou colisões. |

### CT-HW08 - Subsistema de acionamento (Switch)

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-HW08 |
| **Nome do caso de teste** | Botão de liga/desliga do sistema |
| **Objetivo do caso de teste** | Validar que o switch (CN8) aciona corretamente o estado do Micromouse. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Switch conectado ao pino do ESP32, circuito de proteção funcionando. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Ler estado lógico do pino do switch<br>2. Pressionar botão e verificar transição digital<br>3. Liberar botão e confirmar retorno ao estado inicial<br>4. Testar debounce do firmware |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Transições de estado são detectadas corretamente e sem ruído (debounce efetivo). |

### CT-HW09 - Conectores e pinagem

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-HW09 |
| **Nome do caso de teste** | Verificação física e continuidade dos conectores |
| **Objetivo do caso de teste** | Confirmar que todos os conectores estão bem soldados e com continuidade elétrica. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Placa de PCB montada, multímetro em modo continuidade/ohm. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Inspecionar visualmente todos os conectores (CN1 a CN8)<br>2. Testar continuidade entre pads de cada conector<br>3. Verificar isolamento entre pistas adjacentes<br>4. Testar resistência de pull-up em SCL/SDA |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Todos os conectores têm continuidade, sem curtos ou desconexões. Resistências de pull-up medem entre 4-5 kΩ. |

### CT-HW10 - Integração elétrica dos subsistemas

| Parâmetro | Detalhe |
| :--- | :--- |
| **Código do caso de teste** | CT-HW10 |
| **Nome do caso de teste** | Funcionamento integrado da placa PCB |
| **Objetivo do caso de teste** | Validar que todos os subsistemas funcionam em conjunto sem interferências ou falhas. |
| **Pré-condições do sistema para o teste ser realizado, quando se aplicar** | Placa completa montada e com todos os subsistemas operacionais. |
| **Descrição dos procedimentos a serem executados para o teste** | 1. Energizar a placa via bateria<br>2. Ativar sequencialmente cada subsistema (sensores, motores)<br>3. Verificar se o consumo de energia é coerente<br>4. Monitorar tensão de saída e sinais de comunicação |
| **Resultado esperado para o teste ser aprovado (pós-condição após realizado o teste)** | Placa funciona sem travamentos, todos os módulos respondem corretamente, sem degradação de sinais. |

---

## Histórico de Versões

| Versão | Data | Descrição | Autor(es) | Revisor(es) |
| :---: | :---: | :--- | :--- | :--- |
| `1.0` | 07/05/2026 | Elaboração dos casos de teste funcionais | Euller Júlio  | Gabriel Castelo |
| `1.1` | 10/05/2026 | Inclusão de casos de teste para módulos embarcados, hardware por subsistema, algoritmos de exploração e mapeamento, navegação ótima e envio de batch via HTTP | Victor Pontual | Arthur Pinheiro |