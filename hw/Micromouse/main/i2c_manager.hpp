#pragma once

#include <cstddef>
#include <cstdint>

#include "driver/gpio.h"
#include "driver/i2c_types.h"
#include "pins.hpp"

// Pinos do barramento I2C compartilhado.
static constexpr gpio_num_t I2C_MANAGER_SDA_PIN = (gpio_num_t)I2C_SDA_PIN;
static constexpr gpio_num_t I2C_MANAGER_SCL_PIN = (gpio_num_t)I2C_SCL_PIN;

// Enderecos I2C de 7 bits usados pelos sensores do Micromouse.
static constexpr uint8_t I2C_ADDR_MPU9250_PRIMARY = 0x68; // AD0 em GND (padrao)
static constexpr uint8_t I2C_ADDR_MPU9250_ALT     = 0x69; // AD0 em VCC

static constexpr uint8_t I2C_ADDR_INA226_DEFAULT  = 0x40; // A0/A1 = GND (datasheet)
static constexpr uint8_t I2C_ADDR_INA226_MAX      = 0x4F; // Faixa valida 0x40-0x4F (datasheet)

static constexpr uint8_t I2C_ADDR_VL53L0X_DEFAULT = 0x29; // Datasheet: 0x52 (8-bit) -> 0x29 (7-bit)
static constexpr uint8_t I2C_ADDR_VL53L0X_ALT_0   = 0x2A;
static constexpr uint8_t I2C_ADDR_VL53L0X_ALT_1   = 0x2B;
static constexpr uint8_t I2C_ADDR_VL53L0X_ALT_2   = 0x2C;
static constexpr uint8_t I2C_ADDR_VL53L0X_ALT_3   = 0x2D;
static constexpr uint8_t I2C_ADDR_VL53L0X_ALT_4   = 0x2E;
static constexpr uint8_t I2C_ADDR_VL53L0X_ALT_5   = 0x2F;

// Velocidade padrao do barramento (Fast-mode 400 kHz).
static constexpr uint32_t I2C_MANAGER_DEFAULT_SPEED_HZ = 400000;

// Inicializa o barramento I2C compartilhado (idempotente).
bool i2c_manager_init();

// Retorna o handle do barramento I2C compartilhado.
i2c_master_bus_handle_t i2c_manager_get_bus();

// Registra um dispositivo no barramento e guarda o handle por endereco.
bool i2c_manager_register_device(uint8_t address,
								 uint32_t speed_hz = I2C_MANAGER_DEFAULT_SPEED_HZ,
								 i2c_master_dev_handle_t *out_handle = nullptr);

// Registra os dispositivos padrao (MPU9250, INA226, VL53L0X).
bool i2c_manager_register_default_devices();

// Retorna o handle associado ao endereco (ou nullptr se nao registrado).
i2c_master_dev_handle_t i2c_manager_get_device_handle(uint8_t address);

// Probe simples para verificar presenca do dispositivo no barramento.
bool i2c_manager_probe(uint8_t address, int timeout_ms = 50);

// Wrappers genericos de leitura/escrita para dispositivos registrados.
bool i2c_manager_write(uint8_t address, const uint8_t *data, size_t len,
					   int timeout_ms = 50);
bool i2c_manager_read(uint8_t address, uint8_t *data, size_t len,
					  int timeout_ms = 50);
bool i2c_manager_write_read(uint8_t address, const uint8_t *write_data,
							size_t write_len, uint8_t *read_data,
							size_t read_len, int timeout_ms = 50);
bool i2c_manager_read_register(uint8_t address, uint8_t reg,
							   uint8_t *data, size_t len,
							   int timeout_ms = 50);