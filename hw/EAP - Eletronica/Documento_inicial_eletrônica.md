# EAP - Eletrônica

## 1 Levantamento de Requisitos e Planejamento Técnico

### 1.1  Análise de Datasheets

Estudo detalhado dos requisitos para o levantamento dos componentes necessários.

### 1.2 Plano de Gerenciamento de Energia

Dimensionamento dos níveis de tensão e consumo de corrente do sistema.

### 1.3 Levantamento de Custos e Orçamento

Pesquisa de preços iniciais e planejamento de aquisição dos componentes.

## 2 Prototipagem e Validação de Subsistemas

### 2.1 Validação de Leitura Sensorial

Testes em protoboard dos sensores de distância para calibrar a detecção de paredes e integrar com o código base.

### 2.2 Teste de Driver e Motores

Validação da Ponte H, conversão da leitura dos sinais dos encoders e validação do código embarcado.

### 2.3 Prototipagem do IMU

Validação do acelerômetro e giroscópio e integração com o código embarcado.

### 2.4 Definição de Pinout

Mapeamento definitivo dos pinos utilizados na ESP32.

## 3 Desenvolvimento da PCB

### 3.1 Desenho do Esquemático

Criação do diagrama elétrico completo no software EASYEDA.

### 3.2 Layout e Roteamento

Design físico da placa, focando na integração de todos os sensores e componentes para otimização do espaço utilizado.

### 3.3 Fabricação e Soldagem

Confecção da placa de circuito impresso e montagem física de todos os componentes eletrônicos.

### 3.4 Teste de Continuidade e Curto-Circuito

Inspeção visual e verificação elétrica com multímetro antes da primeira energização com a bateria.

## 4 Desenvolvimento do Firmware de Alto Nível e Lógica de Navegação

### 4.1 Desenvolvimento do Firmware Principal

Desenvolvimento do código principal para unificar os subsistemas e gerenciar as decisões do robô.

### 4.2 Estruturação da Telemetria

Criação do protocolo para envio de informações críticas.

### 4.3 Algoritmo de Mapeamento do Labirinto

Implementação da lógica de mapeamento do labirinto.

### 4.4 Lógica de Resolução e Otimização.

Desenvolvimento do algoritmo de resolução do labirinto.

## 5 Integração e Comissionamento
### 5.1 Montagem Final

Instalação da PCB, fixação dos sensores e integração com o chassi do micromouse.

### 5.2 Testes de Stress

Verificação da autonomia do micromouse.

### 5.3 Validação em Labirinto

Testes práticos de navegação na pista, avaliação do tempo de resposta e validação dos códigos embarcados e integração final com o software web desenvolvido.