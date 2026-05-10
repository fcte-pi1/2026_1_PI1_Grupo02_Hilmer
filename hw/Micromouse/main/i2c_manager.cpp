#include "i2c_manager.hpp"
#include "pins.hpp"
#include "driver/i2c_master.h"

static i2c_master_bus_handle_t g_bus = nullptr;

bool i2c_manager_init() {
    if (g_bus) return true;

    i2c_master_bus_config_t bus_cfg = {};
    bus_cfg.i2c_port = I2C_NUM_0;
    bus_cfg.sda_io_num = (gpio_num_t)I2C_SDA_PIN;
    bus_cfg.scl_io_num = (gpio_num_t)I2C_SCL_PIN;
    bus_cfg.clk_source = I2C_CLK_SRC_DEFAULT;
    bus_cfg.glitch_ignore_cnt = 7;
    bus_cfg.flags.enable_internal_pullup = true;

    esp_err_t err = i2c_new_master_bus(&bus_cfg, &g_bus);
    return err == ESP_OK && g_bus != nullptr;
}

i2c_master_bus_handle_t i2c_manager_get_bus() {
    return g_bus;
}
