# Arquitetura de Software

## 1. Visão Geral

O Sistema Web do Micromouse tem como objetivo apoiar o monitoramento, armazenamento e análise dos dados gerados durante as corridas do robô. A solução é responsável por receber dados de telemetria enviados pelo Micromouse, exibir informações em tempo real, persistir resultados das execuções e permitir consultas posteriores.

A arquitetura proposta utiliza uma estrutura monolítica em camadas, adequada ao escopo acadêmico do projeto, separando responsabilidades entre interface web, backend, persistência de dados, comunicação em tempo real e integração com o sistema embarcado.

---

## 2. Propósito do Software

O software atua como camada de apoio ao sistema físico do Micromouse, permitindo que os dados da corrida sejam visualizados, registrados e analisados.

As principais responsabilidades do sistema são:

- receber dados de telemetria do Micromouse;
- validar os dados recebidos;
- exibir informações da corrida em tempo real;
- mostrar indicadores como trajeto, bateria, velocidade média, tempo e status da corrida;
- persistir os dados finais da execução;
- permitir consultas históricas por labirinto;
- permitir consultas gerais das execuções.

---

## 3. Padrão Arquitetural Adotado

A solução adota uma arquitetura monolítica em camadas, composta por:

- Camada de Apresentação;
- Camada de Aplicação;
- Camada de Persistência;
- Mecanismo de Comunicação em Tempo Real.

---

### 3.1 Camada de Apresentação

Responsável pela interface web desenvolvida em React.

### Funções principais

- exibição da telemetria em tempo real;
- visualização do mapa do labirinto;
- apresentação de indicadores da corrida;
- consulta de resultados históricos.

---

### 3.2 Camada de Aplicação

Responsável pelo backend desenvolvido em FastAPI.

### Funções principais

- recebimento da telemetria;
- validação dos dados;
- gerenciamento das sessões de corrida;
- disponibilização de APIs REST;
- distribuição de eventos em tempo real para o frontend.

---

### 3.3 Camada de Persistência

Responsável pelo armazenamento dos dados no PostgreSQL.

### Funções principais

- persistência das corridas;
- armazenamento de telemetria histórica;
- armazenamento dos labirintos;
- consulta de execuções anteriores.

---

### 3.4 Comunicação em Tempo Real

A atualização em tempo real ocorre utilizando WebSocket entre backend e frontend.

O Micromouse envia os dados de telemetria ao backend via HTTP/REST através da rede Wi-Fi. Após validação, o backend redistribui os dados ao frontend utilizando WebSocket.

A atualização visual ocorre em tempo real, enquanto a persistência no banco pode ocorrer em lote para reduzir overhead de escrita.

---

### 3.5 Justificativa Arquitetural

A arquitetura foi escolhida por apresentar:

- menor complexidade de implantação;
- facilidade de desenvolvimento em equipe;
- adequação ao escopo acadêmico;
- suporte adequado à telemetria em tempo real;
- facilidade de manutenção.

Não foram adotadas arquiteturas baseadas em microsserviços devido ao aumento desnecessário da complexidade operacional para o tamanho atual da solução.

---

## 4. Tecnologias Utilizadas

### 4.1 Linguagens

| Camada | Linguagem |
|---|---|
| Frontend | JavaScript |
| Backend | Python |
| Banco de Dados | SQL |
| Firmware | C/C++ |

---

### 4.2 Frameworks e Tecnologias

| Tecnologia | Uso |
|---|---|
| React | Interface web |
| FastAPI | API backend |
| WebSocket | Comunicação em tempo real |
| PostgreSQL | Persistência de dados |
| Uvicorn/ASGI | Execução da aplicação FastAPI |
| ESP-IDF | Desenvolvimento do firmware |
| FreeRTOS | Gerenciamento de tarefas embarcadas |

---

## 5. Organização Geral da Solução

A solução é composta pelos seguintes elementos:

- Micromouse;
- Frontend Web;
- Backend FastAPI;
- Banco PostgreSQL.

---

## Fluxo Principal

1. O Micromouse coleta informações dos sensores.
2. O firmware organiza os dados de telemetria.
3. O Micromouse envia os dados ao backend via HTTP/REST utilizando Wi-Fi.
4. O backend valida os pacotes recebidos.
5. O backend redistribui os dados ao frontend utilizando WebSocket.
6. O frontend atualiza a interface em tempo real.
7. O backend persiste os dados históricos no PostgreSQL.
8. O usuário pode consultar execuções anteriores.

