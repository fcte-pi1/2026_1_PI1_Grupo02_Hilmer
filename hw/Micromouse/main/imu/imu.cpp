// =============================================================================
//  imu.cpp — Implementação do Módulo de IMU (ESP32 + MPU-9250)
// =============================================================================
//
//  Este arquivo contém TODA a lógica interna do módulo de IMU:
//    - Inicialização e configuração do sensor
//    - Loop de leitura de dados
//    - Rotinas de calibração guiadas (giroscópio, acelerômetro, magnetômetro)
//    - Persistência de calibração via NVS (Preferences do ESP32)
//    - Interface de debug pelo monitor Serial
//
//  NÃO EDITAR ESTE ARQUIVO
//  Consulte imu.h para a interface pública e os comentários de uso.
//
//  DEPENDÊNCIAS
//  ------------
//  - Biblioteca MPU9250 (yelvlab/ESP32-Arduino-MPU9250)
//    Clone em: Arduino/libraries/ESP32-Arduino-MPU9250
//  - Wire.h (já inclusa no core ESP32)
//  - Preferences.h (já inclusa no core ESP32, para salvar na NVS)
//
//  SOBRE A NVS (Non-Volatile Storage)
//  ------------------------------------
//  O ESP32 tem uma área de flash dedicada para armazenar pares chave-valor
//  que sobrevivem a reinicializações. Usamos isso para guardar a calibração
//  do sensor. O namespace utilizado é "micromouse_imu".
//  
//
//  Adaptado por Vítor Gonçalves de Andrade - 261025182
//  Data: Abril/2026
// =============================================================================

#include "imu.h"
#include <Wire.h>
#include <MPU9250.h>
#include <Preferences.h>

// -----------------------------------------------------------------------------
//  ESTADO INTERNO DO MÓDULO
//  Essas variáveis são privadas — não acesse diretamente de fora deste arquivo.
// -----------------------------------------------------------------------------

// Objeto principal do sensor. Usa I2C com o endereço definido em imu.h.
static MPU9250 sensor(Wire, IMU_ENDERECO_I2C);

// Buffer com a última leitura válida dos sensores.
static DadosIMU dados_atuais = {};

// Valores de calibração atualmente aplicados ao sensor.
static CalibracaoIMU calibracao_atual = {};

// Handle para acessar a memória não-volátil (NVS) do ESP32.
static Preferences nvs;

// Flag interna para saber se o sensor foi inicializado com sucesso.
static bool sensor_pronto = false;

// -----------------------------------------------------------------------------
//  CHAVES USADAS NA NVS
//  Cada valor de calibração tem uma chave de texto curta (max 15 chars no ESP32).
// -----------------------------------------------------------------------------
static const char* NVS_NAMESPACE    = "micromouse_imu";
static const char* NVS_CALIBRADO    = "calibrado";
static const char* NVS_GYRO_BX     = "g_bx";
static const char* NVS_GYRO_BY     = "g_by";
static const char* NVS_GYRO_BZ     = "g_bz";
static const char* NVS_ACCEL_BX    = "a_bx";
static const char* NVS_ACCEL_BY    = "a_by";
static const char* NVS_ACCEL_BZ    = "a_bz";
static const char* NVS_ACCEL_EX    = "a_ex";
static const char* NVS_ACCEL_EY    = "a_ey";
static const char* NVS_ACCEL_EZ    = "a_ez";
static const char* NVS_MAG_BX      = "m_bx";
static const char* NVS_MAG_BY      = "m_by";
static const char* NVS_MAG_BZ      = "m_bz";
static const char* NVS_MAG_EX      = "m_ex";
static const char* NVS_MAG_EY      = "m_ey";
static const char* NVS_MAG_EZ      = "m_ez";

// =============================================================================
//  FUNÇÕES AUXILIARES PRIVADAS (não declaradas no .h)
// =============================================================================

/**
 * Salva todos os valores de calibração na NVS.
 * Chamada automaticamente após cada rotina de calibração bem-sucedida.
 */
