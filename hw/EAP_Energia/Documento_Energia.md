# EAP – Energia 

Estrutura Analítica do Projeto voltada para o sistema responsável por fornecer energia ao micromouse.

---

## **1. Teoria**

Definição das necessidades energéticas do sistema e das restrições de tamanho.

- **1.1  Consumo de Energético:**  
    
    O consumo energético do sistema foi estimado a partir da soma das correntes dos componentes eletrônicos utilizados no micromouse.

    Com base no levantamento realizado, os principais componentes incluem:

    - ESP32  
    - Sensores VL53L0X  
    - Motores DC com encoder  
    - Driver DRV8833  
    - MPU-6050  
    - Regulador de tensão (MP1584EN)  

    A corrente total estimada do sistema é:

    **7453,6 mA (≈ 7,45 A)**

    Esse valor representa o consumo máximo considerando todos os componentes em operação simultânea, especialmente os motores, que são os maiores responsáveis pelo gasto energético.

    ###  Análise importante

    - Motores DC são os principais consumidores (pico alto de corrente)  
    - Sensores e microcontrolador têm consumo relativamente baixo  
    - O sistema precisa de uma fonte que suporte picos de corrente elevados, não só a média  

   ---

- **1.2 Autonomia:**  
    
    A autonomia depende diretamente da capacidade da bateria utilizada.

    É importante garantir uma bateria com autonomia de, no mínimo:

    **2 a 4 horas**

    ### Fórmula base

    $\text{Autonomia (h)} = \frac{\text{Capacidade da bateria (mAh)}}{\text{Corrente total (mA)}}$

    ---
    
- **1.3 Dimensão e Peso:**  
    O peso total estimado dos componentes é:

    **92 g**

    Isso é extremamente relevante porque:

    - O peso influencia diretamente o consumo energético  
    - Quanto maior o peso → maior esforço dos motores → maior corrente  
    - Afeta também a velocidade e eficiência no labirinto  

    ### Implicações no projeto

    - Escolher bateria leve é essencial  
    - Evitar componentes desnecessários  
    - Otimizar estrutura mecânica  

    ### Estimativa de dimensão dos componentes energéticos

    Para estimar corretamente a dimensão dos componentes do sistema energético, especialmente da bateria, é necessário considerar um conjunto de fatores que relacionam requisitos elétricos e restrições físicas do projeto.

    Primeiramente, deve-se conhecer o consumo total do sistema, obtido a partir da soma das correntes de todos os componentes eletrônicos. Esse valor é fundamental, pois determina a capacidade mínima que a bateria deve possuir para garantir o funcionamento adequado do micromouse.

    Além disso, é necessário definir a autonomia desejada, ou seja, o tempo durante o qual o robô deve operar sem necessidade de recarga. Mesmo sendo uma aplicação de curta duração, como a navegação em labirinto, a autonomia deve ser suficiente para testes, ajustes e múltiplas tentativas.

    Outro fator essencial é a densidade de energia da bateria, que relaciona a quantidade de energia armazenada com seu volume e peso. Esse parâmetro permite selecionar baterias que ofereçam maior capacidade ocupando menos espaço, o que é ideal para sistemas compactos como o micromouse.

    ### Fatores adicionais importantes

    - **Dimensões físicas disponíveis no chassi:**  
    O espaço interno do robô limita diretamente o tamanho máximo da bateria e dos demais componentes.  

    - **Peso máximo suportado:**  
    O aumento de peso impacta o desempenho dos motores e o consumo energético.  

    - **Formato da bateria:**  
    Diferentes formatos (retangulares, cilíndricos, tipo pouch) influenciam a facilidade de integração na estrutura.  

    - **Distribuição dos componentes:**  
    A posição da bateria afeta o centro de massa e a estabilidade do robô.  

    Por fim, deve-se garantir que a bateria escolhida seja capaz de fornecer não apenas a corrente média, mas também os **picos de corrente exigidos**, principalmente durante a aceleração dos motores.

    
---

## **2. Seleção**

Escolha da melhor tecnologia de bateria para o projeto.

- **2.1 Tipo de Bateria:**  
    X
    
- **2.2 Capacidade:**  
    X
    
- **2.3 Conector:**  
    X
    
- **2.3 Preço:**  
    X
	
---

## **3. Projeto**

Intercessão com a eletrônica necessária para transformar a bateria selecionada em um sistema de alimentação **funcional, seguro e utilizável** no micromouse. Essa etapa inclui o desenvolvimento do **circuito de carregamento e dos mecanismos de proteção elétrica**, garantindo operação estável e segura. Sua importância está na transição entre a definição teórica da fonte de energia e sua implementação prática, assegurando a integridade dos componentes eletrônicos e a confiabilidade do sistema como um todo.

- **3.1 Carregador:**  
    - Definição do método de carregamento (USB, módulo TP4056, etc.)
    - Circuito de recarga implementado
    - Especificação de corrente e tensão de carga, regido pelo regulador de tensão (provavelmenete MP1584EN)
  
    A importância desse módulo é garantir que a bateria seja **carregada corretamente e com segurança**, evitando a sobrecarga e a degradação precoce da bateria, assim, permitindo reutilização contínua do micromouse.
    
- **3.2 Proteção Contra Curto:**  
    - Sistema de proteção implementado:
        - Fusível (o mais provável) ou
        - BMS ou
        - Circuito de proteção equivalente
    - Definição de limites de corrente

    Uma das partes mais críticas do projeto, pois **protege contra curto-circuitos e sobrecorrentes**, assim evitando dano ao MCU, aos motores e até possíveis danos a estrutura do micromouse

---

## **4. Integração**

Incorporação física e validação do sistema de energia.

- **4.1 Acoplamento da Estrutura:**  
    X
    
- **4.2 Conexões dos Cabos:**  
    X
    
- **4.3 Telemetria da Energia:**  
    X
	
- **4.3 Testes Finais:**  
    X

---

## Versionamento


| Versão | Data | Descrição | Autor(es/as) |
| :--- | :--- | :--- | :--- |
| 0.1 | 17/04/2026 | Estruturação do documento de EAP escrito | João Maurício |
| 0.2 | 19/04/2026 | Especificação da seção "Projeto" | João Maurício |
| 0.3 | 19/04/2026 | Especificação da seção "Teoria" | Giovanna Aguiar |