---

## 6. Visões Arquiteturais

A arquitetura do sistema é documentada utilizando uma adaptação do modelo 4+1.

Neste projeto, a visão de casos de uso foi substituída por uma visão de dados, conforme orientação da disciplina.

---

### 6.1 Visão Lógica

A visão lógica descreve os principais módulos da solução de software e suas responsabilidades.

Os módulos principais são:

- **Interface Web:** exibe dados de monitoramento e telas de consulta;
- **Módulo de Telemetria:** recebe e valida os dados enviados pelo Micromouse;
- **Módulo de Monitoramento:** atualiza a interface em tempo real;
- **Módulo de Persistência:** armazena os dados finais das corridas;
- **Módulo de Consulta:** permite visualizar resultados históricos.

### 6.1.1 Comportamento Dinâmico (Diagrama de Estados)

O comportamento do sistema durante o ciclo de uma corrida é regido por estados que garantem a integridade da telemetria e o controle da sessão. O fluxo transita desde a configuração inicial até o salvamento final dos dados no PostgreSQL.

Ele contempla estados como:

- aguardando configuração;
- sessão iniciada;
- aguardando largada;
- mapeamento inicial;
- conexão perdida;
- mapa consolidado;
- cálculo de rota otimizada;
- execução da rota otimizada;
- alerta crítico;
- desafio cumprido;
- desafio não cumprido;
- salvamento dos dados;
- corrida finalizada.

Esse diagrama auxilia na compreensão do comportamento dinâmico do sistema e dos eventos que provocam transições entre estados.

<p style="text-align: center;">
  <em>Figura 2: Diagrama de Estados</em>
</p>

![Diagrama de Estados](../../../docs/assets/software/diagrama-estados.png)

<div style="text-align: center;">Autor: <a href="https://github.com/Potatoyz908">Euller</a></div>

### 6.1.2 Fluxo Operacional (Diagrama de Atividades UML)

O Diagrama de Atividades detalha o comportamento funcional e a coordenação entre o sistema embarcado e a interface de monitoramento, evidenciando a lógica de controle e o processamento de dados.

#### Estrutura do Diagrama

O fluxo utiliza **Raias (swimlanes)** para delimitar as responsabilidades entre os dois atores principais:

*   **Micromouse (Embarcado):** Responsável pela execução do algoritmo de navegação (Flood Fill), coleta de dados sensoriais (bateria, velocidade, sensores) e transmissão de telemetria.
*   **Sistema Web:** Responsável pela orquestração da sessão, validação de pacotes, interface de usuário e persistência de dados no PostgreSQL.

#### Descrição Detalhada das Atividades

1.  **Início e Decisão de Sessão:** O processo inicia no Sistema Web com a seleção do tipo de labirinto. Um **nó de decisão** garante que a sessão só avance se o labirinto for selecionado e a sessão iniciada corretamente.

2.  **Paralelismo no Micromouse:** Após iniciar a navegação (fronteiras e, quando aplicável, Floodfill), o robô usa uma **barra de bifurcacao (fork)** para executar em paralelo o **processamento do controle do sistema** e o **envio de pacotes de telemetria ao sistema web**.

3.  **Ciclo de Telemetria (Insumos e Resultados):**
    *   **Entrada:** Pacotes de telemetria transmitidos via Bluetooth/Wi-Fi.
    *   **Processamento:** O Sistema Web recebe e valida os pacotes. Caso sejam inválidos (**nó de decisão**), o pacote é descartado com a respectiva sinalização de falha de validação.

4.  **Sincronização e Atualização:** Se os dados forem válidos, o fluxo utiliza uma nova **barra de bifurcação** para atualizar simultaneamente o trajeto no mapa, os indicadores de performance e a checagem de alertas críticos (visuais e sonoros).

5.  **Pontos de Controle e Encerramento:**
    *   O sistema monitora continuamente, através de nós de decisão, se o **Objetivo foi alcançado** ou se houve um **Encerramento Manual** da sessão.
    *   **Saída Final:** Dependendo do desfecho, o status da corrida é alterado para "Desafio Cumprido" ou "Desafio Não Cumprido".
    *   A persistência automática dos dados ocorre no Banco de Dados antes de o fluxo convergir para o **estado final**.

