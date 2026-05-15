#include "i2c_manager.hpp"
#include "driver/i2c_master.h"

static i2c_master_bus_handle_t g_bus = nullptr;
// Cache de handles por endereco I2C (0x00-0x7F).
static i2c_master_dev_handle_t g_devices[128] = {};

// Verifica se o endereco esta no range valido do I2C (7 bits).
static bool i2c_manager_valid_address(uint8_t address) {
    return address > 0 && address < 0x80;
}

// Cria o barramento I2C uma unica vez e reutiliza nas chamadas seguintes.
bool i2c_manager_init() {
    if (g_bus) return true;

    i2c_master_bus_config_t bus_cfg = {};
    bus_cfg.i2c_port = I2C_NUM_0;
    bus_cfg.sda_io_num = I2C_MANAGER_SDA_PIN;
    bus_cfg.scl_io_num = I2C_MANAGER_SCL_PIN;
    bus_cfg.clk_source = I2C_CLK_SRC_DEFAULT;
    bus_cfg.glitch_ignore_cnt = 7;
    bus_cfg.flags.enable_internal_pullup = true;

    esp_err_t err = i2c_new_master_bus(&bus_cfg, &g_bus);
    return err == ESP_OK && g_bus != nullptr;
}

i2c_master_bus_handle_t i2c_manager_get_bus() {
    return g_bus;
}

// Adiciona um dispositivo ao barramento e guarda o handle.
bool i2c_manager_register_device(uint8_t address, uint32_t speed_hz,
                                 i2c_master_dev_handle_t *out_handle) {
    if (!i2c_manager_valid_address(address)) return false;
    if (!i2c_manager_init()) return false;

    if (g_devices[address]) {
        if (out_handle) *out_handle = g_devices[address];
        return true;
    }

    i2c_device_config_t dev_cfg = {};
    dev_cfg.dev_addr_length = I2C_ADDR_BIT_LEN_7;
    dev_cfg.device_address = address;
    dev_cfg.scl_speed_hz = speed_hz ? speed_hz : I2C_MANAGER_DEFAULT_SPEED_HZ;

    esp_err_t err = i2c_master_bus_add_device(g_bus, &dev_cfg, &g_devices[address]);
    if (err != ESP_OK) return false;

    if (out_handle) *out_handle = g_devices[address];
    return true;
}

// Registra os dispositivos padrao do projeto.
bool i2c_manager_register_default_devices() {
    bool ok = true;
    ok &= i2c_manager_register_device(I2C_ADDR_MPU9250_PRIMARY);
    ok &= i2c_manager_register_device(I2C_ADDR_INA226_DEFAULT);
    ok &= i2c_manager_register_device(I2C_ADDR_VL53L0X_DEFAULT);
    return ok;
}

i2c_master_dev_handle_t i2c_manager_get_device_handle(uint8_t address) {
    if (!i2c_manager_valid_address(address)) return nullptr;
    return g_devices[address];
}

// Checa se o dispositivo responde no endereco informado.
bool i2c_manager_probe(uint8_t address, int timeout_ms) {
    if (!i2c_manager_valid_address(address)) return false;
    if (!i2c_manager_init()) return false;
    return i2c_master_probe(g_bus, address, timeout_ms) == ESP_OK;
}

// Escreve um buffer inteiro no dispositivo registrado.
bool i2c_manager_write(uint8_t address, const uint8_t *data, size_t len,
                       int timeout_ms) {
    auto handle = i2c_manager_get_device_handle(address);
    if (!handle) return false;
    return i2c_master_transmit(handle, data, len, timeout_ms) == ESP_OK;
}

// Le um buffer inteiro do dispositivo registrado.
bool i2c_manager_read(uint8_t address, uint8_t *data, size_t len,
                      int timeout_ms) {
    auto handle = i2c_manager_get_device_handle(address);
    if (!handle) return false;
    return i2c_master_receive(handle, data, len, timeout_ms) == ESP_OK;
}

// Faz write+read no mesmo dispositivo (usado para leitura de registros).
bool i2c_manager_write_read(uint8_t address, const uint8_t *write_data,
                            size_t write_len, uint8_t *read_data,
                            size_t read_len, int timeout_ms) {
    auto handle = i2c_manager_get_device_handle(address);
    if (!handle) return false;
    return i2c_master_transmit_receive(handle, write_data, write_len,
                                       read_data, read_len, timeout_ms) == ESP_OK;
}

// Le um ou mais bytes a partir de um registro.
bool i2c_manager_read_register(uint8_t address, uint8_t reg,
                               uint8_t *data, size_t len,
                               int timeout_ms) {
    return i2c_manager_write_read(address, &reg, 1, data, len, timeout_ms);
}