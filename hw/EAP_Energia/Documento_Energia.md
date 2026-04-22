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
    O peso estimado dos componentes eletrônicos é:

    **92 g**

    No entanto, é importante considerar que esse valor não representa o peso total do micromouse. A estrutura mecânica, rodas, chassi, fixadores e outros elementos adicionais também contribuem para o peso final do sistema.

    Assim, estima-se um acréscimo de **pelo menos 16 g**, resultando em um peso total aproximado de:

    **≈ 108 g ou mais**

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

A seleção da bateria foi feita com base na corrente total estimada do sistema (**7453,6 mA**), nas tensões exigidas pelos subsistemas (**3,3 V** para ESP32 e sensores, e **6 V** para os motores) e nas restrições de peso e espaço do micromouse.

- **2.1 Tipo de Bateria:**  
    A bateria mais adequada para o projeto é uma **Li-Po 2S (7,4 V)**.  
    Essa escolha se deve à sua **alta densidade de energia**, **capacidade de descarga elevada**, **baixo peso** e **boa compatibilidade com os reguladores do sistema**.  
    A tensão de 7,4 V também oferece margem adequada para alimentar os motores e os circuitos de 3,3 V por meio de regulação
    
- **2.2 Capacidade:**  
    A bateria deve suportar a corrente total estimada de **7,45 A** com margem de segurança.  
    Por isso, recomenda-se uma bateria entre **850 mAh e 1000 mAh**, com taxa de descarga de pelo menos **10C**, sendo **20C** a opção mais segura.

    A corrente máxima fornecida pela bateria é dada por:

    **Corrente máxima = Capacidade (Ah) × Taxa de descarga (C)**

    Exemplo:
    - **850 mAh a 20C** → até **17 A**
    - **1000 mAh a 20C** → até **20 A**

    Essa faixa atende ao sistema com folga e mantém o peso do robô reduzido.
    
- **2.3 Conector:**  
    O conector recomendado é o **XT30**, por suportar correntes elevadas com maior segurança e menor resistência de contato.  
    Isso reduz riscos de aquecimento e mau contato durante a operação do micromouse.
    
- **2.3 Preço:**  
    O preço da solução de alimentação deve considerar não apenas a bateria, mas também sua compatibilidade elétrica e mecânica com o projeto. Para isso, devem ser comparados modelos reais quanto à tensão, capacidade, taxa de descarga, peso, dimensões, tipo de conector incluído e custo de carregamento. Caso a bateria já possua conector compatível com o sistema, esse item não gera custo adicional; caso contrário, deve-se considerar o uso de adaptadores ou a substituição do conector. Assim, o critério de preço deve ser analisado com base no custo total de integração da solução energética.
	
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
	Esta atividade define o método de fixação física da bateria Li-Po 2S e dos demais componentes do sistema de energia ao chassi do micromouse, equilíbrio de massa e facilidade de manutenção.

	**Posicionamento da Bateria**

	 É preferível posicionar a bateria de forma centralizada no eixo longitudinal do robô, preferencialmente entre os dois motores, próxima ao centro de massa do conjunto. Isso minimiza o momento de inércia durante as curvas no labirinto e reduz o esforço compensatório dos motores. Vale ressaltar que caso algum componente seja sensível a temperatura, este não deve permanecer próximo a bateria ou vice versa.

	**Método de Fixação**

	Com base em outros micromouses usados para competição, os métodos mais utilizados são tanto colar diretamente a bateria no micromouse, como também o uso de encaixes fixados nele. A primeira opção é mais fácil de ser implementada, é mais barata, mas dificulta a manutenção. Já a segunda tem uma melhor manutenção ao custo de ser mais difícil de ser implementada.
    
- **4.2 Conexões dos Cabos:**  
    Esta atividade foca-se na definição da infraestrutura de cablagens necessária para suportar a corrente de pico de 7,45 A, integrando os componentes do projeto:

    - Dimensionamento de Condutores: Definir a bitola adequada para os cabos de potência que ligarão a bateria aos drivers de motor, garantindo que a resistência não comprometa o torque dos motores N20.

    - Implementação do Conector XT30: Montagem do conector XT30 de forma a assegurar uma ligação robusta e de baixa resistência entre a bateria Li-Po e o circuito principal.

    - definir o posicionamento físico e o método de instalação do fusível de vidro (previsto na planilha) para garantir que este atue eficazmente antes de qualquer dano ao ESP32 ou aos drivers.

    - Organizar o chicote elétrico para alimentar os 6 sensores VL53L0X e o MPU-6050, minimizando a desordem de cabos e interferências no chassi.

    