<p style="text-align: center;">
  <em>Figura 3: Diagrama de Atividades UML</em>
</p>

![Diagrama de Atividades UML](../../../docs/assets/software/diagrama_atividades.png)

<div style="text-align: center;">Autores: <a href="https://github.com/MM4k">Marcelo Makoto</a> <a href="https://github.com/dudaa28">Maria Eduarda</a></div>

---

### 6.1.1 Componentes Web

### Interface Web

Responsável por:

- monitoramento em tempo real;
- visualização do mapa;
- exibição dos indicadores da corrida;
- consulta histórica.

---

### Backend FastAPI

Responsável por:

- recebimento da telemetria;
- validação dos pacotes;
- gerenciamento das sessões;
- persistência dos dados;
- distribuição das atualizações via WebSocket.

---

### 6.1.2 Componentes Embarcados

### Subsistema de Energia

Responsável por:

- alimentação do sistema;
- monitoramento energético;
- regulação de tensão;
- cálculo de carga da bateria.

#### Componentes principais

- bateria Li-Po;
- INA226;
- regulador buck MP1584EN.

---

### Subsistema de Sensoriamento

Responsável por:

- aquisição de dados inerciais;
- medição de distância;
- detecção de obstáculos;
- apoio à navegação.

#### Componentes principais

- MPU-9250;
- 3 sensores VL53L0X.

---

### Subsistema de Atuação e Odometria

Responsável por:

- movimentação do robô;
- controle de velocidade;
- medição de deslocamento;
- controle direcional.

#### Componentes principais

- motores N20;
- encoders;
- TB6612FNG.

---

### Subsistema de Armazenamento

Responsável por:

- armazenamento local de telemetria;
- logging de execução;
- persistência de dados para análise pós-corrida.

#### Componentes principais

- módulo SD Card via SPI.

---

### Subsistema de Comunicação

Responsável por:

- envio de telemetria;
- comunicação com o backend;
- sincronização em tempo real.

#### Tecnologias utilizadas

- Wi-Fi nativa do ESP32;
- HTTP/REST;
- WebSocket.

---

### Firmware de Navegação

Responsável por:

- exploração do labirinto;
- mapeamento;
- cálculo da rota otimizada;
- controle de estados da navegação.

#### Algoritmos utilizados

- Frontier-based Exploration;
- Flood Fill;
- Path Planning.

---

### 6.2 Visão de Processos

A visão de processos descreve o comportamento dinâmico do sistema durante uma corrida.

---

### 6.2.1 Fluxo Operacional

1. O sistema aguarda a configuração da sessão.
2. O usuário seleciona o labirinto.
3. O Micromouse inicializa sensores e motores.
4. O algoritmo de navegação inicia a exploração.
5. O firmware coleta dados dos sensores.
6. A telemetria é enviada ao backend via HTTP/REST.
7. O backend valida os pacotes recebidos.
8. O frontend recebe atualizações em tempo real via WebSocket.
9. O backend persiste os dados históricos.
10. O Micromouse executa a rota otimizada.
11. A sessão é encerrada.

![Diagrama de Sequência - Ciclo de Vida da Corrida](../../../docs/assets/software/diagrama_sequencia.png)

<div style="text-align: center;">
  Autores:
  <a href="https://github.com/Potatoyz908">Euller</a> e
  <a href="https://github.com/dudaa28">Maria Eduarda</a>
</div>

### 6.2.2 Processos Embarcados

O firmware embarcado executa processos concorrentes utilizando FreeRTOS.


### Tasks principais

| Task | Intervalo | Responsabilidade |
|---|---|---|
| `battery_task` | 500 ms | Monitoramento energético |
| `imu_task` | 100 ms | Leitura da IMU |
| `tof_task` | 200 ms | Leitura dos sensores ToF |
| `motor_task` | 250 ms | Leitura de encoders |
| `data_aggregation_task` | 500 ms | Agregação de telemetria |

---

### 6.2.3 Fluxo de Telemetria

1. Sensores são lidos em tasks independentes.
2. Os dados são agregados em uma estrutura compartilhada.
3. A task de agregação monta a estrutura `RobotData`.
4. Em paralelo, a telemetria é enviada ao backend.
5. O backend valida, processa e persiste os dados.

---

### 6.2.4 Máquina de Estados da Navegação

O sistema embarcado utiliza uma máquina de estados responsável pelas transições de navegação.

