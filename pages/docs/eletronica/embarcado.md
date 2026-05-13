## Backlog do Produto

O *Backlog* do Produto consolida as necessidades e funcionalidades do sistema Micromouse, sendo estruturado para garantir a rastreabilidade e a priorização adequada das entregas. As funcionalidades do sistema foram documentadas diretamente utilizando-se a técnica de Histórias de Usuário (HU), permitindo a compreensão clara das necessidades dos atores sob a perspectiva de valor de negócio.

Para a priorização dos itens, adotou-se o método MoSCoW, classificando as funcionalidades em *Must Have* (essenciais), *Should Have* (importantes, mas não vitais) e *Could Have* (desejáveis). Adicionalmente, os requisitos não-funcionais (RNF) foram definidos sob critérios objetivos, evitando descrições subjetivas e focando em métricas mensuráveis de desempenho, como tempo de resposta e estabilidade da conexão.

Todas as Histórias de Usuário (HUs) possuem descrição estruturada no formato **Eu–Como–Para**, critérios de aceitação e protótipos de interface devidamente documentados. A estrutura completa do Backlog do Produto encontra-se disponível no [Backlog do Projeto no GitHub](https://github.com/orgs/fcte-pi1/projects/16/views/1), permitindo rastreabilidade e acompanhamento detalhado do desenvolvimento do projeto.

Vale ressaltar que este documento foca nos épicos e requisitos relacionados ao desenvolvimento de sistemas **Embarcados**. A parte complementar do backlog, com foco no sistema web e gerenciamento de dados, pode ser encontrada na seção de [Software](../software/backlog-produto.md).

As tabelas a seguir apresentam a divisão do backlog organizada por épicos de desenvolvimento.

---

### Épico A: Desenvolvimento de Firmware

| ID | Título da História | Priorização (MoSCoW) | História de Usuário | Critério de Aceite |
| :---- | :---- | ----- | :---- | :---- |
| **HU-02** | Percepção e Segurança | Must Have | Eu como avaliador, desejo que o circuito tenha sensores de distância e proteções elétricas, para que o robô detecte paredes sem sofrer danos. | **CA-02-01**:Sensores IR devem detectar objetos a pelo menos 30 cm. **CA-02-02**:PCB com proteção contra curto-circuitos para prevenir danos ao MCU. **CA-02-03**:Sistema de sensores deve cobrir angulação de pelo menos 90°. |
| **HU-03** | Controle e Energia | Must Have | Eu como sistema embarcado, quero processar os sinais dos encoders e sensores inerciais, para que o Micromouse execute movimentos precisos. | **CA-03-01:** O sistema deve converter os pulsos dos encoders em velocidade linear e angular do robô **CA-03-02:** O sistema deve atualizar continuamente a posição estimada do robô com base na odometria **CA-03-03:** O sistema deve utilizar dados do acelerômetro para detectar impactos ou desvios de trajetória **CA-03-04:** O sistema deve ajustar o controle de movimento para manter a trajetória desejada durante a navegação |
| **HU-04** | Persistência de Dados | Should Have | Eu como desenvolvedor, quero que o robô armazene a telemetria em um cartão SD, para garantir que os dados não sejam perdidos. | **CA-04-01**:Gravar dados em tempo real no SD Card em formato CSV ou JSON. **CA-04-02**:Garantir a integridade do arquivo mesmo se a alimentação for interrompida bruscamente |
| **HU-06** | Energização e Bateria | Must Have | Eu como avaliador, quero que o sistema de energia permita recarregar a bateria e forneça alimentação estável. | **CA-06-01**: O sistema deve iniciar a recarga automaticamente ao ser conectado a uma fonte de energia externa compatível. **CA-06-02:** A conexão física deve ser robusta o suficiente para suportar múltiplos ciclos de conexão/desconexão sem perda de contato. **CA-06-03**: O sistema deve fornecer tensões constantes (ex: 3.3V, 5V, 12V) independentemente da queda gradual de tensão da bateria principal (enquanto houver carga). |
| **HU-07** | Unificação do Sistema | Must Have | Eu como avaliador, desejo que todos os subsistemas estejam integrados em uma única plataforma funcional. | **CA-07-01**: O firmware principal deve ser capaz de gerenciar simultaneamente a leitura dos sensores e o controle dos motores sem travamentos. **CA-07-02**: Os dados de telemetria coletados devem refletir com precisão o estado real de todos os sensores integrados. **CA-07-03**: A integração física de todos os componentes na PCB não deve apresentar interferências eletromagnéticas que comprometam o funcionamento do sistema. |




### Épico E: Envio de Dados de Telemetria

| ID | Título da História | Priorização (MoSCoW) | História de Usuário | Critério de Aceite |
| :---- | :---- | ----- | :---- | :---- |
| **HU-20** | Comunicação Micromouse | Must Have | Eu como avaliador quero que o sistema web se comunique com o micromouse para obter dados. | **CA-20-01: Dado** que o micromouse e o sistema estão ligados. Quando a comunicação for iniciada; Então o sistema web e o micromouse devem estabelecer uma sessão de conexão. |
| **HU-22** | Aglutinação de Dados | Must Have | Eu como avaliador, quero que o sistema organize e formate os dados de telemetria em pacotes estruturados para envio sem fio. | **CA-22-01**: O sistema deve agrupar as leituras dos sensores IR, encoders e IMU em uma única estrutura de dados (struct) ou string formatada. **CA-22-02:** A formatação dos dados deve ser compatível com a transmissão via protocolos sem fio suportados pelo ESP-32 (como UDP/TCP via WiFi ou Serial Bluetooth). |

### Épico F: Corrida para a Chegada

| ID | Título da História | Priorização (MoSCoW) | História de Usuário | Critério de Aceite |
| :---- | :---- | ----- | :---- | :---- |
| **HU-05** | Calibração de Sensores | Must Have | Eu Como avaliador, desejo que o robô realize uma calibração automática de seus sensores de luminosidade antes do início da prova, para que as variações de luz do ambiente não interfiram na precisão da leitura durante a navegação. | **CA-05-01**:Executar calibração automática de luz ambiente antes da largada. **CA-05-02**:Recalcular posição com erro máximo de \+/- 1 cm após derrapagem. |
| **HU-23** | Aglutinação de Dados em formato Enviável | Must Have | Eu Como avaliador, desejo que o robô identifique e corrija desvios de posição causados por colisões ou derrapagens, para que o mapeamento não seja corrompido e a navegação continue de forma precisa. | - |

### Histórias de Usuário Adicionais

| ID | Título da História | Priorização (MoSCoW) | História de Usuário | Critério de Aceite |
| :---- | :---- | ----- | :---- | :---- |
| **HU-01** | Exploração Autônoma | Must Have | Eu Como avaliador, desejo que o robô mapeie e resolva o labirinto de forma autônoma, para que ele alcance o objetivo central de forma eficiente. | **CA-01-01**:Utilizar algoritmo *Frontier-based Exploration* para achar a célula final. **CA-01-02**:Detectar e trocar de algoritmo ao alcançar o centro. **CA-01-03**:Utilizar *Flood Fill* para mapear a área. **CA-01-04**:Evitar loops infinitos armazenando células visitadas. |


### **Requisitos Não-Funcionais de Embarcados**

| ID | Descrição do Requisito Não Funcional | Priorização (MOSCOW) | Rastreabilidade |
| :---- | :---- | ----- | :---- |
| **RNF-01-EMB** | O sistema deve possuir sensores capazes de detectar objetos a pelo menos de 30 cm de distância. | Must Have | HU-02 |
| **RNF-02-EMB** | O sistema de sensores deve detectar objetos com angulação de pelo menos 90° com o robô parado. | Must Have | HU-02 |
| **RNF-03-EMB** | O micromouse não deve exceder 10 cm de largura ou comprimento. | Must Have | HU-01 |
| **RNF-04-EMB** | O robô não pode causar danos às paredes ou ao chão do labirinto. | Must Have | HU-02 |
| **RNF-05-EMB** | O algoritmo deve ser capaz de recuperar a posição do robô caso ocorra uma leve colisão ou derrapagem. | Should Have | HU-05 |
| **RNF-06-EMB** | O sistema deve utilizar o algoritmo frontier-based exploration para encontrar a célula final. | Must Have | HU-01 |
| **RNF-07-EMB** | O sistema deve utilizar o algoritmo Flood Fill para mapear toda a área explorável. | Must Have | HU-01 |
| **RNF-08-EMB** | O código deve ser modular para facilitar ajustes rápidos. | Should Have | HU-05/HU-07 |

## Histórico de Versões

|Versão|Data|Autor|Descrição|Revisor |
|---|---|---|---|---|
|1.0|13/05/2026|[Enzo Emir](https://github.com/EnzoEmir)|Criação do documento| -|