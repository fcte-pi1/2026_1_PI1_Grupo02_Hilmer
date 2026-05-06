#pragma once

#include "esp_err.h"
#include "esp_vfs_dev.h"

#ifdef __cplusplus
extern "C" {
#endif

// Compatibility stubs for ESP-IDF versions without USB CDC ACM VFS support.
static inline esp_err_t esp_vfs_dev_cdcacm_register(void) { return ESP_ERR_NOT_SUPPORTED; }
static inline esp_err_t esp_vfs_dev_cdcacm_set_rx_line_endings(esp_line_endings_t mode) {
  (void)mode;
  return ESP_ERR_NOT_SUPPORTED;
}
static inline esp_err_t esp_vfs_dev_cdcacm_set_tx_line_endings(esp_line_endings_t mode) {
  (void)mode;
  return ESP_ERR_NOT_SUPPORTED;
}

#ifdef __cplusplus
}
#endif