### Estados principais

- IDLE;
- FRONTIER;
- FLOODFILL;
- OPTIMAL;
- DONE.

### Fluxo de estados

```text
IDLE → FRONTIER → FLOODFILL → OPTIMAL → DONE
```

---

### 6.2.5 Tratamento de Exceções

O sistema considera:

- perda de conexão;
- falha de validação;
- perda de sensores;
- baixa tensão da bateria;
- encerramento manual;
- falha da corrida.

---

### 6.3 Visão de Implementação

A visão de implementação descreve como os componentes são organizados tecnologicamente.

### 6.3.1 Estrutura de Camadas e Pacotes (Diagrama de Pacotes)

O diagrama a seguir apresenta a organização do sistema em camadas (Apresentação, Aplicação e Dados) e os respectivos pacotes/módulos que compõem cada uma delas, detalhando a estrutura lógica descrita acima.

<p style="text-align: center;">
  <em>Figura: Diagrama de Pacotes</em>
</p>

![Diagrama de Pacotes](../../../docs/assets/software/diagrama-pacotes.png)

<div style="text-align: center;">Autor: <a href="https://github.com/GabrielCastelo-31">Gabriel Castelo</a></div>

### 6.3.1 Frontend

O frontend React é organizado em:

- **Computador do Usuário:** executa o navegador;
- **Servidor Frontend:** disponibiliza a aplicação React;
- **Servidor Backend:** executa a aplicação FastAPI;
- **Fonte de Telemetria:** representa o Micromouse;
- **Servidor de Banco de Dados:** executa o PostgreSQL.

A comunicação entre os nós ocorre por meio dos seguintes protocolos:

- **HTTPS:** comunicação entre navegador e frontend;
- **HTTPS/REST:** comunicação tradicional entre frontend e backend;
- **WSS/WebSocket:** comunicação em tempo real entre frontend e backend;
- **Wi-Fi:** envio de telemetria do Micromouse ao backend;
- **TCP/IP:** comunicação entre backend e banco de dados.

#### Diagrama de Implantação

O diagrama de implantação apresenta uma visão física e tecnológica da solução. Ele mostra onde cada parte do sistema será executada e como os componentes se comunicam.

A arquitetura proposta considera que o usuário acessa o sistema por meio de um navegador. A interface web é desenvolvida em React e se comunica com o backend desenvolvido em FastAPI. O backend recebe os dados do Micromouse, processa a telemetria, envia atualizações em tempo real para o frontend via WebSocket e persiste os dados no PostgreSQL.

![Diagrama de Implantação](../../../docs/assets/software/diagrama-implantacao.png)

<div style="text-align: center;">Autor: <a href="https://github.com/Potatoyz908">Euller</a></div>

---

### 6.3.2 Backend

O backend FastAPI é organizado em:

- API REST;
- gerenciamento de WebSocket;
- serviços de telemetria;
- serviços de persistência;
- modelos de dados.

Como a solução utiliza um banco de dados relacional, foi utilizado um **Modelo Entidade-Relacionamento (MER)** e seu respectivo **Diagrama Entidade-Relacionamento (DER)**, além do diagrama lógico de dados(DLD).

#### 6.5.1 Modelo Entidade-Relacionamento (MER)

**IDENTIFICAÇÃO DAS ENTIDADES**

- **LABIRINTO**
- **CELULA**
- **CORRIDA**
- **TELEMETRIA**

**DESCRIÇÃO DAS ENTIDADES (ATRIBUTOS)**

- **LABIRINTO** (**id_labirinto**, tipo_labirinto)
- **CELULA** (**id_celula**, coordenada_x, coordenada_y, parede_norte, parede_sul, parede_leste, parede_oeste, id_labirinto)
- **CORRIDA** (**id_corrida**, desafio_cumprido, status_corrida, data_hora_inicio, data_hora_fim, id_labirinto)
- **TELEMETRIA** (velocidade_media, tempo_total, tensao_media, corrente_media, velocidade_maxima_percurso, id_corrida)

#### 6.5.2 Diagrama Entidade-Relacionamento (DER)

![Diagrama Entidade-Relacionamento](../../../docs/assets/software/diagrama_entidade_relacionamento.png)

<div style="text-align: center;">Autores: <a href="https://github.com/GabrielCastelo-31">Gabriel Castelo</a> e <a href="https://github.com/mtsmgn0">Mateus Magno</a></div>

