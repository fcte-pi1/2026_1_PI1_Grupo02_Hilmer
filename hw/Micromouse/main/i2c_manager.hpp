#pragma once

#include "driver/i2c_types.h"

// Inicializa o barramento I2C compartilhado.
bool i2c_manager_init();

// Retorna o handle do barramento I2C.
i2c_master_bus_handle_t i2c_manager_get_bus();
