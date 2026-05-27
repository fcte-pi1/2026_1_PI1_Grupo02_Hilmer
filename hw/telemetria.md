# Especificação de Telemetria Minimalista (ESP32 -> Web)

---

## 1. Configuração Inicial (Disparado uma única vez na largada)
Envia o tamanho do labirinto e o número da tentativa para preparar a interface web.

```json
{
  "id_corrida": 1,
  "timestamp_ms": 0,
  "dimensao": 4,
  "tentativa": 1
  "bateria": 100
}
```

- id_corrida (int): Identificador da corrida/sessao atual para correlacionar todos os pacotes enviados.
- timestamp_ms (int): Timestamp relativo ao inicio da corrida, em milissegundos.
- dimensao (int): Tamanho do labirinto atual. Enviar 4 para 4x4, 8 para 8x8 ou 16 para 16x16.
- tentativa (int): Número da tentativa atual no labirinto (valores de 1, 2 ou 3).
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
JSON

```json
{
  "id_corrida": 1,
  "timestamp_ms": 1234,
  "x": 2,
  "y": 1,
  "w": 5
}
```

- id_corrida (int): Identificador da corrida/sessao atual para correlacionar todos os pacotes enviados.
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
JSON

```json
{
  "id_corrida": 1,
  "timestamp_ms": 9000,
  "rota": [[0,0], [0,1], [0,2], [1,2], [2,2]]
}
```

- id_corrida (int): Identificador da corrida/sessao atual para correlacionar todos os pacotes enviados.
- timestamp_ms (int): Timestamp relativo ao inicio da corrida, em milissegundos.
- rota (array de arrays): Coordenadas consecutivas [x, y] do início ao fim do trajeto ideal. O site usará isso para desenhar a linha do caminho ótimo na tela.

## 4. Fim de Corrida / Consolidação (Disparado uma única vez ao terminar/falhar)

Contém os dados consolidados exigidos pelos professores. Este pacote fecha a rodada e deve ser salvo de forma permanente no banco de dados.
JSON

```json
{
  "id_corrida": 1,
  "timestamp_ms": 14250,
  "sucesso": true,
  "v_med": 0.22,
  "bateria": 88
}
```

- id_corrida (int): Identificador da corrida/sessao atual para correlacionar todos os pacotes enviados.
- timestamp_ms (int): Timestamp relativo ao inicio da corrida, em milissegundos.
- sucesso (boolean): true se o robô alcançou o centro autonomamente ou false se colidiu/desistiu.
- v_med (float): Velocidade média final do percurso em metros por segundo.
- bateria (int): Porcentagem estimada restante da bateria no final do teste (de 0 a 100).


***

***

### Alinhamento com os Requisitos de Avaliação da Disciplina:
* **Labirintos:** O campo `dimensao` mapeia se o teste ocorre no labirinto $4\times4$, $8\times8$ ou $16\times16$.
* **Trajeto:** As coordenadas `x`, `y` enviadas por célula preenchem dinamicamente o trajeto em tempo real e a `rota` exibe a inteligência do Floodfill.
* **Persistência e Relatórios:** Os dados do pacote de **Fim de Corrida** fornecem exatamente o consumo de bateria, velocidade média, tempo de conclusão e status de sucesso que a equipe web precisa gravar no banco de dados para cumprir as exigências de avaliação do projeto.