static void salvar_calibracao_na_nvs() {
    nvs.begin(NVS_NAMESPACE, false);  // false = modo leitura/escrita

    nvs.putBool (NVS_CALIBRADO,  true);
    nvs.putFloat(NVS_GYRO_BX,    calibracao_atual.gyro_bias_x);
    nvs.putFloat(NVS_GYRO_BY,    calibracao_atual.gyro_bias_y);
    nvs.putFloat(NVS_GYRO_BZ,    calibracao_atual.gyro_bias_z);
    nvs.putFloat(NVS_ACCEL_BX,   calibracao_atual.accel_bias_x);
    nvs.putFloat(NVS_ACCEL_BY,   calibracao_atual.accel_bias_y);
    nvs.putFloat(NVS_ACCEL_BZ,   calibracao_atual.accel_bias_z);
    nvs.putFloat(NVS_ACCEL_EX,   calibracao_atual.accel_escala_x);
    nvs.putFloat(NVS_ACCEL_EY,   calibracao_atual.accel_escala_y);
    nvs.putFloat(NVS_ACCEL_EZ,   calibracao_atual.accel_escala_z);
    nvs.putFloat(NVS_MAG_BX,     calibracao_atual.mag_bias_x);
    nvs.putFloat(NVS_MAG_BY,     calibracao_atual.mag_bias_y);
    nvs.putFloat(NVS_MAG_BZ,     calibracao_atual.mag_bias_z);
    nvs.putFloat(NVS_MAG_EX,     calibracao_atual.mag_escala_x);
    nvs.putFloat(NVS_MAG_EY,     calibracao_atual.mag_escala_y);
    nvs.putFloat(NVS_MAG_EZ,     calibracao_atual.mag_escala_z);

    nvs.end();
    Serial.println("[IMU] Calibração salva na memória flash (NVS) com sucesso.");
}

/**
 * Carrega calibração da NVS e aplica ao sensor.
 * Retorna true se havia dados válidos salvos, false se não havia.
 */
static bool carregar_calibracao_da_nvs() {
    nvs.begin(NVS_NAMESPACE, true);  // true = modo somente leitura

    bool havia_calibracao = nvs.getBool(NVS_CALIBRADO, false);

    if (!havia_calibracao) {
        nvs.end();
        Serial.println("[IMU] Nenhuma calibração encontrada na memória.");
        return false;
    }

    // Lê todos os valores salvos
    calibracao_atual.calibrado      = true;
    calibracao_atual.gyro_bias_x    = nvs.getFloat(NVS_GYRO_BX,  0.0f);
    calibracao_atual.gyro_bias_y    = nvs.getFloat(NVS_GYRO_BY,  0.0f);
    calibracao_atual.gyro_bias_z    = nvs.getFloat(NVS_GYRO_BZ,  0.0f);
    calibracao_atual.accel_bias_x   = nvs.getFloat(NVS_ACCEL_BX, 0.0f);
    calibracao_atual.accel_bias_y   = nvs.getFloat(NVS_ACCEL_BY, 0.0f);
    calibracao_atual.accel_bias_z   = nvs.getFloat(NVS_ACCEL_BZ, 0.0f);
    calibracao_atual.accel_escala_x = nvs.getFloat(NVS_ACCEL_EX, 1.0f);
    calibracao_atual.accel_escala_y = nvs.getFloat(NVS_ACCEL_EY, 1.0f);
    calibracao_atual.accel_escala_z = nvs.getFloat(NVS_ACCEL_EZ, 1.0f);
    calibracao_atual.mag_bias_x     = nvs.getFloat(NVS_MAG_BX,   0.0f);
    calibracao_atual.mag_bias_y     = nvs.getFloat(NVS_MAG_BY,   0.0f);
    calibracao_atual.mag_bias_z     = nvs.getFloat(NVS_MAG_BZ,   0.0f);
    calibracao_atual.mag_escala_x   = nvs.getFloat(NVS_MAG_EX,   1.0f);
    calibracao_atual.mag_escala_y   = nvs.getFloat(NVS_MAG_EY,   1.0f);
    calibracao_atual.mag_escala_z   = nvs.getFloat(NVS_MAG_EZ,   1.0f);

    nvs.end();

    // Aplica os valores ao sensor (a biblioteca aceita setar manualmente)
    sensor.setGyroBiasX_rads(calibracao_atual.gyro_bias_x);
    sensor.setGyroBiasY_rads(calibracao_atual.gyro_bias_y);
    sensor.setGyroBiasZ_rads(calibracao_atual.gyro_bias_z);

    sensor.setAccelCalX(calibracao_atual.accel_bias_x, calibracao_atual.accel_escala_x);
    sensor.setAccelCalY(calibracao_atual.accel_bias_y, calibracao_atual.accel_escala_y);
    sensor.setAccelCalZ(calibracao_atual.accel_bias_z, calibracao_atual.accel_escala_z);

    sensor.setMagCalX(calibracao_atual.mag_bias_x, calibracao_atual.mag_escala_x);
    sensor.setMagCalY(calibracao_atual.mag_bias_y, calibracao_atual.mag_escala_y);
    sensor.setMagCalZ(calibracao_atual.mag_bias_z, calibracao_atual.mag_escala_z);

    Serial.println("[IMU] Calibração carregada da memória e aplicada ao sensor.");
    return true;
}

