## Teste da fixação de duas placas impressas em impressão 3D por parafuso M2

Um dos problemas enfrentados na montagem do micromouse é garantir o uso adequado de parafusos M2 na fixação dos suportes estruturais, como base ao capô, skid à base, suporte dos sensores à base, suporte da PCB à base, suporte do motor à base e suporte do mancal à base. Para avaliar a viabilidade dessa fixação, foi desenvolvido um modelo simples composto por duas placas impressas em 3D para teste com parafusos M2.

Existem diferentes formas de utilizar parafusos M2 em peças impressas. A impressão direta de roscas no plástico é, em geral, inviável para impressoras FDM comuns. A rosca de um parafuso M2 possui diâmetro nominal de 2 mm e passo de 0,4 mm, ficando próxima do limite de resolução de impressoras equipadas com bicos de 0,4 mm, como a Ender-3 Pro. A impressão da rosca fêmea diretamente na peça tende a resultar em falhas geométricas, emperramento do parafuso ou baixa resistência mecânica da região roscada. Assim, as alternativas mais viáveis são o uso de porcas inseridas na peça ou a utilização do próprio parafuso para autoatarraxamento no plástico.

O modelo utilizado está disponível em `/mec/modelagem 3d/testes`. O teste inclui furos com diâmetros entre 2,0 mm e 2,4 mm, além de alojamentos para porcas com dimensões entre 4,0 mm e 4,4 mm.

![Imagem do modelo em FreeCAD](mec/modelagem%203d/testes/TESTEfuros1.0.png)

Nos testes realizados, observou-se que o parafuso M2 não conseguiu ser inserido em furos de 2,2 mm produzidos pela impressora Ender-3 Pro. Em contrapartida, os furos de 2,3 mm e 2,4 mm permitiram o autoatarraxamento do parafuso, possibilitando a fixação adequada entre as duas placas. Também foi observado que alojamentos de 4,4 mm ainda não permitem o encaixe adequado da porca, sendo necessário testar dimensões a partir de 4,5 mm.

### Tabela 1 — Resultado dos testes de fixação com parafuso M2

| Elemento testado            | Dimensão nominal | Resultado observado     | Observação                                           |
| --------------------------- | ---------------: | ----------------------- | ---------------------------------------------------- |
| Furo passante/atarraxamento |           2,0 mm | Não compatível          | Parafuso não entra                                   |
| Furo passante/atarraxamento |           2,2 mm | Não compatível          | Parafuso não entra na peça impressa pela Ender-3 Pro |
| Furo passante/atarraxamento |           2,3 mm | Compatível              | Permite autoatarraxamento                            |
| Furo passante/atarraxamento |           2,4 mm | Compatível              | Permite autoatarraxamento com menor esforço          |
| Alojamento para porca M2    |           4,0 mm | Não compatível          | Espaço insuficiente para encaixe                     |
| Alojamento para porca M2    |           4,4 mm | Parcialmente compatível | Ainda não permite encaixe adequado                   |
| Alojamento para porca M2    |         ≥ 4,5 mm | Não testado             | Dimensão recomendada para testes futuros             |

**Legenda:** Resultados obtidos a partir de testes de fixação utilizando parafusos M2 em peças impressas em PLA na impressora Ender-3 Pro. Os ensaios avaliaram tanto o autoatarraxamento do parafuso em furos impressos quanto o encaixe de porcas sextavadas M2 em alojamentos dedicados.
