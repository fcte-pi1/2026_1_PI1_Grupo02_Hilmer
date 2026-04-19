# EAP – Energia 

Estrutura Analítica do Projeto voltada para o sistema responsável por fornecer energia ao micromouse.

---

## **1. Teoria**

Definição das necessidades energéticas do sistema e das restrições de tamanho.

- **1.1  Consumo de Energético:**  
    X
    
- **1.2 Autonomia:**  
    X
    
- **1.3 Dimensão e Peso:**  
    X
    
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