/**
 * Aguarda o usuário pressionar qualquer tecla no Serial.
 * Usada durante o processo interativo de calibração do acelerômetro.
 */
static void aguardar_enter() {
    Serial.println("       >>> Pressione qualquer tecla no Serial quando estiver pronto...");
    // Limpa qualquer dado residual no buffer antes de esperar
    while (Serial.available()) Serial.read();
    while (!Serial.available()) delay(50);
    while (Serial.available()) Serial.read();  // Descarta o caractere enviado
}

// =============================================================================
//  IMPLEMENTAÇÃO DAS FUNÇÕES PÚBLICAS
// =============================================================================

bool imu_init() {
    Serial.println("[IMU] Iniciando módulo IMU...");

    // Configura o barramento I2C com os pinos definidos em imu.h
    Wire.begin(IMU_PIN_SDA, IMU_PIN_SCL);
    Wire.setClock(400000);  // Modo "Fast I2C" — 400 kHz

    // Tenta inicializar o sensor (até 3 tentativas para ser tolerante a falhas)
    int status = -1;
    for (int tentativa = 1; tentativa <= 3; tentativa++) {
        status = sensor.begin();
        if (status > 0) break;
        Serial.printf("[IMU] Tentativa %d/3 falhou (status: %d). Aguardando...\n",
                      tentativa, status);
        delay(500);
    }

    if (status < 0) {
        Serial.println("[IMU] ERRO CRITICO: Sensor não respondeu após 3 tentativas.");
        Serial.println("[IMU] Verifique:");
        Serial.println("[IMU]   - Fiação SDA/SCL (pinos " + String(IMU_PIN_SDA) +
                       "/" + String(IMU_PIN_SCL) + ")");
        Serial.println("[IMU]   - Alimentação 3.3V no módulo MPU-9250");
        Serial.println("[IMU]   - Endereço I2C (AD0 em GND = 0x68, em VCC = 0x69)");
        sensor_pronto = false;
        return false;
    }

    // -------------------------------------------------------------------------
    //  Aplica configurações de faixa e filtros definidos no imu.h
    //  Valores padrão já são razoáveis, mas ajuste conforme necessário
    // -------------------------------------------------------------------------
    sensor.setAccelRange(IMU_FAIXA_ACCEL);
    sensor.setGyroRange(IMU_FAIXA_GYRO);
    sensor.setDlpfBandwidth(IMU_FILTRO_DLPF);
    sensor.setSrd(IMU_SRD);  // Define taxa de amostragem

    Serial.println("[IMU] Sensor configurado:");
    Serial.println("[IMU]   Acelerômetro : ±4g");
    Serial.println("[IMU]   Giroscópio   : ±500°/s");
    Serial.println("[IMU]   DLPF         : 41 Hz");
    Serial.println("[IMU]   Taxa         : 100 Hz (SRD=9)");

    // Tenta carregar calibração salva anteriormente
    bool tinha_calibracao = carregar_calibracao_da_nvs();
    if (!tinha_calibracao) {
        Serial.println("[IMU] Dica: envie 'G' para calibrar giroscópio,");
        Serial.println("[IMU]       'A' para acelerômetro, 'M' para magnetômetro.");
    }

    sensor_pronto = true;
    Serial.println("[IMU] Módulo pronto! ✓");
    return true;
}

// -----------------------------------------------------------------------------

