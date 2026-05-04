#  Estimativa de Consumo Energético

## Consumo nominal por componente

Valores baseados em datasheets (quando disponíveis) ou estimativas realistas de operação.

| Componente                | Qtde | Corrente Unitária (mA) | Total (mA) | Fonte / Observação |
|---------------------------|------|------------------------|------------|---------------------|
| ESP32                     | 1    | 200                    | 200        | Wi-Fi ativo típico |
| VL53L0X                   | 6    | 20                     | 120        | Datasheet (~19mA típico) |
| Motor N20 (6V)            | 2    | 400                    | 800        | Operação com carga |
| Driver (DRV8833/TB6612)   | 1    | 30                     | 30         | Consumo interno |
| MPU6050                   | 1    | 4                      | 4          | Datasheet típico |
| SD Reader                 | 1    | 80                     | 80         | Escrita moderada |
| Regulador (MP1584EN)      | 1    | —                      | 100        | Perdas (~10%) |
| Outros (LEDs, perdas)     | —    | —                      | 100        | Margem técnica |

---

## Soma inicial

Corrente total nominal:

I_total = 200 + 120 + 800 + 30 + 4 + 80 + 100 + 100  
I_total ≈ 1434 mA ≈ 1.43 A

---

## Aplicação da margem de segurança

Considerando margem de 40% (variações operacionais e incertezas)

I_projeto = 1.43 A × 1.4  
I_projeto ≈ 2.00 A

---

##  Ajuste para uso real

Considerando fator de utilização de 70% (nem todos os componentes operam continuamente no máximo)

I_real = 2.00 A × 0.7  
I_real ≈ 1.40 A

---

## Cálculo da capacidade da bateria

### Para 2 horas de autonomia

Capacidade = 1.40 A × 2 h  
Capacidade ≈ 2.8 Ah ≈ 2800 mAh

---

### Para 3 horas de autonomia

Capacidade = 1.40 A × 3 h  
Capacidade ≈ 4.2 Ah ≈ 4200 mAh

---

## Resultado final

| Autonomia | Capacidade recomendada |
|-----------|------------------------|
| 2 horas   | 2500 – 3000 mAh        |
| 3 horas   | 4000 – 4500 mAh        |

---

# Observação importante

A corrente dos motores foi considerada em regime nominal de operação e não em condição de stall, evitando superdimensionamento do sistema de energia.