#### 6.5.3 Diagrama Lógico de Dados (DLD)

![Diagrama Lógico de Dados](../../../docs/assets/software/diagrama_logico_de_dados.png)

<div style="text-align: center;">Autor: <a href="https://github.com/GabrielCastelo-31">Gabriel Castelo</a></div>

---

### 6.3.3 Organização do Firmware

O firmware embarcado é desenvolvido utilizando:

- ESP32;
- ESP-IDF;
- FreeRTOS;
- linguagem C/C++.

---

### Estrutura de Arquivos

```text
main/
├── app/main.cpp
├── i2c_manager.{cpp,hpp}
├── pins.hpp
├── battery/
├── imu/
├── motor/
├── vl53l0x/
└── sd_card/
```

---

### Módulos principais

| Módulo | Responsabilidade |
|---|---|
| `battery` | Monitoramento energético |
| `imu` | Interface da IMU |
| `motor` | Controle dos motores |
| `vl53l0x` | Sensoriamento ToF |
| `sd_card` | Persistência local |
| `i2c_manager` | Gerenciamento I2C |

---

### 6.3.4 Hardware Integrado

| Componente | Responsabilidade |
|---|---|
| ESP32 | Processamento principal |
| INA226 | Monitoramento energético |
| MP1584EN | Regulação de tensão |
| VL53L0X | Sensoriamento de distância |
| MPU-9250 | Medição inercial |
| TB6612FNG | Controle dos motores |
| Encoders | Odometria |
| SD Card | Armazenamento local |

---

### 6.3.5 Barramento I2C Compartilhado

### Configuração

| Sinal | GPIO |
|---|---|
| SDA | GPIO_NUM_21 |
| SCL | GPIO_NUM_22 |

### Dispositivos conectados

- INA226;
- MPU-9250;
- sensores VL53L0X.

### Características

- clock de 100 kHz;
- gerenciamento centralizado via `i2c_manager`;
- compartilhamento de barramento entre sensores.



# 6.4 Visão de Implantação

A visão de implantação apresenta os nós físicos da solução.


## 6.4.1 Nós de Execução

| Nó | Responsabilidade |
|---|---|
| Micromouse | Execução do firmware |
| Navegador do Usuário | Interface web |
| Servidor Backend | API FastAPI |
| Servidor PostgreSQL | Persistência dos dados |

---

## 6.4.2 Comunicação

| Origem | Destino | Protocolo |
|---|---|---|
| Micromouse | Backend | HTTP/REST via Wi-Fi |
| Backend | Frontend | WebSocket (WSS) |
| Frontend | Backend | HTTPS |
| Backend | PostgreSQL | TCP/IP |

---

## 6.4.3 Implantação do Sistema Embarcado

O firmware é executado diretamente no ESP32 embarcado no Micromouse.

### Interfaces utilizadas

- I2C;
- SPI;
- GPIO;
- PWM;
- UART.

---

## 6.4.4 Implantação Física dos Sensores

| Subsistema | Interface |
|---|---|
| MPU-9250 | I2C |
| INA226 | I2C |
| VL53L0X | I2C |
| SD Card | SPI |
| Motores | PWM/GPIO |
| Encoders | GPIO/PCNT |

---

## 6.4.5 Ambiente de Implantação

Durante o desenvolvimento acadêmico, os serviços podem ser executados em rede local.

A solução também permite futura implantação utilizando containers Docker ou infraestrutura em nuvem.

---

# 6.5 Visão de Dados

A visão de dados descreve como as informações são persistidas.

O modelo utiliza PostgreSQL e segue uma estrutura relacional.

---

## 6.5.1 Entidades Principais

### LABIRINTO

- id_labirinto
- dimensao

---

### CELULA

- id_celula
- coordenada_x
- coordenada_y
- parede_norte
- parede_sul
- parede_leste
- parede_oeste
- id_labirinto

---

### CORRIDA

- id_corrida
- data_inicio
- data_fim
- desafio_cumprido
- finalizada
- id_labirinto

---

### TELEMETRIA

- id_telemetria
- timestamp
- velocidade_media
- velocidade_maxima
- tensao
- corrente
- posicao_x
- posicao_y
- temperatura
- id_corrida

---

### EVENTO

- id_evento
- timestamp
- tipo_evento
- descricao
- id_corrida

