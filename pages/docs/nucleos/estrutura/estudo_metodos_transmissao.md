# Estudo sobre métodos de transmissão da roda no motor

## 1. Objetivo

Esta pesquisa compara métodos de  transmissão entre motor e roda para o micromouse, com foco em uma solução que seja simples de montar, confiável e adequada ao CAD do chassi.

## 2. Métodos avaliados

### 2.1 Roda direta no eixo do motor N20

Nesta opção, a roda é encaixada diretamente no eixo de saída do motor N20. Como o N20 já possui redução interna, o sistema fica mais simples:

```text
motor N20 com redução → roda encaixada diretamente no eixo
```

**Vantagens:**

- Menor quantidade de peças.
- Não precisa alinhar engrenagens externas.
- Não precisa tensionar correia.
- Menor chance de folga, travamento ou erro no CAD.
- Boa opção para garantir uma versão funcional do robô.

**Desvantagens:**

- Menor liberdade para alterar mecanicamente a relação de velocidade/torque.
- Se a roda for muito grande, o robô pode ficar rápido demais.
- Depende de encontrar roda compatível com eixo tipo D de 3 mm.

### 2.2 Engrenagens retas externas

Nesta opção, usa-se um pinhão pequeno no eixo do motor e uma engrenagem maior no eixo da roda:

```text
motor → pinhão pequeno → engrenagem maior → eixo da roda → roda
```

**Vantagens:**

- Permite aumentar o torque na roda.
- Permite reduzir a velocidade mecanicamente.
- Permite testar o chassi com um eixo de roda separado.
- É simples de explicar e pode ser fabricada ou comprada com peças de robótica.

**Desvantagens:**

- Exige alinhamento preciso entre pinhão, engrenagem maior e eixo da roda.
- Precisa de suporte para o eixo da roda, preferencialmente com bucha ou rolamento.
- Aumenta o número de peças e o risco de folga ou travamento.
- Os dois lados precisam ficar praticamente iguais para o robô não puxar para um lado.

### 2.3 Polias com correia GT2

Nesta opção, uma polia no motor transmite movimento para uma polia na roda usando correia dentada GT2:

```text
motor → polia pequena → correia GT2 → polia maior → eixo da roda → roda
```
**Vantagens:**

- transmissão mais suave e silenciosa;
- permite deixar o motor mais afastado da roda;
- reduz o contato direto entre engrenagens;
- permite alterar a relação de velocidade/torque trocando as polias;
- é comum em projetos de robótica e impressoras 3D.

**Desvantagens:**

- precisa de tensionamento correto da correia;
- se a correia ficar frouxa, pode pular dente;
- se ficar apertada demais, aumenta o atrito e pode forçar o motor;
- exige mais cuidado no CAD para prever ajuste de tensão;
- pode ocupar mais espaço no chassi.


---

## 3. Comparação das opções

| Critério | Roda direta no N20 | Engrenagens retas | Correia GT2 | Melhor para o grupo |
|---|---|---|---|---|
| Facilidade de montagem | Alta | Média | Média/baixa | Roda direta |
| Número de peças | Baixo | Médio | Médio/alto | Roda direta |
| Risco de desalinhamento | Baixo | Médio/alto | Médio | Roda direta |
| Ajuste de torque mecânico | Baixo | Bom | Bom | Engrenagens/GT2 |
| Necessidade de tensionamento | Não | Não | Sim | Roda direta/engrenagens |
| Chance de funcionar rápido | Alta | Média | Média/baixa | Roda direta |

---

## 4. Método escolhido: engrenagens retas

O método escolhido será a **transmissão por engrenagens retas**.

A ideia é usar:

- um **pinhão pequeno** no eixo do motor;
- uma **engrenagem maior** no eixo da roda.

Montagem básica:

```text
motor → pinhão pequeno → engrenagem maior → eixo da roda → roda
```

Esse método foi escolhido porque permite aumentar o torque, reduzir a velocidade e testar o chassi com um eixo de roda separado.

