# Esboço das características desejáveis das rodas

## 1. Introdução

Seguindo o modelo inicial de CAD para o robô desenvolvida pelo núcleo de estrutura e pesquisas direcionadas, foram discutidas medidas provisórias para serem utilizadas como base na seleção das rodas e pneus que serão utilizados no MicroMouse, buscando cumprir o objetivo da equipe.

<br>

## 2. CAD e Vãos

A base do modelo do robô está apresentada por meio de um CAD neste repositório. A imagem a seguir exibe, em vista tridimensional, uma captura de tela desse modelo.

![CAD da Base](./modelagem%203d/base/Captura%20de%20tela%202026-05-03%20205549.png)

Os vãos destinados as rodas têm as dimensões de **30mm** x **14mm**, o que dá um direcionamento para a decisão da faixa de tamanhos possíveis para a roda.

<br>

## 3. Largura dos Pneus

A largura dos pneus, ou largura da banda de rodagem, é um fator que influencia diretamente na estabilidade do robô, assim como na precisão em curvas e no atrito com o solo. De forma resumida, para um *micromouse*, rodas mais finas proporcionam curvas mais precisas, enquanto rodas mais grossas proporcionam maior estabilidade para a estrutura como um todo, e maior área de contato do pneu com o solo, isto é, maior atrito.

Considerando o objetivo central da equipe, que não está focada em desenvolver um robô competitivo, e sim um robô estável, funcional, testável, e capaz de superar pequenos buracos de encaixe no labirinto, haverá uma preferência por rodas mais grossas (banda de rodagem > **1cm**). Além disso, há um espaço de **14mm** disponível para a roda no modelo inicial do chassi, o que não implica em um fator limitante para esse tamanho (já que uma parte do excesso pode extrapolar a largura do robô), mas dá um direcionamento nesse sentido.

Nesse sentido, a faixa ideal de largura da roda, seguindo o alinhamento da equipe, é de `11mm - 15mm`.

<br>

## 4. Diâmetro dos Pneus

O diâmetro dos pneus é outro fator decisivo na relação de escolha da roda. Rodas maiores tendem a fornecer maior velocidade em troca de mais torque, enquanto rodas menores tendem a fornecer mais precisão. Adicionalmente, aqui há um fator limitante para essa escolha: o comprimento do vão do chassi, que deve ser estritamente maior que o pneu para permitir a rolagem.

Para isso, será definida uma faixa de diâmetros de `20mm - 25mm`, que garantirá ao menos **5mm** de folga para a rolagem dos pneus, proporcionando também um tamanho que respeite a estrutura geral do *micromouse*.

<br>

## 5. Grip e Atrito

O *grip* é uma variável complexa que analisa fatores como [material](#6-material), textura e [largura dos pneus](#3-largura-dos-pneus), condições e material da pista para maximizar o atrito na superficie. Esse objetivo é central no desenvolvimento do projeto, uma vez que pneus sem atrito dificultam a previsibilidade e o cálculo dos movimentos do robô, além de também prejudicarem o controle sobre os mesmos.

Em relação às condições da pista, é esperado que a mesma seja construida sobre um material *mdf*, sem quantidades relevantes de umidade ou poeira, o que dispensa a necessidade de *sulcos* na banda de rodagem. Com relação à textura do material do pneu, o ideal seria um pneu liso, para maximizar o *grip* com o solo, mesmo essa abordagem tendendo a proporcionar maior desgaste do pneu com o tempo.

Nesse sentido, apesar de **preferível** que não haja textura na banda de rodagem, e existência de sulcos não impactará significativamente no atrito com o solo a ponto de prejudicar a equipe.


<br>

## 6. Material

Por fim, a respeito do material do pneu, é desejado um material macio e aderente. Para isso, é preferível alguma derivação de **borracha sintética**, como aquelas utilizadas nas peças de *Lego* (*SBS* e *SEBS*). Por fins de personalização, uma alternativa plástica seria o *filamento TPU*, utilizado em impressoras 3D.

<br>

## 7. Referências utilizadas

JAIN, J. **Robot Wheel Traction: Surface & Tire Type Selection Guide**. ZBOTIC. Disponível em: https://zbotic.in/robot-wheel-traction-surface-tire-type-selection-guide. Acesso em 4 maio 2026.

**How to choose proper Tires**. Micromouse USA. Disponível em: http://micromouseusa.com/?p=1111. Acesso em 4 maio 2026.


**What is The Role of Tire Size in Speed, Grip, and Stability?**. Brewminate. Disponível em: https://brewminate.com/what-is-the-role-of-tire-size-in-speed-grip-and-stability. Acesso em 4 maio 2026.

**De que são feitas as peças LEGO®?**. LEGO. Disponível em: https://www.lego.com/pt-br/service/help-topics/article/what-lego-bricks-are-made-of. Acesso em 4 maio 2026.