- **4.3 Telemetria da Energia:**
Esta etapa tem como objetivo implementar um sistema de monitoramento em tempo real do consumo energético do micromouse, permitindo análise de desempenho e validação de autonomia.

  **Objetivos de Medição**

  Para atender às necessidades do projeto e validar os requisitos definidos nas seções anteriores, o sistema de telemetria deve medir:

  -   **Corrente (A)**
    Utilizada para validar a estimativa de consumo total (**7,45 A**) e identificar picos de corrente dos motores, que são importantes para o dimensionamento da bateria e da proteção contra sobrecorrente.
  -   **Tensão (V)**
    Necessária para verificar a estabilidade da alimentação, especialmente nas linhas de **3,3 V**, garantindo funcionamento correto do sistema eletrônico.
  -   **Potência (W)**
    Permite analisar o consumo instantâneo do sistema, correlacionando diretamente com o esforço dos motores e o comportamento dinâmico do micromouse.
  -   **Energia consumida (Wh)**  
    Fundamental para validar a autonomia real do sistema, comparando os resultados experimentais com a estimativa teórica baseada na capacidade da bateria.

  **Sensor Selecionado**

  O sensor escolhido para essa aplicação é o **INA226**, por apresentar melhor desempenho em relação a outras alternativas como o **INA219** pelo mesmo valor.

  **Características principais**

  -   **Medição de**:
      -   Corrente
      -   Tensão
      -   Potência (diretamente pelo hardware)
  -   **Alta precisão (16 bits)** → melhor resolução para análise detalhada
  -   **Comunicação via I2C (digital)** → fácil integração com o ESP32
  -   **Shunt digital integrado** → simplifica o circuito de medição
  -   **Baixo custo**:
      -   ~R$15 (importação)
      -   ~R$30 (mercado nacional)

  **Cálculo de Energia**

  A energia consumida não é medida diretamente pelo sensor, mas pode ser obtida via integração da potência ao longo do tempo:

  $E(Wh) = \int P(t)\, dt$

   Na prática, isso será implementado no ESP32 via amostragem discreta:
  -   Leitura periódica da potência
  -   Soma acumulada ao longo do tempo
	
- **4.4 Testes Finais:**  
    Esta etapa tem como foco garantir o bom funcionamento assim como a segurança operacional da distribuição elétrica:

    - Validação de Autonomia: O sistema precisa de ser testado em operação contínua para confirmar se a configuração final suporta o requisito de 2 a 4 horas de funcionamento no labirinto.

    - Monitorização de Estabilidade (Ripple): É necessário validar, através de medições, se a oscilação de tensão na linha lógica permanece abaixo do limite estabelecido de 30mV, assegurando a integridade do SD Reader e dos sensores.

    - Ensaio de Resiliência Mecânica: O protótipo precisa de ser submetido a manobras de alta aceleração e travagens bruscas para validar se o método de conexão e fixação dos cabos suporta o esforço mecânico sem interrupções de energia.

    - Avaliação Térmica do Regulador: É necessário monitorizar a temperatura do regulador MP1584EN sob carga máxima para definir se a dissipação térmica natural é suficiente para a autonomia pretendida ou se requer ajustes.

---

## Versionamento


| Versão | Data | Descrição | Autor(es/as) |
| :--- | :--- | :--- | :--- |
| 0.1 | 17/04/2026 | Estruturação do documento de EAP escrito | João Maurício |
| 0.2 | 19/04/2026 | Especificação da seção "Projeto" | João Maurício |
| 0.3 | 19/04/2026 | Especificação da seção "Teoria" | Giovanna Aguiar |
| 0.4 | 19/04/2026 | Especificação da seção de "Seleção" | Tiago Balieiro |
| 0.5 | 19/04/2026 | Especificação parcial da seção "Integração" | Cristiano Morais |
| 1.0 | 20/04/2026 | Especificação final da seção "Integração" | Rafael Melatti |
| 1.1 | 21/04/2026 | Correção na sessão "Teoria" | Giovanna Aguiar |