bool imu_update() {
    if (!sensor_pronto) return false;

    int status = sensor.readSensor();
    if (status < 0) {
        // Erro esporádico de I2C é comum em ambientes com motores.
        // Não trave o sistema — apenas reporte e continue.
        Serial.println("[IMU] Aviso: falha de leitura (erro I2C transitório).");
        return false;
    }

    // Copia os dados lidos para o buffer interno, com unidades já convertidas.
    // A biblioteca já aplica calibração automaticamente se os biases foram setados.
    dados_atuais.accel_x     = sensor.getAccelX_mss();   // m/s²
    dados_atuais.accel_y     = sensor.getAccelY_mss();
    dados_atuais.accel_z     = sensor.getAccelZ_mss();

    dados_atuais.gyro_x      = sensor.getGyroX_rads();   // rad/s
    dados_atuais.gyro_y      = sensor.getGyroY_rads();
    dados_atuais.gyro_z      = sensor.getGyroZ_rads();

    dados_atuais.mag_x       = sensor.getMagX_uT();      // µT
    dados_atuais.mag_y       = sensor.getMagY_uT();
    dados_atuais.mag_z       = sensor.getMagZ_uT();

    dados_atuais.temperatura = sensor.getTemperature_C(); // °C
    dados_atuais.timestamp_ms = millis();

    return true;
}

// -----------------------------------------------------------------------------

DadosIMU imu_get_dados() {
    return dados_atuais;
}

// -----------------------------------------------------------------------------

CalibracaoIMU imu_get_calibracao() {
    return calibracao_atual;
}

// -----------------------------------------------------------------------------

bool imu_calibrar_gyro() {
    if (!sensor_pronto) {
        Serial.println("[IMU] Erro: sensor não inicializado.");
        return false;
    }

    Serial.println("");
    Serial.println("========================================");
    Serial.println("  CALIBRAÇÃO DO GIROSCÓPIO");
    Serial.println("========================================");
    Serial.println("  1. Coloque o robô completamente parado");
    Serial.println("     sobre uma superfície plana.");
    Serial.println("  2. NÃO toque, não bata e não mova nada");
    Serial.println("     durante a calibração.");
    Serial.println("  3. Durará alguns segundos.");
    Serial.println("========================================");
    aguardar_enter();

    Serial.println("[IMU] Coletando amostras do giroscópio... aguarde.");

    int status = sensor.calibrateGyro();

    if (status < 0) {
        Serial.println("[IMU] ERRO: Calibração do giroscópio falhou!");
        return false;
    }

    // Lê os biases calculados pela biblioteca e salva localmente
    calibracao_atual.gyro_bias_x = sensor.getGyroBiasX_rads();
    calibracao_atual.gyro_bias_y = sensor.getGyroBiasY_rads();
    calibracao_atual.gyro_bias_z = sensor.getGyroBiasZ_rads();
    calibracao_atual.calibrado   = true;

    Serial.println("[IMU] Giroscópio calibrado com sucesso!");
    Serial.printf ("[IMU]   Bias X: %.5f rad/s\n", calibracao_atual.gyro_bias_x);
    Serial.printf ("[IMU]   Bias Y: %.5f rad/s\n", calibracao_atual.gyro_bias_y);
    Serial.printf ("[IMU]   Bias Z: %.5f rad/s\n", calibracao_atual.gyro_bias_z);

    salvar_calibracao_na_nvs();
    return true;
}

// -----------------------------------------------------------------------------

