#pragma once

#include <array>
#include <cstdint>

class Labirinto {
public:
    static constexpr uint8_t kMaxSize = 16;
    static constexpr uint8_t kTamanhoMeta = 2;
    static constexpr uint16_t kDistanciaInfinita = 0xFFFF;
    static constexpr uint16_t kMaxCaminho = static_cast<uint16_t>(kMaxSize) * kMaxSize;

    enum class Tamanho : uint8_t {
        k4x4 = 4,
        k8x8 = 8,
        k16x16 = 16,
    };

    enum class StatusCelula : uint8_t {
        Desconhecida = 0,
        Livre,
        Visitada,
    };

    struct Celula {
        uint8_t walls;     // Bitmask de paredes (N=1, S=2, E=4, W=8)
        StatusCelula status;
        uint16_t distancia;
    };

    struct Coordenada {
        uint8_t x;
        uint8_t y;
    };

    enum Parede : uint8_t {
        ParedeNorte = 1 << 0,
        ParedeSul   = 1 << 1,
        ParedeLeste = 1 << 2,
        ParedeOeste = 1 << 3,
    };

    Labirinto();

    void configurar(Tamanho tamanho);
    uint8_t tamanho() const;

    bool dentroDosLimites(uint8_t x, uint8_t y) const;

    const Celula &celula(uint8_t x, uint8_t y) const;
    Celula &celula(uint8_t x, uint8_t y);

    void resetar();

    void atualizarCelula(uint8_t x, uint8_t y, uint8_t paredes);

    bool encontrarProximaFronteira(Coordenada *saida) const;

    // Meta 2x2: (x, y) é o canto inferior-esquerdo. Retorna false se a região
    // 2x2 não caber sem encostar nos limites do labirinto.
    bool definirChegada(uint8_t x, uint8_t y);
    bool chegadaDefinida() const;
    Coordenada posicaoChegada() const;
    bool estaNaChegada(uint8_t x, uint8_t y) const;

    // Preenche o campo distancia de cada célula com a distância (em células)
    // até a chegada, respeitando paredes. Requer chegadaDefinida() == true.
    void executarFloodFill();

    // Preenche buffer com o caminho de menor custo da célula inicial até
    // uma célula da meta, seguindo o gradiente do flood fill. tamanho recebe
    // a quantidade de coordenadas escritas. Retorna false se não houver
    // caminho ou se o buffer for pequeno demais.
    bool melhorCaminho(Coordenada inicio,
                       Coordenada *buffer,
                       uint16_t capacidade,
                       uint16_t *tamanho) const;

private:
    uint8_t tamanho_;
    std::array<std::array<Celula, kMaxSize>, kMaxSize> grade_;
    Coordenada chegada_;
    bool chegada_definida_;

    void definirParede(uint8_t x, uint8_t y, Parede parede);
    bool temParede(uint8_t x, uint8_t y, Parede parede) const;
};