---

## 5. Como funciona

O motor gira o próprio eixo. O pinhão preso nesse eixo gira junto e movimenta a engrenagem maior. A engrenagem maior fica presa ao eixo da roda, fazendo a roda girar.

Etapas:

1. O motor gira.
2. O pinhão gira junto com o motor.
3. O pinhão move a engrenagem maior.
4. A engrenagem maior gira o eixo da roda.
5. O eixo gira a roda.

---


## 6. O que prever no CAD

O CAD precisa prever:

- posição dos dois motores;
- suporte firme para os motores;
- espaço para o pinhão;
- espaço para a engrenagem maior;
- furo ou suporte para o eixo da roda;
- bucha ou rolamento para o eixo;
- mesma distância e alinhamento nos dois lados do robô.

Como serão dois motores, a montagem deve ser simétrica:

```text
lado esquerdo: motor + pinhão + engrenagem + eixo + roda
lado direito: motor + pinhão + engrenagem + eixo + roda
```

---

## 7. Cálculos essenciais

### Relação de transmissão

```text
relação = dentes da engrenagem maior ÷ dentes do pinhão
```

Exemplo:

```text
pinhão = 10 dentes
engrenagem maior = 40 dentes

relação = 40 ÷ 10 = 4:1
```

Isso significa que o motor gira 4 voltas para a roda girar 1 volta. A roda fica mais lenta, mas com mais torque.

### RPM da roda

```text
RPM da roda = RPM do motor ÷ relação
```

Exemplo com motor de 750 RPM e relação 4:1:

```text
RPM da roda = 750 ÷ 4 = 187,5 RPM
```

---

## 8. Testes, riscos e conclusão

Antes de usar no robô completo, é necessário testar:

- se a roda gira sem travar;
- se o pinhão e a engrenagem estão alinhados;
- se não existe folga excessiva;
- se os dois lados giram de forma parecida;
- se o robô anda reto.

| Risco | Como evitar |
|---|---|
| Engrenagem travando | Ajustar distância entre motor e eixo da roda |
| Folga | Aproximar as engrenagens sem apertar demais |
| Robô andando torto | Usar peças e relações iguais nos dois lados |
| Atrito no eixo | Usar bucha ou rolamento |
| Motor desalinhando | Prender o motor com suporte firme |


---

## Referências rápidas

## Referências

CANADA ROBOTIX. N20 Micro Metal Gear Motor with Encoder. Disponível em: <https://www.canadarobotix.com/products/2846>. Acesso em: 2 maio 2026.

ROBOTSHOP. Aslong Motor DC 6V 750RPM 3mm Shaft Mini Metal Gearwheel Gear Motor N20 with Encoder Cable. Disponível em: <https://www.robotshop.com/products/aslong-motor-dc-6v-750rpm-3mm-shaft-mini-metal-gearwheel-gear-motor-n20-w-encoder-cable>. Acesso em: 2 maio 2026.

ROBOCORE. Micro Motor com Caixa de Redução 6V 750RPM com Encoder. Disponível em: <https://www.robocore.net/motor-motoredutor/micro-motor-caixa-de-reducao-6v-750rpm-com-encoder>. Acesso em: 2 maio 2026.

KHK GEARS. Gear technical reference: center distance. Disponível em: <https://khkgears.net/new/gear_knowledge/gear-nomenclature/center-distance.html>. Acesso em: 2 maio 2026.

SDP/SI. Timing belt and pulley technical information. Disponível em: <https://www.sdp-si.com/resources/elements-of-metric-gear-technology/index.php>. Acesso em: 2 maio 2026.

NSK. Bearing technical information. Disponível em: <https://www.nsk.com/products/bearings/>. Acesso em: 2 maio 2026.

UKMARS. UKMARSBot motor selection. Disponível em: <https://ukmars.org/projects/ukmarsbot/ukmarsbot-build-guide/motor-selection/>. Acesso em: 2 maio 2026.