bool imu_calibrar_accel() {
    if (!sensor_pronto) {
        Serial.println("[IMU] Erro: sensor não inicializado.");
        return false;
    }

    Serial.println("");
    Serial.println("========================================");
    Serial.println("  CALIBRAÇÃO DO ACELERÔMETRO");
    Serial.println("========================================");
    Serial.println("  Você vai posicionar o robô em 6 orien-");
    Serial.println("  tações diferentes (uma por vez), com  ");
    Serial.println("  cada face apontando para baixo.       ");
    Serial.println("  Entre cada posição, pressione uma tecla.");
    Serial.println("========================================");
    Serial.println("");

    // Estrutura da calibração de 6 posições:
    // Cada "posição" coloca um eixo diferente alinhado com a gravidade.
    // A biblioteca calcula bias e escala a partir das 6 medições.

    const char* instrucoes[] = {
        "Face 1/6: Lado SUPERIOR para CIMA (posição normal de operacao)",
        "Face 2/6: Lado INFERIOR para CIMA (robô de cabeca para baixo)",
        "Face 3/6: Lado FRONTAL para CIMA  (robô inclinado p/ frente)",
        "Face 4/6: Lado TRASEIRO para CIMA (robô inclinado p/ trás)",
        "Face 5/6: Lado ESQUERDO para CIMA (robô tombado p/ direita)",
        "Face 6/6: Lado DIREITO para CIMA  (robô tombado p/ esquerda)"
    };

    for (int i = 0; i < 6; i++) {
        Serial.println("[IMU] " + String(instrucoes[i]));
        aguardar_enter();
        Serial.println("[IMU] Coletando amostras... mantenha firme!");

        int status = sensor.calibrateAccel();

        if (status < 0) {
            Serial.printf("[IMU] ERRO na posição %d/6. Tente novamente.\n", i + 1);
            return false;
        }

        Serial.printf("[IMU] Posição %d/6 registrada ✓\n", i + 1);
    }

    // Lê os valores calculados pela biblioteca após as 6 posições
    calibracao_atual.accel_bias_x   = sensor.getAccelBiasX_mss();
    calibracao_atual.accel_bias_y   = sensor.getAccelBiasY_mss();
    calibracao_atual.accel_bias_z   = sensor.getAccelBiasZ_mss();
    calibracao_atual.accel_escala_x = sensor.getAccelScaleFactorX();
    calibracao_atual.accel_escala_y = sensor.getAccelScaleFactorY();
    calibracao_atual.accel_escala_z = sensor.getAccelScaleFactorZ();
    calibracao_atual.calibrado      = true;

    Serial.println("[IMU] Acelerômetro calibrado com sucesso!");
    Serial.printf ("[IMU]   Bias  (X,Y,Z): %.4f | %.4f | %.4f m/s²\n",
                   calibracao_atual.accel_bias_x,
                   calibracao_atual.accel_bias_y,
                   calibracao_atual.accel_bias_z);
    Serial.printf ("[IMU]   Escala(X,Y,Z): %.4f | %.4f | %.4f\n",
                   calibracao_atual.accel_escala_x,
                   calibracao_atual.accel_escala_y,
                   calibracao_atual.accel_escala_z);

    salvar_calibracao_na_nvs();
    return true;
}

// -----------------------------------------------------------------------------

bool imu_calibrar_mag() {
    if (!sensor_pronto) {
        Serial.println("[IMU] Erro: sensor não inicializado.");
        return false;
    }

    Serial.println("");
    Serial.println("========================================");
    Serial.println("  CALIBRAÇÃO DO MAGNETÔMETRO");
    Serial.println("========================================");
    Serial.println("  Durante a calibração (~15 segundos),  ");
    Serial.println("  mova o robô LENTAMENTE em 'figura 8'  ");
    Serial.println("  para cobrir todas as orientações.     ");
    Serial.println("  ATENÇÃO: Afaste motores e eletrônicos ");
    Serial.println("  que possam criar campos magnéticos!   ");
    Serial.println("========================================");
    aguardar_enter();

    Serial.println("[IMU] Iniciando coleta do magnetômetro...");
    Serial.println("[IMU] MOVA O ROBÔ EM FIGURA 8 AGORA!");

    int status = sensor.calibrateMag();

    if (status < 0) {
        Serial.println("[IMU] ERRO: Calibração do magnetômetro falhou!");
        return false;
    }

    // Lê os resultados calculados pela biblioteca
    calibracao_atual.mag_bias_x   = sensor.getMagBiasX_uT();
    calibracao_atual.mag_bias_y   = sensor.getMagBiasY_uT();
    calibracao_atual.mag_bias_z   = sensor.getMagBiasZ_uT();
    calibracao_atual.mag_escala_x = sensor.getMagScaleFactorX();
    calibracao_atual.mag_escala_y = sensor.getMagScaleFactorY();
    calibracao_atual.mag_escala_z = sensor.getMagScaleFactorZ();
    calibracao_atual.calibrado    = true;

    Serial.println("[IMU] Magnetômetro calibrado com sucesso!");
    Serial.printf ("[IMU]   Bias  (X,Y,Z): %.2f | %.2f | %.2f µT\n",
                   calibracao_atual.mag_bias_x,
                   calibracao_atual.mag_bias_y,
                   calibracao_atual.mag_bias_z);
    Serial.printf ("[IMU]   Escala(X,Y,Z): %.4f | %.4f | %.4f\n",
                   calibracao_atual.mag_escala_x,
                   calibracao_atual.mag_escala_y,
                   calibracao_atual.mag_escala_z);

    salvar_calibracao_na_nvs();
    return true;
}

