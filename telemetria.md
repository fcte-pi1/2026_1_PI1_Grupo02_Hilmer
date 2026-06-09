# Especificação de Telemetria Minimalista (ESP32 -> Web)

---

O campo `tipo` está sempre presente como **primeiro campo** de todos os pacotes, permitindo que o web identifique o tipo sem precisar inspecionar o conteúdo restante.

| `tipo` | Pacote |
|--------|--------|
| `0` | Configuração Inicial |
| `1` | Movimentação / Descoberta de Paredes |
| `2` | Rota Otimizada |
| `3` | Fim de Corrida |
| `4` | Heartbeat |
| `5` | Alerta Crítico de Temperatura |

---

## 1. Configuração Inicial (Disparado uma única vez na largada)
Envia o tamanho do labirinto e o número da tentativa para preparar a interface web.

```json
{
  "tipo": 0,
  "timestamp_ms": 0,
  "dimensao": 4,
  "bateria": 100
}
```

- tipo (int): Identificador do tipo de pacote (0 = Configuração Inicial).
- timestamp_ms (int): Timestamp relativo ao inicio da corrida, em milissegundos.
- dimensao (int): Tamanho do labirinto atual. Enviar 4 para 4x4, 8 para 8x8 ou 16 para 16x16.
- bateria (int): Porcentagem estimada restante da bateria no inicio do teste (de 0 a 100).

## Convenção Espacial e de Coordenadas 

Para alinhar perfeitamente a lógica matemática do firmware em C++ com a renderização visual, adotamos o **Sistema Cartesiano Padrão**:

* **Origem `[0,0]`:** Localizada no **canto inferior esquerdo** do labirinto.
* **Eixo X:** Cresce para a **direita** (Direção Leste).
* **Eixo Y:** Cresce para **cima** (Direção Norte).

### Impacto na Movimentação do Robô (Lógica do ESP32):
* **Andar para o Norte:** Avança para frente $\rightarrow$ **Soma 1 em Y** (`y++`)
* **Andar para o Sul:** Anda para trás $\rightarrow$ **Subtrai 1 em Y** (`y--`)
* **Andar para o Leste:** Vira/anda para a direita $\rightarrow$ **Soma 1 em X** (`x++`)
* **Andar para o Oeste:** Vira/anda para a esquerda $\rightarrow$ **Subtrai 1 em X** (`x--`)

## 2. Movimentação e Descoberta de Paredes (Disparado APENAS ao mudar de célula)

Em vez de enviar dados por tempo (streaming contínuo), o ESP32 enviará este pacote pequeno somente quando o robô efetivamente entrar em uma nova célula durante a exploração (Frontier-Based).

```json
{
  "tipo": 1,
  "timestamp_ms": 1234,
  "x": 2,
  "y": 1,
  "w": 5
}
```

- tipo (int): Identificador do tipo de pacote (1 = Movimentação / Descoberta de Paredes).
- timestamp_ms (int): Timestamp relativo ao inicio da corrida, em milissegundos.
- x (int): Coordenada X atual do robô no labirinto, seguindo a convenção definida acima.
- y (int): Coordenada Y atual do robô no labirinto, seguindo a convenção definida acima.
- w (int): Bitmask (máscara de bits) das paredes descobertas nesta célula específica.

Convenção do Bitmask de Paredes (w):

A equipe web deve ler o valor inteiro e decodificar os bits para desenhar as paredes no site:

- Norte = bit 0 (Peso 1)
- Sul = bit 1 (Peso 2)
- Leste = bit 2 (Peso 4)
- Oeste = bit 3 (Peso 8)

    Exemplo: Se o JSON enviar "w": 5 (1 + 4), significa que a célula atual possui paredes ao Norte e ao Leste.

## 3. Rota Otimizada (Disparado uma única vez após o cálculo do Floodfill)

Envia a lista sequencial de coordenadas que formam o caminho perfeito calculado pelo algoritmo antes de iniciar a corrida rápida (Fast Run).

```json
{
  "tipo": 2,
  "timestamp_ms": 9000,
  "rota": [[0,0], [0,1], [0,2], [1,2], [2,2]]
}
```

- tipo (int): Identificador do tipo de pacote (2 = Rota Otimizada).
- timestamp_ms (int): Timestamp relativo ao inicio da corrida, em milissegundos.
- rota (array de arrays): Coordenadas consecutivas [x, y] do início ao fim do trajeto ideal. O site usará isso para desenhar a linha do caminho ótimo na tela.

## 4. Fim de Corrida / Consolidação (Disparado uma única vez ao terminar/falhar)

Contém os dados consolidados exigidos pelos professores. Este pacote fecha a rodada e deve ser salvo de forma permanente no banco de dados.

```json
{
  "tipo": 3,
  "timestamp_ms": 14250,
  "sucesso": true,
  "v_med": 0.22,
  "bateria": 88
}
```

- tipo (int): Identificador do tipo de pacote (3 = Fim de Corrida).
- timestamp_ms (int): Timestamp relativo ao inicio da corrida, em milissegundos.
- sucesso (boolean): true se o robô alcançou o centro autonomamente ou false se colidiu/desistiu.
- v_med (float): Velocidade média final do percurso em metros por segundo.
- bateria (int): Porcentagem estimada restante da bateria no final do teste (de 0 a 100).


***
## 5. Heartbeat (Disparado periodicamente enquanto o ESP32 estiver ativo)

Enviado em intervalos regulares (a cada 1,5 segundos) para indicar que a conexão com o ESP32 está viva. Se o web não receber este pacote dentro do intervalo esperado, deve exibir um aviso de conexão perdida.

```json
{
  "tipo": 4,
  "timestamp_ms": 5000,
  "bateria": 95
}
```

- tipo (int): Identificador do tipo de pacote (4 = Heartbeat).
- timestamp_ms (int): Timestamp relativo ao inicio da corrida, em milissegundos.
- bateria (int): Porcentagem estimada restante da bateria no momento do envio (de 0 a 100). Permite monitorar o consumo ao longo da corrida.

> **Comportamento esperado no Web:** Se nenhum pacote de qualquer tipo (incluindo heartbeat) for recebido por mais de **3 segundos**, a interface deve exibir indicador visual de "Conexão Perdida".

---

## 6. Alerta Crítico de Temperatura (Disparado quando a temperatura ultrapassa o limiar seguro)

Enviado imediatamente sempre que o sensor de temperatura detectar valor acima do limiar crítico configurado no firmware. A corrida é interrompida automaticamente após este pacote. O web deve exibir um alerta visual de emergência.

```json
{
  "tipo": 5,
  "timestamp_ms": 7800,
  "temp_c": 61.0,
}
```

- tipo (int): Identificador do tipo de pacote (5 = Alerta Crítico de Temperatura).
- timestamp_ms (int): Timestamp relativo ao inicio da corrida, em milissegundos.
- temp_c (float): Temperatura atual medida pelo sensor, em graus Celsius.

***

### Alinhamento com os Requisitos de Avaliação da Disciplina:
* **Labirintos:** O campo `dimensao` mapeia se o teste ocorre no labirinto $4\times4$, $8\times8$ ou $16\times16$.
* **Trajeto:** As coordenadas `x`, `y` enviadas por célula preenchem dinamicamente o trajeto em tempo real e a `rota` exibe a inteligência do Floodfill.
* **Persistência e Relatórios:** Os dados do pacote de **Fim de Corrida** fornecem exatamente o consumo de bateria, velocidade média, tempo de conclusão e status de sucesso que a equipe web precisa gravar no banco de dados para cumprir as exigências de avaliação do projeto.