---

## 6.5.2 Relacionamentos

- um labirinto possui várias células;
- um labirinto pode possuir várias corridas;
- uma corrida possui vários registros de telemetria;
- uma corrida possui vários eventos.

---

# 7. Segurança

Mesmo sendo um projeto acadêmico, a arquitetura considera mecanismos básicos de segurança.

## Medidas previstas

- utilização de HTTPS/WSS;
- validação dos pacotes recebidos;
- descarte de mensagens inválidas;
- controle de sessão;
- separação entre frontend e backend.

---

# 8. Relação com os Requisitos

| Requisito | Atendimento |
|---|---|
| Receber dados do Micromouse | Backend FastAPI |
| Exibir telemetria em tempo real | WebSocket + React |
| Persistir dados históricos | PostgreSQL |
| Validar telemetria | Backend FastAPI |
| Consultar corridas | API REST |
| Exibir indicadores da corrida | Frontend React |
| Monitorar bateria | INA226 + Backend |
| Registrar logs locais | SD Card |
| Executar navegação autônoma | Firmware ESP32 |

---

# 9. Considerações Finais

A arquitetura proposta busca equilibrar simplicidade, organização e capacidade de expansão.

A separação entre frontend, backend, persistência e firmware facilita o desenvolvimento em equipe e permite evolução futura da solução.

O uso de WebSocket atende aos requisitos de monitoramento em tempo real, enquanto o PostgreSQL fornece armazenamento estruturado para consultas históricas.

No sistema embarcado, a utilização de FreeRTOS, ESP-IDF e organização modular do firmware permite concorrência entre sensores, controle e comunicação, facilitando manutenção e expansibilidade.

---

## 10. Histórico de Versões

|Versão|Data|Autor|Descrição|Revisor |
|---|---|---|---|---|
|1.0|03/05/2026|[Euller](https://github.com/Potatoyz908)|Criação do documento|[Gabriel Castelo](https://github.com/GabrielCastelo-31)|
|1.1|04/05/2026|[Euller](https://github.com/Potatoyz908)|Atualização dos diagramas e adição de mais informações|[Gabriel Castelo](https://github.com/GabrielCastelo-31)|
|1.2 | 04/05/2026|[Gabriel Castelo](https://github.com/GabrielCastelo-31) | Revisão do documento e adição do histórico de versão| [Maria Eduarda](https://github.com/dudaa28)
|1.3 | 04/05/2026|[Gabriel Castelo](https://github.com/GabrielCastelo-31) | Adição do MER e DER|[Maria Eduarda](https://github.com/dudaa28)
|1.4 | 04/05/2026|[Maria Eduarda](https://github.com/dudaa28) | Adição do diagrama de atividades UML| - |
|1.4.1 | 04/05/2026|[Maria Eduarda](https://github.com/dudaa28) | Adição do diagrama de atividades UML| [Gabriel Castelo](https://github.com/GabrielCastelo-31)|
|1.4.2 | 05/05/2026|[Euller Júlio](https://github.com/Potatoyz908) | Correção no diagrama de implantação UML| [Gabriel Castelo](https://github.com/GabrielCastelo-31)|
|1.5 | 05/05/2026|[Gabriel Castelo](https://github.com/GabrielCastelo-31) | Adição do diagrama lógico de dados| [Euller Júlio](https://github.com/Potatoyz908)|
|1.5.1 | 05/05/2026|[Euller Júlio](https://github.com/Potatoyz908) | Correção no diagrama de implantação UML| [Maria Eduarda](https://github.com/dudaa28) |
|1.6 | 08/05/2026|[Gabriel Castelo](https://github.com/GabrielCastelo-31) | Adição do diagrama de pacotes| [Euller Júlio](https://github.com/Potatoyz908)
|1.7 | 09/05/2026|[Maria Eduarda](https://github.com/dudaa28) | Adição do Diagrama  de Sequências e Atualização da página| [Euller Júlio](https://github.com/Potatoyz908) |
|1.8 | 09/05/2026|[Euller Júlio](https://github.com/Potatoyz908) | Adição de diagramas de sequência e explicação da arquitetura adotada| [Victor Pontual](https://github.com/VictorPontual)|
|2.0 | 10/05/2026 | [Victor Pontual](https://github.com/VictorPontual) | Revisão estrutural da arquitetura e integração completa das visões de hardware e software embarcado | - |