// -----------------------------------------------------------------------------

void imu_resetar_calibracao() {
    Serial.println("[IMU] Resetando calibração...");

    nvs.begin(NVS_NAMESPACE, false);
    nvs.clear();  // Apaga todas as chaves do namespace
    nvs.end();

    // Volta para valores neutros (sem correção aplicada)
    calibracao_atual = {};
    calibracao_atual.accel_escala_x = 1.0f;
    calibracao_atual.accel_escala_y = 1.0f;
    calibracao_atual.accel_escala_z = 1.0f;
    calibracao_atual.mag_escala_x   = 1.0f;
    calibracao_atual.mag_escala_y   = 1.0f;
    calibracao_atual.mag_escala_z   = 1.0f;

    // Remove as correções do sensor
    sensor.setGyroBiasX_rads(0.0f);
    sensor.setGyroBiasY_rads(0.0f);
    sensor.setGyroBiasZ_rads(0.0f);
    sensor.setAccelCalX(0.0f, 1.0f);
    sensor.setAccelCalY(0.0f, 1.0f);
    sensor.setAccelCalZ(0.0f, 1.0f);
    sensor.setMagCalX(0.0f, 1.0f);
    sensor.setMagCalY(0.0f, 1.0f);
    sensor.setMagCalZ(0.0f, 1.0f);

    Serial.println("[IMU] Calibração resetada. Recalibre os sensores.");
}

// -----------------------------------------------------------------------------

void imu_imprimir_dados() {
    // Formata e imprime uma linha legível com todos os dados atuais.
    // Formato amigável para copiar para planilha ou para plotar com Serial Plotter.
    Serial.println("------- Leitura IMU -------");
    Serial.printf("  t=%lums\n", dados_atuais.timestamp_ms);
    Serial.printf("  Accel (m/s²) : X=%7.3f  Y=%7.3f  Z=%7.3f\n",
                  dados_atuais.accel_x, dados_atuais.accel_y, dados_atuais.accel_z);
    Serial.printf("  Gyro  (rad/s): X=%7.4f  Y=%7.4f  Z=%7.4f\n",
                  dados_atuais.gyro_x,  dados_atuais.gyro_y,  dados_atuais.gyro_z);
    Serial.printf("  Mag   (µT)   : X=%7.2f  Y=%7.2f  Z=%7.2f\n",
                  dados_atuais.mag_x,   dados_atuais.mag_y,   dados_atuais.mag_z);
    Serial.printf("  Temp  (°C)   : %.1f\n", dados_atuais.temperatura);
    Serial.println("---------------------------");
}

// -----------------------------------------------------------------------------

void imu_processar_serial() {
    // Verifica se há algum byte disponível na Serial sem bloquear o loop.
    if (!Serial.available()) return;

    char cmd = (char)Serial.read();

    switch (cmd) {
        case 'G':
        case 'g':
            imu_calibrar_gyro();
            break;

        case 'A':
        case 'a':
            imu_calibrar_accel();
            break;

        case 'M':
        case 'm':
            imu_calibrar_mag();
            break;

        case 'P':
        case 'p':
            // Imprime os dados atuais uma vez
            imu_imprimir_dados();
            break;

        case 'R':
        case 'r':
            imu_resetar_calibracao();
            break;

        case '?':
        case 'H':
        case 'h':
            // Menu de ajuda rápida
            Serial.println("=== IMU - Comandos disponíveis ===");
            Serial.println("  G → Calibrar giroscópio");
            Serial.println("  A → Calibrar acelerômetro (6 posições)");
            Serial.println("  M → Calibrar magnetômetro (figura 8)");
            Serial.println("  P → Imprimir dados atuais uma vez");
            Serial.println("  R → Resetar calibração salva");
            Serial.println("  H → Este menu de ajuda");
            Serial.println("==================================");
            break;

        default:
            // Ignora caracteres desconhecidos (ex: '\n', '\r' do terminal)
            break;
    }
}
