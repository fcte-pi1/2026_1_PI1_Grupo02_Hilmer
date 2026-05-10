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

A visão lógica descreve os principais módulos da solução e suas responsabilidades.

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

---

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
4. Os dados são armazenados localmente no SD Card.
5. Em paralelo, a telemetria é enviada ao backend.
6. O backend valida, processa e persiste os dados.

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

---

### 6.3.1 Frontend

O frontend React é organizado em:

- componentes reutilizáveis;
- páginas de monitoramento;
- páginas de consulta;
- gerenciamento de estado global.

---

### 6.3.2 Backend

O backend FastAPI é organizado em:

- API REST;
- gerenciamento de WebSocket;
- serviços de telemetria;
- serviços de persistência;
- modelos de dados.

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
|1.4.1 | 05/05/2026|[Euller Júlio](https://github.com/Potatoyz908) | Correção no diagrama de implantação UML| [Maria Eduarda](https://github.com/dudaa28) |
|1.5 | 09/05/2026|[Maria Eduarda](https://github.com/dudaa28) | Adição do Diagrama  de Sequências e Atualização da página| [Euller Júlio](https://github.com/Potatoyz908) |
|1.6 | 09/05/2026|[Euller Júlio](https://github.com/Potatoyz908) | Adição de diagramas de sequência e explicação da arquitetura adotada| [Victor Pontual](https://github.com/VictorPontual)|
|2.0 | 10/05/2026 | [Victor Pontual](https://github.com/VictorPontual) | Revisão estrutural da arquitetura e integração completa das visões de hardware e software embarcado | - |
